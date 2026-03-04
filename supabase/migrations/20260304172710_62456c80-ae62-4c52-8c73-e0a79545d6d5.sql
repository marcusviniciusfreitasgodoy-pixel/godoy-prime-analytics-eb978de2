
-- RPC: get condominios within bounding box
CREATE OR REPLACE FUNCTION get_condominios_bbox(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_limit integer DEFAULT 300
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
    FROM (
      SELECT
        id, nome_condominio, logradouro_padrao,
        latitude, longitude, unidades_estimadas,
        numero_torres, preco_medio_m2, total_transacoes_itbi,
        ultima_transacao_itbi, padrao_construtivo,
        fonte_identificacao, confianca_identificacao,
        area_lote, area_total_construida, valor_venal_estimado
      FROM condominios_mapeamento
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND latitude BETWEEN p_south AND p_north
        AND longitude BETWEEN p_west AND p_east
      ORDER BY preco_medio_m2 DESC NULLS LAST
      LIMIT p_limit
    ) r
  );
END;
$$;

-- RPC: get ITBI price history near a location
CREATE OR REPLACE FUNCTION get_condo_itbi_history(
  p_lat double precision,
  p_lng double precision,
  p_raio integer DEFAULT 150
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('quarter', t.data_transacao), 'YYYY-"Q"Q') as periodo,
        ROUND(
          SUM(CASE WHEN t.area_m2 > 0 THEN (t.valor_transacao / t.area_m2) * t.total_transacoes ELSE 0 END)
          / NULLIF(SUM(CASE WHEN t.area_m2 > 0 THEN t.total_transacoes ELSE 0 END), 0)
        ::numeric, 0) as preco_medio_m2,
        SUM(t.total_transacoes)::integer as transacoes
      FROM itbi_transactions t
      WHERE t.geom IS NOT NULL
        AND t.geocodificado_via = 'google_maps'
        AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
        AND ST_DWithin(
          t.geom::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_raio
        )
      GROUP BY DATE_TRUNC('quarter', t.data_transacao)
      ORDER BY DATE_TRUNC('quarter', t.data_transacao)
    ) r
  );
END;
$$;

-- RPC: get territorial KPIs
CREATE OR REPLACE FUNCTION get_territorial_kpis()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total_condominios', COUNT(*),
      'com_historico_precos', COUNT(*) FILTER (WHERE preco_medio_m2 > 0),
      'unidades_mapeadas', COALESCE(SUM(unidades_estimadas) FILTER (WHERE unidades_estimadas IS NOT NULL), 0),
      'preco_medio_m2_barra', ROUND(AVG(preco_medio_m2) FILTER (WHERE preco_medio_m2 > 0))
    )
    FROM condominios_mapeamento
  );
END;
$$;
