-- Cinto de outliers: duas regras que comparam a escritura com o próprio prédio.
--
-- Contexto (auditoria de 2026-10-21, docs/especificacao-metodologia-godoy-prime.md,
-- seções 2.5 e 15.0): o cinto é uma faixa por bairro x tipologia e não enxerga
-- o prédio. Isso causa dois problemas.
--   1. Corta vendas reais de prédios caros para o bairro (prédio novo no Méier,
--      cobertura em Ipanema). A auditoria achou cerca de 240 vendas reais
--      cortadas, quase todas por esse motivo.
--   2. Deixa passar vendas por uma fração do valor do resto do prédio, com a
--      mesma área (119 m² no Leme por R$ 68 mil; unidades subsidiadas de 40 m²
--      por R$ 40 mil em conjuntos que vendem a R$ 160 mil). Não são preço de
--      mercado e puxam as avaliações para baixo.
--
-- Prédio = mesmo cl (código de logradouro), mesmo número, mesmo bairro e mesma
-- tipologia. Exige cl conhecido (diferente de '000000') e número de porta
-- válido. Referências do prédio = as outras escrituras do mesmo prédio, de
-- qualquer data, com preço corrigido pelo índice DENTRO do cinto do par. Só
-- referências dentro do cinto contam, para um erro não abonar outro.
--
-- Regra A, fora de mercado (motivo 'fora_de_mercado'): com 2 ou mais
-- referências de área parecida (de área ÷ 1,25 a área × 1,25), a escritura com
-- R$/m² corrigido de no máximo 50% da mediana delas sai da consolidação. Vale
-- dentro e fora do cinto.
--
-- Regra B, exceção por prédio: escritura ACIMA do teto, com 2 ou mais
-- referências e R$/m² entre 0,67 e 1,5 vez a mediana delas, não é marcada.
-- Só vale do lado de cima: do lado de baixo, um prédio com várias vendas fora
-- de mercado abonaria as outras.
--
-- Ordem: fora de mercado vence; depois o cinto com a exceção. A marcação é
-- refeita a cada consolidação (escrituras aceitas, fora_do_cinto ou
-- fora_de_mercado do período), então mudar uma regra e reconsolidar desfaz a
-- marcação antiga. Nada é apagado: a escritura fica em itbi_escrituras com o
-- motivo, e a carga mensal, que regrava as escrituras, é seguida da mesma
-- consolidação.
--
-- As constantes ficam espelhadas em supabase/functions/_shared/outlierLimits.ts
-- (REGRA_PREDIO); src/utils/__tests__/regraPredio.test.ts confere que este
-- arquivo usa os mesmos valores.
--
-- Idempotente: CREATE INDEX IF NOT EXISTS e CREATE OR REPLACE FUNCTION, com a
-- mesma assinatura e o mesmo formato de retorno de antes (campos novos somados).

CREATE INDEX IF NOT EXISTS itbi_escrituras_predio_idx
  ON public.itbi_escrituras (cl, numero, tipologia);

CREATE OR REPLACE FUNCTION public.itbi_aplicar_cinto(p_inicio date, p_fim date, p_bairro text DEFAULT NULL, p_aplicar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '600s'
AS $$
DECLARE
  -- Regra A: fração máxima do R$/m² mediano das referências de área parecida.
  c_fator_fora_mercado constant numeric := 0.5;
  -- Regra A: tolerância de área (referência entre área ÷ 1,25 e área × 1,25).
  c_tolerancia_area constant numeric := 1.25;
  -- Regras A e B: mínimo de referências do prédio.
  c_min_referencias constant integer := 2;
  -- Regra B: faixa da razão R$/m² ÷ mediana do prédio que abona a escritura.
  c_excecao_min constant numeric := 0.67;
  c_excecao_max constant numeric := 1.5;
  v_resultado jsonb; v_sem_indice bigint; v_alteradas bigint := 0;
BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin')
     AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'itbi_aplicar_cinto: apenas service_role ou admin';
  END IF;
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim < p_inicio OR p_aplicar IS NULL THEN
    RAISE EXCEPTION 'itbi_aplicar_cinto: parâmetros inválidos';
  END IF;
  LOCK TABLE public.itbi_cinto IN SHARE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.itbi_cinto WHERE bairro='CIDADE' AND tipologia='*') THEN
    RAISE EXCEPTION 'itbi_aplicar_cinto: carregue o cinto aprovado e a faixa da cidade antes de consolidar';
  END IF;

  SELECT count(*) INTO v_sem_indice
  FROM public.itbi_escrituras e
  LEFT JOIN public.itbi_price_index i ON i.trimestre = date_trunc('quarter', e.data_transacao)::date
  WHERE (e.aceita OR e.motivo_rejeicao IN ('fora_do_cinto','fora_de_mercado'))
    AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.uso IN ('Residencial','Comercial')
    AND e.data_transacao BETWEEN p_inicio AND p_fim
    AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro) = public.itbi_normalizar_bairro_cinto(p_bairro))
    AND (i.ln_mediana IS NULL OR e.valor_m2 IS NULL OR e.valor_m2 <= 0);
  IF v_sem_indice > 0 THEN
    RAISE EXCEPTION 'itbi_aplicar_cinto: % escrituras sem índice ou preço válido; nenhuma marcação aplicada', v_sem_indice;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_itbi_cinto_decisao_v2 (
    id text PRIMARY KEY, bairro text, situacao text, situacao_anterior text, excecao boolean
  ) ON COMMIT DROP;
  DELETE FROM tmp_itbi_cinto_decisao_v2;

  WITH ref AS (SELECT ln_mediana FROM public.itbi_price_index ORDER BY trimestre DESC LIMIT 1),
  idx AS MATERIALIZED (
    SELECT trimestre, exp((SELECT ln_mediana FROM ref) - ln_mediana) AS f FROM public.itbi_price_index
  ),
  cid AS (SELECT piso, teto FROM public.itbi_cinto WHERE bairro='CIDADE' AND tipologia='*'),
  -- Escrituras avaliadas nesta chamada.
  alvo AS MATERIALIZED (
    SELECT e.id, e.bairro, e.tipologia, e.cl, e.numero, e.area_m2,
           public.itbi_normalizar_bairro_cinto(e.bairro) AS bairro_norm,
           (e.valor_m2 * x.f)::numeric AS vc,
           coalesce(c.piso, (SELECT piso FROM cid)) AS piso,
           coalesce(c.teto, (SELECT teto FROM cid)) AS teto,
           CASE WHEN e.aceita THEN 'aceita' ELSE e.motivo_rejeicao END AS situacao_anterior,
           (e.cl IS NOT NULL AND e.cl <> '000000' AND ltrim(upper(btrim(coalesce(e.numero,''))),'0') ~ '^[1-9][0-9]*[A-Z]?$') AS chave_ok
    FROM public.itbi_escrituras e
    JOIN idx x ON x.trimestre = date_trunc('quarter', e.data_transacao)::date
    LEFT JOIN public.itbi_cinto c ON c.bairro = public.itbi_normalizar_bairro_cinto(e.bairro) AND c.tipologia = e.tipologia
    WHERE (e.aceita OR e.motivo_rejeicao IN ('fora_do_cinto','fora_de_mercado'))
      AND e.tipologia IN ('Apartamento','Casa','Comercial') AND e.uso IN ('Residencial','Comercial')
      AND e.data_transacao BETWEEN p_inicio AND p_fim
      AND (p_bairro IS NULL OR public.itbi_normalizar_bairro_cinto(e.bairro) = public.itbi_normalizar_bairro_cinto(p_bairro))
  ),
  predios AS (SELECT DISTINCT cl, numero, tipologia, bairro, piso, teto FROM alvo WHERE chave_ok),
  -- Referências: outras escrituras do mesmo prédio, de qualquer data, com preço corrigido dentro do cinto.
  refs AS MATERIALIZED (
    SELECT r.id, r.cl, r.numero, r.tipologia, r.bairro, r.area_m2, (r.valor_m2 * x.f)::numeric AS vc
    FROM predios p
    JOIN public.itbi_escrituras r ON r.cl = p.cl AND r.numero = p.numero AND r.tipologia = p.tipologia AND r.bairro = p.bairro
    JOIN idx x ON x.trimestre = date_trunc('quarter', r.data_transacao)::date
    WHERE (r.aceita OR r.motivo_rejeicao IN ('fora_do_cinto','fora_de_mercado'))
      AND r.uso IN ('Residencial','Comercial')
      AND r.valor_m2 * x.f BETWEEN p.piso AND p.teto
  ),
  ref_area AS (
    SELECT a.id, count(r.id) AS n, percentile_cont(0.5) WITHIN GROUP (ORDER BY r.vc) AS mediana
    FROM alvo a
    JOIN refs r ON r.cl = a.cl AND r.numero = a.numero AND r.tipologia = a.tipologia AND r.bairro = a.bairro AND r.id <> a.id
      AND r.area_m2 BETWEEN a.area_m2 / c_tolerancia_area AND a.area_m2 * c_tolerancia_area
    WHERE a.chave_ok
    GROUP BY a.id
  ),
  ref_todas AS (
    SELECT a.id, count(r.id) AS n, percentile_cont(0.5) WITHIN GROUP (ORDER BY r.vc) AS mediana
    FROM alvo a
    JOIN refs r ON r.cl = a.cl AND r.numero = a.numero AND r.tipologia = a.tipologia AND r.bairro = a.bairro AND r.id <> a.id
    WHERE a.chave_ok AND a.vc > a.teto
    GROUP BY a.id
  ),
  decisao AS (
    SELECT a.id, a.bairro_norm, a.situacao_anterior,
      (ra.n >= c_min_referencias AND a.vc <= c_fator_fora_mercado * ra.mediana::numeric) AS fora_mercado,
      (a.vc > a.teto AND rt.n >= c_min_referencias
        AND a.vc BETWEEN c_excecao_min * rt.mediana::numeric AND c_excecao_max * rt.mediana::numeric) AS excecao,
      (a.vc BETWEEN a.piso AND a.teto) AS dentro
    FROM alvo a
    LEFT JOIN ref_area ra ON ra.id = a.id
    LEFT JOIN ref_todas rt ON rt.id = a.id
  )
  INSERT INTO tmp_itbi_cinto_decisao_v2 (id, bairro, situacao, situacao_anterior, excecao)
  SELECT id, bairro_norm,
    CASE WHEN coalesce(fora_mercado, false) THEN 'fora_de_mercado'
         WHEN NOT dentro AND NOT coalesce(excecao, false) THEN 'fora_do_cinto'
         ELSE 'aceita' END,
    situacao_anterior, coalesce(excecao, false) AND NOT coalesce(fora_mercado, false)
  FROM decisao;

  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.bairro), '[]'::jsonb) INTO v_resultado FROM (
    SELECT bairro,
      count(*) AS avaliadas,
      count(*) FILTER (WHERE situacao = 'fora_do_cinto') AS fora_do_cinto,
      count(*) FILTER (WHERE situacao = 'fora_de_mercado') AS fora_de_mercado,
      count(*) FILTER (WHERE excecao) AS excecoes_predio,
      count(*) FILTER (WHERE situacao <> 'aceita' AND situacao_anterior = 'aceita') AS novas_rejeicoes,
      count(*) FILTER (WHERE situacao = 'aceita' AND situacao_anterior <> 'aceita') AS reaceitas
    FROM tmp_itbi_cinto_decisao_v2 GROUP BY bairro
  ) a;

  IF p_aplicar THEN
    UPDATE public.itbi_escrituras e
    SET aceita = (d.situacao = 'aceita'),
        motivo_rejeicao = CASE WHEN d.situacao = 'aceita' THEN NULL ELSE d.situacao END
    FROM tmp_itbi_cinto_decisao_v2 d
    WHERE e.id = d.id
      AND (e.aceita IS DISTINCT FROM (d.situacao = 'aceita')
           OR e.motivo_rejeicao IS DISTINCT FROM CASE WHEN d.situacao = 'aceita' THEN NULL ELSE d.situacao END);
    GET DIAGNOSTICS v_alteradas = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'aplicado', p_aplicar,
    'alteradas', v_alteradas,
    'regras', jsonb_build_object(
      'fator_fora_mercado', c_fator_fora_mercado, 'tolerancia_area', c_tolerancia_area,
      'min_referencias', c_min_referencias, 'excecao_min', c_excecao_min, 'excecao_max', c_excecao_max),
    'por_bairro', v_resultado);
END;
$$;

COMMENT ON FUNCTION public.itbi_aplicar_cinto(date, date, text, boolean) IS
  'Marca escrituras fora_do_cinto (faixa bairro x tipologia, com exceção para prédio caro coerente) e fora_de_mercado (até 50% do R$/m² de unidades de área parecida do mesmo prédio). Chamada por itbi_consolidar_smf.';
