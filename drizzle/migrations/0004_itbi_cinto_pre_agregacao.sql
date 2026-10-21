CREATE TABLE public.itbi_cinto (
 bairro text NOT NULL,
 tipologia text NOT NULL,
 piso numeric NOT NULL CHECK (piso > 0),
 teto numeric NOT NULL CHECK (teto > piso),
 janela text NOT NULL CHECK (janela IN ('3 anos','5 anos')),
 escrituras bigint NOT NULL CHECK (escrituras >= 30),
 calibrado_em timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (bairro,tipologia)
);
GRANT SELECT ON public.itbi_cinto TO authenticated;
GRANT ALL ON public.itbi_cinto TO service_role;
ALTER TABLE public.itbi_cinto ENABLE ROW LEVEL SECURITY;
CREATE POLICY cinto_leitura_autenticada ON public.itbi_cinto FOR SELECT TO authenticated USING (true);
COMMENT ON TABLE public.itbi_cinto IS 'Limites em preços corrigidos ao trimestre mais recente do índice. CIDADE|* contém a faixa de fallback. Carga explícita após aceite.';
CREATE OR REPLACE FUNCTION public.itbi_normalizar_bairro_cinto(p_bairro text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT trim(regexp_replace(translate(upper(coalesce(p_bairro,'')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '\s+', ' ', 'g'));
$$;
CREATE OR REPLACE FUNCTION public.itbi_aplicar_cinto(p_inicio date,p_fim date,p_bairro text DEFAULT NULL,p_aplicar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='600s' AS $$
DECLARE v_resultado jsonb; v_sem_indice bigint; v_alteradas bigint := 0;
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'::public.app_role)) THEN
  RAISE EXCEPTION 'itbi_aplicar_cinto: apenas service_role ou admin';
 END IF;
 IF p_inicio IS NULL OR p_fim IS NULL OR p_fim < p_inicio OR p_aplicar IS NULL THEN RAISE EXCEPTION 'itbi_aplicar_cinto: parâmetros inválidos'; END IF;
 LOCK TABLE public.itbi_cinto IN SHARE MODE;
 IF NOT EXISTS (SELECT 1 FROM public.itbi_cinto WHERE bairro='CIDADE' AND tipologia='*') THEN RAISE EXCEPTION 'itbi_aplicar_cinto: carregue o cinto aprovado e a faixa da cidade antes de consolidar'; END IF;
 SELECT count(*) INTO v_sem_indice FROM public.itbi_escrituras e
 LEFT JOIN public.itbi_price_index i ON i.trimestre=date_trunc('quarter',e.data_transacao)::date
 WHERE (e.aceita OR e.motivo_rejeicao='fora_do_cinto') AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.uso IN ('Residencial','Comercial')
 AND e.data_transacao BETWEEN p_inicio AND p_fim AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro))
 AND (i.ln_mediana IS NULL OR e.valor_m2 IS NULL OR e.valor_m2<=0);
 IF v_sem_indice>0 THEN RAISE EXCEPTION 'itbi_aplicar_cinto: % escrituras sem índice ou preço válido; nenhuma marcação aplicada',v_sem_indice; END IF;
 CREATE TEMP TABLE IF NOT EXISTS tmp_itbi_cinto_decisao (id text PRIMARY KEY,bairro text,fora boolean,ja_rejeitada boolean) ON COMMIT DROP;
 DELETE FROM tmp_itbi_cinto_decisao;
 INSERT INTO tmp_itbi_cinto_decisao
 SELECT e.id,public.itbi_normalizar_bairro_cinto(e.bairro),
 NOT (e.valor_m2*exp(r.ln_mediana-i.ln_mediana) BETWEEN coalesce(c.piso,d.piso) AND coalesce(c.teto,d.teto)),NOT e.aceita
 FROM public.itbi_escrituras e
 JOIN public.itbi_price_index i ON i.trimestre=date_trunc('quarter',e.data_transacao)::date
 CROSS JOIN (SELECT ln_mediana FROM public.itbi_price_index ORDER BY trimestre DESC LIMIT 1) r
 JOIN public.itbi_cinto d ON d.bairro='CIDADE' AND d.tipologia='*'
 LEFT JOIN public.itbi_cinto c ON c.bairro=public.itbi_normalizar_bairro_cinto(e.bairro) AND c.tipologia=e.tipologia
 WHERE (e.aceita OR e.motivo_rejeicao='fora_do_cinto') AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.uso IN ('Residencial','Comercial')
 AND e.data_transacao BETWEEN p_inicio AND p_fim AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro));
 SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.bairro),'[]'::jsonb) INTO v_resultado FROM (
 SELECT bairro,count(*) AS avaliadas,count(*) FILTER (WHERE fora) AS fora_do_cinto,count(*) FILTER (WHERE fora AND NOT ja_rejeitada) AS novas_rejeicoes,count(*) FILTER (WHERE NOT fora AND ja_rejeitada) AS reaceitas FROM tmp_itbi_cinto_decisao GROUP BY bairro) a;
 IF p_aplicar THEN
 UPDATE public.itbi_escrituras e SET aceita=NOT d.fora,motivo_rejeicao=CASE WHEN d.fora THEN 'fora_do_cinto' ELSE NULL END
 FROM tmp_itbi_cinto_decisao d WHERE e.id=d.id AND (e.aceita IS DISTINCT FROM NOT d.fora OR e.motivo_rejeicao IS DISTINCT FROM CASE WHEN d.fora THEN 'fora_do_cinto' ELSE NULL END);
 GET DIAGNOSTICS v_alteradas=ROW_COUNT;
 END IF;
 RETURN jsonb_build_object('aplicado',p_aplicar,'alteradas',v_alteradas,'por_bairro',v_resultado);
END;
$$;
REVOKE ALL ON FUNCTION public.itbi_aplicar_cinto(date,date,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itbi_aplicar_cinto(date,date,text,boolean) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.itbi_consolidar_smf(p_inicio date,p_fim date,p_bairro text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='600s' AS $$
DECLARE v_escrituras bigint; v_removidas bigint; v_inseridas bigint; v_index_ok boolean:=true; v_index_erro text; v_cinto jsonb;
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'::public.app_role)) THEN RAISE EXCEPTION 'itbi_consolidar_smf: apenas service_role ou admin'; END IF;
 IF p_inicio IS NULL OR p_fim IS NULL OR p_fim<p_inicio THEN RAISE EXCEPTION 'itbi_consolidar_smf: período inválido'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.itbi_escrituras e WHERE (e.aceita OR e.motivo_rejeicao='fora_do_cinto') AND e.uso IN ('Residencial','Comercial') AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.data_transacao BETWEEN p_inicio AND p_fim AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro))) THEN RAISE EXCEPTION 'itbi_consolidar_smf: nenhuma escritura elegível no período'; END IF;
 v_cinto := public.itbi_aplicar_cinto(p_inicio,p_fim,p_bairro,true);
 SELECT count(*) INTO v_escrituras FROM public.itbi_escrituras e WHERE e.aceita AND e.uso IN ('Residencial','Comercial') AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.data_transacao BETWEEN p_inicio AND p_fim AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro));
 DROP TABLE IF EXISTS tmp_itbi_memoria;
 CREATE TEMP TABLE tmp_itbi_memoria ON COMMIT DROP AS SELECT DISTINCT ON (t.logradouro,t.bairro) t.logradouro,t.bairro,t.microbairro,t.lat,t.lng,t.geom,t.geocodificado_via FROM public.itbi_transactions t WHERE (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(t.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro)) ORDER BY t.logradouro,t.bairro,(t.microbairro IS NOT NULL) DESC,(t.geom IS NOT NULL) DESC,t.updated_at DESC NULLS LAST;
 DELETE FROM public.itbi_transactions t WHERE t.data_transacao BETWEEN p_inicio AND p_fim AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(t.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro));
 GET DIAGNOSTICS v_removidas=ROW_COUNT;
 INSERT INTO public.itbi_transactions (logradouro,numero,complemento,bairro,valor_transacao,area_m2,data_transacao,uso,tipologia,total_transacoes,percentual_transferido,microbairro,lat,lng,geom,geocodificado_via,fonte)
 SELECT a.logradouro,NULL,NULL,a.bairro,a.valor_transacao,a.area_m2,a.data_transacao,a.uso,a.tipologia,a.total_transacoes,100,m.microbairro,coalesce(m.lat,ST_Y(a.geom)),coalesce(m.lng,ST_X(a.geom)),coalesce(m.geom,a.geom),CASE WHEN m.geom IS NOT NULL THEN m.geocodificado_via WHEN a.geom IS NOT NULL THEN 'smf_numero_porta' END,'smf'
 FROM (SELECT e.logradouro,e.bairro,e.data_transacao,e.uso::public.uso_imovel AS uso,e.tipologia,round(avg(e.valor_transacao),2) AS valor_transacao,round(avg(e.area_m2),2) AS area_m2,count(*)::integer AS total_transacoes,ST_Centroid(ST_Collect(e.geom)) AS geom FROM public.itbi_escrituras e WHERE e.aceita AND e.uso IN ('Residencial','Comercial') AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.data_transacao BETWEEN p_inicio AND p_fim AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro)=public.itbi_normalizar_bairro_cinto(p_bairro)) GROUP BY e.logradouro,e.bairro,e.data_transacao,e.uso,e.tipologia) a LEFT JOIN tmp_itbi_memoria m ON m.logradouro=a.logradouro AND m.bairro IS NOT DISTINCT FROM a.bairro;
 GET DIAGNOSTICS v_inseridas=ROW_COUNT;
 BEGIN PERFORM public.refresh_itbi_price_index(); EXCEPTION WHEN OTHERS THEN v_index_ok:=false;v_index_erro:=SQLERRM; END;
 RETURN jsonb_build_object('periodo_inicio',p_inicio,'periodo_fim',p_fim,'bairro',p_bairro,'escrituras_consideradas',v_escrituras,'linhas_removidas',v_removidas,'linhas_inseridas',v_inseridas,'price_index_atualizado',v_index_ok,'price_index_erro',v_index_erro,'cinto',v_cinto);
END;
$$;
REVOKE ALL ON FUNCTION public.itbi_consolidar_smf(date,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itbi_consolidar_smf(date,date,text) TO authenticated,service_role;