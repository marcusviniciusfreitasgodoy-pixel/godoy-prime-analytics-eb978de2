-- Ajuste da consolidação SMF (20261021120000): só Apartamento, Casa e Comercial
-- entram em itbi_transactions.
--
-- A camada 8 do ArcGIS, fonte anterior, é a de imóveis residenciais e não
-- residenciais e nunca trouxe terrenos: a itbi_transactions de produção tinha
-- só essas três tipologias em 2026-10-21. A planilha da SMF traz terrenos
-- (TERRENO) também com uso RESIDENCIAL, e eles entrariam no R$/m² residencial
-- (useMicrobairroRanking filtra por uso, não por tipologia). Continuam em
-- itbi_escrituras para uso futuro. Idempotente.

CREATE OR REPLACE VIEW public.itbi_transactions_smf AS
SELECT
  md5(e.logradouro || '|' || e.bairro || '|' || e.data_transacao::text || '|' || e.uso || '|' || e.tipologia)::uuid AS id,
  e.logradouro,
  NULL::text                                   AS numero,
  NULL::text                                   AS complemento,
  e.bairro,
  min(e.cl)                                    AS cl,
  round(avg(e.valor_transacao), 2)             AS valor_transacao,
  round(avg(e.area_m2), 2)                     AS area_m2,
  round(sum(e.valor_transacao) / NULLIF(sum(e.area_m2), 0), 2) AS valor_m2,
  e.data_transacao,
  e.uso::public.uso_imovel                     AS uso,
  e.tipologia,
  count(*)::integer                            AS total_transacoes,
  100::numeric                                 AS percentual_transferido,
  NULL::text                                   AS microbairro,
  ST_Centroid(ST_Collect(e.geom))              AS geom,
  'smf'::text                                  AS fonte
FROM public.itbi_escrituras e
WHERE e.aceita
  AND e.uso IN ('Residencial', 'Comercial')
  AND e.tipologia IN ('Apartamento', 'Casa', 'Comercial')
GROUP BY e.logradouro, e.bairro, e.data_transacao, e.uso, e.tipologia;

CREATE OR REPLACE FUNCTION public.itbi_consolidar_smf(
  p_inicio date,
  p_fim    date,
  p_bairro text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '600s'
AS $$
DECLARE
  v_escrituras   bigint;
  v_removidas    bigint;
  v_inseridas    bigint;
  v_index_ok     boolean := true;
  v_index_erro   text;
BEGIN
  -- SECURITY DEFINER: current_user aqui é o dono da função, então o papel de
  -- quem chamou vem do JWT (auth.role()) ou, no SQL Editor, do session_user.
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin')
     AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'itbi_consolidar_smf: apenas service_role ou admin';
  END IF;
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim < p_inicio THEN
    RAISE EXCEPTION 'itbi_consolidar_smf: período inválido';
  END IF;

  SELECT count(*) INTO v_escrituras
  FROM public.itbi_escrituras e
  WHERE e.aceita
    AND e.uso IN ('Residencial', 'Comercial')
    AND e.tipologia IN ('Apartamento', 'Casa', 'Comercial')
    AND e.data_transacao BETWEEN p_inicio AND p_fim
    AND (p_bairro IS NULL OR e.bairro = upper(p_bairro));

  IF v_escrituras = 0 THEN
    RAISE EXCEPTION 'itbi_consolidar_smf: nenhuma escritura aceita em itbi_escrituras para o período; carregue antes de consolidar';
  END IF;

  -- Memória do que as linhas antigas já sabiam sobre cada rua.
  DROP TABLE IF EXISTS tmp_itbi_memoria;
  CREATE TEMP TABLE tmp_itbi_memoria ON COMMIT DROP AS
  SELECT DISTINCT ON (t.logradouro, t.bairro)
         t.logradouro, t.bairro, t.microbairro, t.lat, t.lng, t.geom, t.geocodificado_via
  FROM public.itbi_transactions t
  WHERE (p_bairro IS NULL OR t.bairro = upper(p_bairro))
  ORDER BY t.logradouro, t.bairro,
           (t.microbairro IS NOT NULL) DESC, (t.geom IS NOT NULL) DESC, t.updated_at DESC NULLS LAST;

  DELETE FROM public.itbi_transactions t
  WHERE t.data_transacao BETWEEN p_inicio AND p_fim
    AND (p_bairro IS NULL OR t.bairro = upper(p_bairro));
  GET DIAGNOSTICS v_removidas = ROW_COUNT;

  INSERT INTO public.itbi_transactions
    (logradouro, numero, complemento, bairro, valor_transacao, area_m2, data_transacao,
     uso, tipologia, total_transacoes, percentual_transferido, microbairro,
     lat, lng, geom, geocodificado_via, fonte)
  SELECT
    a.logradouro,
    NULL, NULL,
    a.bairro,
    a.valor_transacao,
    a.area_m2,
    a.data_transacao,
    a.uso,
    a.tipologia,
    a.total_transacoes,
    100,
    m.microbairro,
    COALESCE(m.lat, ST_Y(a.geom)),
    COALESCE(m.lng, ST_X(a.geom)),
    COALESCE(m.geom, a.geom),
    CASE WHEN m.geom IS NOT NULL THEN m.geocodificado_via
         WHEN a.geom IS NOT NULL THEN 'smf_numero_porta' END,
    'smf'
  FROM (
    SELECT
      e.logradouro, e.bairro, e.data_transacao,
      e.uso::public.uso_imovel AS uso, e.tipologia,
      round(avg(e.valor_transacao), 2)  AS valor_transacao,
      round(avg(e.area_m2), 2)          AS area_m2,
      count(*)::integer                 AS total_transacoes,
      ST_Centroid(ST_Collect(e.geom))   AS geom
    FROM public.itbi_escrituras e
    WHERE e.aceita
      AND e.uso IN ('Residencial', 'Comercial')
      AND e.tipologia IN ('Apartamento', 'Casa', 'Comercial')
      AND e.data_transacao BETWEEN p_inicio AND p_fim
      AND (p_bairro IS NULL OR e.bairro = upper(p_bairro))
    GROUP BY e.logradouro, e.bairro, e.data_transacao, e.uso, e.tipologia
  ) a
  LEFT JOIN tmp_itbi_memoria m
    ON m.logradouro = a.logradouro AND m.bairro IS NOT DISTINCT FROM a.bairro;
  GET DIAGNOSTICS v_inseridas = ROW_COUNT;

  BEGIN
    PERFORM public.refresh_itbi_price_index();
  EXCEPTION WHEN OTHERS THEN
    v_index_ok := false;
    v_index_erro := SQLERRM;
  END;

  RETURN jsonb_build_object(
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'bairro', p_bairro,
    'escrituras_consideradas', v_escrituras,
    'linhas_removidas', v_removidas,
    'linhas_inseridas', v_inseridas,
    'price_index_atualizado', v_index_ok,
    'price_index_erro', v_index_erro
  );
END;
$$;
