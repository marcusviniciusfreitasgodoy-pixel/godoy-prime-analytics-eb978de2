-- P0-1: Fix RPCs from json to SETOF TABLE

-- 1a. get_condominios_bbox
DROP FUNCTION IF EXISTS get_condominios_bbox(double precision, double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_condominios_bbox(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_limit integer DEFAULT 300
)
RETURNS TABLE (
  id uuid,
  nome_condominio text,
  logradouro_padrao text,
  latitude numeric,
  longitude numeric,
  unidades_estimadas integer,
  numero_torres integer,
  preco_medio_m2 numeric,
  total_transacoes_itbi integer,
  ultima_transacao_itbi text,
  padrao_construtivo text,
  fonte_identificacao text,
  confianca_identificacao numeric,
  area_lote numeric,
  area_total_construida numeric,
  valor_venal_estimado numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.nome_condominio, c.logradouro_padrao,
    c.latitude, c.longitude, c.unidades_estimadas,
    c.numero_torres, c.preco_medio_m2, c.total_transacoes_itbi,
    c.ultima_transacao_itbi::text, c.padrao_construtivo,
    c.fonte_identificacao, c.confianca_identificacao,
    c.area_lote, c.area_total_construida, c.valor_venal_estimado
  FROM condominios_mapeamento c
  WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    AND c.latitude BETWEEN p_south AND p_north
    AND c.longitude BETWEEN p_west AND p_east
  ORDER BY c.preco_medio_m2 DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- 1b. get_condo_itbi_history
DROP FUNCTION IF EXISTS get_condo_itbi_history(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION get_condo_itbi_history(
  p_lat double precision,
  p_lng double precision,
  p_raio double precision DEFAULT 150
)
RETURNS TABLE (
  periodo text,
  preco_medio_m2 numeric,
  transacoes bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(YEAR FROM t.data_transacao::date)::integer::text || '-Q' || EXTRACT(QUARTER FROM t.data_transacao::date)::integer::text,
    ROUND(AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END)::numeric, 2),
    COUNT(*)
  FROM itbi_transactions t
  WHERE t.geom IS NOT NULL
    AND ST_DWithin(t.geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio)
    AND t.data_transacao::date >= CURRENT_DATE - INTERVAL '5 years'
  GROUP BY EXTRACT(YEAR FROM t.data_transacao::date), EXTRACT(QUARTER FROM t.data_transacao::date)
  HAVING COUNT(*) >= 1
  ORDER BY EXTRACT(YEAR FROM t.data_transacao::date), EXTRACT(QUARTER FROM t.data_transacao::date);
END;
$$;

-- 1c. get_territorial_kpis
DROP FUNCTION IF EXISTS get_territorial_kpis();

CREATE OR REPLACE FUNCTION get_territorial_kpis()
RETURNS TABLE (
  total_condominios bigint,
  com_historico_precos bigint,
  unidades_mapeadas bigint,
  preco_medio_m2_barra numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE c.preco_medio_m2 > 0)::bigint,
    COALESCE(SUM(c.unidades_estimadas) FILTER (WHERE c.unidades_estimadas > 0), 0)::bigint,
    ROUND(AVG(c.preco_medio_m2) FILTER (WHERE c.preco_medio_m2 > 0)::numeric, 0)
  FROM condominios_mapeamento c;
END;
$$;

-- P0-2: recalcular_unidades_estimadas
CREATE OR REPLACE FUNCTION recalcular_unidades_estimadas()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  atualizados integer;
BEGIN
  UPDATE condominios_mapeamento c
  SET unidades_estimadas = sub.total_unidades
  FROM (
    SELECT tc.condominio_id, SUM(tc.unidades_estimadas)::integer as total_unidades
    FROM torres_condominios tc
    WHERE tc.unidades_estimadas IS NOT NULL AND tc.unidades_estimadas > 0
    GROUP BY tc.condominio_id
  ) sub
  WHERE c.id = sub.condominio_id AND sub.total_unidades > 0;

  GET DIAGNOSTICS atualizados = ROW_COUNT;
  RETURN jsonb_build_object('condominios_atualizados', atualizados);
END;
$$;

-- P0-3: Fix enriquecer with batched processing
DROP FUNCTION IF EXISTS enriquecer_condominios_com_itbi(integer);
DROP FUNCTION IF EXISTS enriquecer_condominios_com_itbi();

CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi(
  p_limite integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  atualizados integer := 0;
  lote_atualizados integer;
  offset_val integer := 0;
  total_condos integer;
BEGIN
  SELECT COUNT(*)::integer INTO total_condos FROM condominios_mapeamento WHERE geom IS NOT NULL;

  LOOP
    UPDATE condominios_mapeamento c
    SET
      total_transacoes_itbi = sub.total,
      preco_medio_m2 = sub.pm2,
      ultima_transacao_itbi = sub.ultima::text,
      atualizado_em = now()
    FROM (
      SELECT
        c2.id,
        COUNT(t.id)::integer as total,
        ROUND(AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END)::numeric, 2) as pm2,
        MAX(t.data_transacao) as ultima
      FROM (
        SELECT sq.id, sq.geom FROM condominios_mapeamento sq
        WHERE sq.geom IS NOT NULL
        ORDER BY sq.id
        LIMIT p_limite OFFSET offset_val
      ) c2
      JOIN itbi_transactions t
        ON t.geom IS NOT NULL
        AND ST_DWithin(c2.geom::geography, t.geom::geography, 150)
        AND t.data_transacao::date >= CURRENT_DATE - INTERVAL '5 years'
      GROUP BY c2.id
      HAVING COUNT(t.id) >= 1
    ) sub
    WHERE c.id = sub.id;

    GET DIAGNOSTICS lote_atualizados = ROW_COUNT;
    atualizados := atualizados + lote_atualizados;
    offset_val := offset_val + p_limite;
    EXIT WHEN offset_val >= total_condos;
  END LOOP;

  RETURN jsonb_build_object('condominios_com_itbi', atualizados, 'metodo', 'espacial_150m_lotes');
END;
$$;

-- Ensure GIST indexes
CREATE INDEX IF NOT EXISTS idx_cond_geom ON condominios_mapeamento USING GIST(geom)