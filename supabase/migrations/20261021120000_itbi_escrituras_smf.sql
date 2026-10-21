-- ITBI por escritura (planilhas da SMF) e consolidação na itbi_transactions.
--
-- Contexto (2026-10-21): a camada 8 do ArcGIS, fonte atual, é um agregado por
-- rua x mês x tipologia que omite ruas com uma só transação no ano e entrega
-- entre 55% e 65% das escrituras da cidade (49.914 na SMF contra 27.922 na
-- camada 8 em 2024). A Secretaria Municipal de Fazenda publica a mesma base
-- guia a guia, com número, complemento, área e valor de cada negócio:
-- https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro
--
-- Desenho:
--   1. itbi_escrituras guarda a linha crua da SMF (uma por escritura).
--   2. itbi_transactions continua sendo o que o motor, as RPCs de raio, a
--      materialized view itbi_price_index e os hooks leem. A função
--      itbi_consolidar_smf() reconstrói as linhas de um período a partir de
--      itbi_escrituras, na mesma chave natural e com total_transacoes = contagem,
--      preservando microbairro e geocodificação das linhas antigas.
--   3. A coluna itbi_transactions.fonte diz de onde veio cada linha ('arcgis'
--      ou 'smf'); as cargas da camada 8 passam a recusar períodos já cobertos
--      pela SMF (ver sync-itbi-prefeitura e sync-itbi-daily).
--
-- Só cria coisas novas e uma coluna com default; não altera dados. Idempotente.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- 1. Tabela por escritura
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itbi_escrituras (
  id                     text PRIMARY KEY,                 -- hash SHA-1 da linha da SMF (+ sufixo de ocorrência)
  ano                    smallint NOT NULL,
  mes                    smallint NOT NULL,
  data_transacao         date NOT NULL,                    -- ano-mes-15, mesma convenção de itbi_transactions
  regiao_fiscal          text,
  cod_bairro             text,
  bairro                 text NOT NULL,                    -- MAIÚSCULAS
  cl                     text NOT NULL,                    -- código do logradouro, 6 dígitos; '000000' quando a SMF deixou vazio
  trecho                 smallint,
  logradouro             text NOT NULL,                    -- nome canônico por cl (grafia da camada 8 / SMF 2025+), MAIÚSCULAS
  logradouro_smf         text NOT NULL,                    -- nome como veio na planilha
  numero                 text,
  complemento            text,                             -- APT 804 BLC 6, SAL 316, CAS 52...
  cod_tipologia          text,
  tipologia_smf          text,                             -- APARTAMENTO, CASA, SALA, APART-HOTEL...
  tipologia              text NOT NULL,                    -- Apartamento | Casa | Terreno | Comercial | Outro
  uso_smf                text,                             -- RESIDENCIAL | NAO RESIDENCIAL | TERRITORIAL | AREA COMUM | VAGA VINCULADA
  uso                    text NOT NULL,                    -- Residencial | Comercial | Territorial | Outro
  percentual_transferido numeric(5,2) NOT NULL DEFAULT 100,
  valor_transacao        numeric(14,2) NOT NULL,
  area_m2                numeric(10,2) NOT NULL,
  valor_m2               numeric(12,2) GENERATED ALWAYS AS (round(valor_transacao / NULLIF(area_m2, 0), 2)) STORED,
  aceita                 boolean NOT NULL DEFAULT true,    -- passou em LIMITES_INGESTAO (_shared/itbiIngestion.ts)
  motivo_rejeicao        text,                             -- dados_invalidos | percentual | fora_da_faixa
  geo_precisao           text,                             -- exata | aproximada (nº X) | aproximada (centro da rua) | sem
  lat                    double precision,
  lon                    double precision,
  geom                   geometry(Point, 4326) GENERATED ALWAYS AS (
                           CASE WHEN lat IS NOT NULL AND lon IS NOT NULL
                                THEN ST_SetSRID(ST_MakePoint(lon, lat), 4326) END) STORED,
  np_usado               text,
  cod_lote               text,
  cod_quadra             text,
  cep                    text,
  num_pavimentos         smallint,
  arquivo_fonte          text,
  carregado_em           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itbi_escrituras_uso_chk CHECK (uso IN ('Residencial', 'Comercial', 'Territorial', 'Outro')),
  CONSTRAINT itbi_escrituras_tipologia_chk CHECK (tipologia IN ('Apartamento', 'Casa', 'Terreno', 'Comercial', 'Outro'))
);

COMMENT ON TABLE public.itbi_escrituras IS
  'ITBI por escritura, planilhas ITBI_TRANSACOES_* da SMF. Só transferências de 100%. Dado individual: nunca expor sem agregar (N>=5).';

CREATE INDEX IF NOT EXISTS itbi_escrituras_cl_data_idx     ON public.itbi_escrituras (cl, data_transacao);
CREATE INDEX IF NOT EXISTS itbi_escrituras_bairro_data_idx ON public.itbi_escrituras (bairro, data_transacao);
CREATE INDEX IF NOT EXISTS itbi_escrituras_chave_idx       ON public.itbi_escrituras (logradouro, bairro, data_transacao, uso, tipologia) WHERE aceita;
CREATE INDEX IF NOT EXISTS itbi_escrituras_geom_gix        ON public.itbi_escrituras USING gist (geom);

-- Segurança: só admin lê; service_role carrega (mesma postura das tabelas cruas).
ALTER TABLE public.itbi_escrituras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem itbi_escrituras" ON public.itbi_escrituras;
CREATE POLICY "Admins leem itbi_escrituras"
  ON public.itbi_escrituras FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.itbi_escrituras FROM anon;
GRANT SELECT ON public.itbi_escrituras TO authenticated;
GRANT ALL    ON public.itbi_escrituras TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Origem de cada linha agregada
-- ---------------------------------------------------------------------------
ALTER TABLE public.itbi_transactions
  ADD COLUMN IF NOT EXISTS fonte text NOT NULL DEFAULT 'arcgis';

COMMENT ON COLUMN public.itbi_transactions.fonte IS
  'arcgis = camada 8 do ArcGIS (agregado da Prefeitura); smf = consolidado de itbi_escrituras por itbi_consolidar_smf()';

CREATE INDEX IF NOT EXISTS idx_itbi_fonte_data
  ON public.itbi_transactions (fonte, data_transacao);

-- ---------------------------------------------------------------------------
-- 3. View agregada no formato de itbi_transactions (conferência lado a lado)
-- ---------------------------------------------------------------------------
-- total_transacoes = escrituras somadas; valor e área são médias simples, o
-- que faz valor_transacao/area_m2 (o valor_m2 gerado da itbi_transactions)
-- igualar o R$/m² ponderado soma(valor)/soma(área).
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
  AND e.tipologia <> 'Outro'
GROUP BY e.logradouro, e.bairro, e.data_transacao, e.uso, e.tipologia;

COMMENT ON VIEW public.itbi_transactions_smf IS
  'itbi_escrituras agregada na chave natural de itbi_transactions. Para conferência; a consolidação de verdade é itbi_consolidar_smf().';

GRANT SELECT ON public.itbi_transactions_smf TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Consolidação: reconstrói itbi_transactions no período a partir da SMF
-- ---------------------------------------------------------------------------
-- Substitui TODAS as linhas de itbi_transactions no período (e bairro, se
-- informado) pelo agregado de itbi_escrituras, em uma transação. Antes de
-- apagar, guarda microbairro e geocodificação por (logradouro, bairro) e os
-- devolve às linhas novas; onde a linha antiga não tinha coordenada, usa o
-- centroide das escrituras geocodificadas pelo Número de porta. Ao final
-- atualiza itbi_price_index.
--
-- Só service_role e admins. Chamada pelo carregador (scripts/itbi-smf) depois
-- de gravar itbi_escrituras, ou à mão pelo chat da Lovable:
--   select public.itbi_consolidar_smf('2019-01-01', '2026-12-31');
--   select public.itbi_consolidar_smf('2025-01-01', '2025-12-31', 'BARRA DA TIJUCA');
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
    AND e.tipologia <> 'Outro'
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
      AND e.tipologia <> 'Outro'
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

REVOKE ALL ON FUNCTION public.itbi_consolidar_smf(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.itbi_consolidar_smf(date, date, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.itbi_consolidar_smf(date, date, text) IS
  'Substitui itbi_transactions no período pelo agregado de itbi_escrituras (fonte smf), preservando microbairro e geocodificação por rua, e atualiza itbi_price_index.';

-- ---------------------------------------------------------------------------
-- 5. Conferência rápida (rodar à mão depois da carga)
-- ---------------------------------------------------------------------------
-- Escrituras por ano e fonte na itbi_transactions:
--   select extract(year from data_transacao) ano, fonte, sum(total_transacoes) escrituras
--   from public.itbi_transactions where uso = 'Residencial' group by 1, 2 order by 1, 2;
--
-- Lúcio Costa, residencial, 2025 (esperado ~448 na SMF contra ~302 na camada 8):
--   select fonte, sum(total_transacoes) from public.itbi_transactions
--   where logradouro ilike '%LUCIO COSTA%' and bairro = 'BARRA DA TIJUCA' and uso = 'Residencial'
--     and data_transacao between '2025-01-01' and '2025-12-31' group by fonte;
