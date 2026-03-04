
DROP FUNCTION IF EXISTS get_condo_itbi_history(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION get_condo_itbi_history(
  p_lat float,
  p_lng float,
  p_raio float DEFAULT 150
)
RETURNS TABLE (
  periodo timestamptz,
  preco_medio_m2 numeric,
  transacoes bigint,
  agrupamento text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_pontos integer;
BEGIN
  SELECT COUNT(DISTINCT DATE_TRUNC('quarter', t.data_transacao))
  INTO total_pontos
  FROM itbi_transactions t
  WHERE t.geom IS NOT NULL
    AND ST_DWithin(
      t.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_raio
    )
    AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years';

  IF total_pontos >= 3 THEN
    RETURN QUERY
    SELECT
      DATE_TRUNC('quarter', t.data_transacao)::timestamptz,
      ROUND(AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END)::numeric, 2),
      COUNT(*),
      'trimestral'::text
    FROM itbi_transactions t
    WHERE t.geom IS NOT NULL
      AND ST_DWithin(t.geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio)
      AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY DATE_TRUNC('quarter', t.data_transacao)
    ORDER BY 1;
  ELSE
    RETURN QUERY
    SELECT
      DATE_TRUNC('year', t.data_transacao)::timestamptz,
      ROUND(AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END)::numeric, 2),
      COUNT(*),
      'anual'::text
    FROM itbi_transactions t
    WHERE t.geom IS NOT NULL
      AND ST_DWithin(t.geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_raio)
      AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY DATE_TRUNC('year', t.data_transacao)
    ORDER BY 1;
  END IF;
END;
$$;
