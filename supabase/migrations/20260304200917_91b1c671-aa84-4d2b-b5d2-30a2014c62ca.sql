
CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi(
  p_offset integer DEFAULT 0,
  p_limite integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
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
      COUNT(t.id) as total,
      ROUND(AVG(
        CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END
      )::numeric, 2) as preco_medio_m2,
      MAX(t.data_transacao) as ultima_transacao
    FROM (
      SELECT id, geom
      FROM condominios_mapeamento
      WHERE geom IS NOT NULL
      ORDER BY id
      LIMIT p_limite OFFSET p_offset
    ) c2
    JOIN itbi_transactions t
      ON ST_DWithin(
        c2.geom::geography,
        t.geom::geography,
        150
      )
    WHERE t.geom IS NOT NULL
      AND t.geocodificado_via = 'google_maps'
      AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY c2.id
    HAVING COUNT(t.id) >= 1
  ) sub
  WHERE c.id = sub.id;

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object(
    'condominios_com_itbi', atualizados,
    'offset', p_offset,
    'limite', p_limite
  );
END;
$$;
