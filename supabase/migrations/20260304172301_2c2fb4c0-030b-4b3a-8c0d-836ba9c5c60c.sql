
CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  atualizados integer;
BEGIN
  UPDATE condominios_mapeamento c
  SET
    total_transacoes_itbi = sub.total,
    preco_medio_m2 = sub.preco_medio_m2,
    ultima_transacao_itbi = sub.ultima_transacao,
    atualizado_em = now()
  FROM (
    SELECT
      c2.id,
      SUM(t.total_transacoes) as total,
      ROUND(
        SUM(CASE WHEN t.area_m2 > 0 THEN (t.valor_transacao / t.area_m2) * t.total_transacoes ELSE 0 END)
        / NULLIF(SUM(CASE WHEN t.area_m2 > 0 THEN t.total_transacoes ELSE 0 END), 0)
      ::numeric, 2) as preco_medio_m2,
      MAX(t.data_transacao) as ultima_transacao
    FROM condominios_mapeamento c2
    JOIN itbi_transactions t
      ON ST_DWithin(
        c2.geom::geography,
        t.geom::geography,
        150
      )
    WHERE c2.geom IS NOT NULL
      AND t.geom IS NOT NULL
      AND t.geocodificado_via = 'google_maps'
      AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY c2.id
    HAVING SUM(t.total_transacoes) >= 1
  ) sub
  WHERE c.id = sub.id;

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object(
    'condominios_com_itbi', atualizados,
    'metodo', 'espacial_150m'
  );
END;
$$;
