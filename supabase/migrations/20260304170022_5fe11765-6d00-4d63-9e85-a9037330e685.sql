
-- STEP 1: Add geometry columns to itbi_transactions
ALTER TABLE itbi_transactions
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS geocodificado_via text;

-- Spatial index on geom
CREATE INDEX IF NOT EXISTS idx_itbi_geom
  ON itbi_transactions USING GIST(geom)
  WHERE geom IS NOT NULL;

-- Partial index for pending geocoding
CREATE INDEX IF NOT EXISTS idx_itbi_geocod_pendente
  ON itbi_transactions(id)
  WHERE geom IS NULL AND geocodificado_via IS NULL;

-- STEP 2: RPC to update ITBI geometry (PostGIS via service role)
CREATE OR REPLACE FUNCTION update_itbi_geom(p_id uuid, p_lat double precision, p_lng double precision)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE itbi_transactions
  SET lat = p_lat,
      lng = p_lng,
      geom = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
      geocodificado_via = 'google_maps'
  WHERE id = p_id;
$$;

-- STEP 3: Rewrite enriquecer_condominios_com_itbi with spatial + fallback
CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  atualizados_espacial integer;
  atualizados_logradouro integer;
BEGIN
  -- METHOD 1: Spatial join (geocoded ITBI transactions within 150m)
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

  GET DIAGNOSTICS atualizados_espacial = ROW_COUNT;

  -- METHOD 2: Fallback by normalized logradouro (for condominios not matched spatially)
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
      ON normalizar_logradouro(c2.logradouro_padrao) = t.logradouro_norm
    WHERE (c2.total_transacoes_itbi IS NULL OR c2.total_transacoes_itbi = 0)
      AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY c2.id
    HAVING SUM(t.total_transacoes) >= 1
  ) sub
  WHERE c.id = sub.id;

  GET DIAGNOSTICS atualizados_logradouro = ROW_COUNT;

  RETURN jsonb_build_object(
    'atualizados_via_espacial', atualizados_espacial,
    'atualizados_via_logradouro', atualizados_logradouro,
    'total_com_itbi', atualizados_espacial + atualizados_logradouro
  );
END;
$$;

-- STEP 4: Geocoding status RPC
CREATE OR REPLACE FUNCTION geocodificacao_status(p_bairro text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_geocodificados integer;
  v_pendentes integer;
  v_erros integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE geocodificado_via = 'google_maps'),
    COUNT(*) FILTER (WHERE geom IS NULL AND (geocodificado_via IS NULL)),
    COUNT(*) FILTER (WHERE geocodificado_via LIKE 'erro_%')
  INTO v_total, v_geocodificados, v_pendentes, v_erros
  FROM itbi_transactions
  WHERE (p_bairro IS NULL OR bairro ILIKE '%' || p_bairro || '%');

  RETURN jsonb_build_object(
    'total', v_total,
    'geocodificados', v_geocodificados,
    'pendentes', v_pendentes,
    'erros', v_erros,
    'percentual', ROUND((v_geocodificados::numeric / NULLIF(v_total, 0) * 100), 1)
  );
END;
$$;
