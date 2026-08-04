
-- 1) Backfill de geom no ITBI a partir da base logradouros_geo (sem custo de API)
CREATE OR REPLACE FUNCTION public.backfill_itbi_geom_from_logradouros()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exato integer := 0;
  v_fallback integer := 0;
  v_restantes integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores';
  END IF;

  -- match exato: logradouro normalizado + bairro
  WITH g AS (
    SELECT normalizar_logradouro(logradouro) AS ln, upper(bairro) AS bn,
           avg(latitude)::double precision AS lat, avg(longitude)::double precision AS lng
    FROM logradouros_geo
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY 1,2
  ), upd AS (
    UPDATE itbi_transactions t
    SET lat = g.lat,
        lng = g.lng,
        geom = ST_SetSRID(ST_MakePoint(g.lng, g.lat), 4326),
        geocodificado_via = 'logradouros_geo'
    FROM g
    WHERE t.geom IS NULL
      AND t.logradouro_norm = g.ln
      AND upper(t.bairro) = g.bn
    RETURNING 1
  )
  SELECT count(*) INTO v_exato FROM upd;

  -- fallback: apenas pelo logradouro normalizado (quando o bairro difere na grafia)
  WITH g AS (
    SELECT normalizar_logradouro(logradouro) AS ln,
           avg(latitude)::double precision AS lat, avg(longitude)::double precision AS lng
    FROM logradouros_geo
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY 1
    HAVING count(DISTINCT upper(bairro)) = 1
  ), upd AS (
    UPDATE itbi_transactions t
    SET lat = g.lat,
        lng = g.lng,
        geom = ST_SetSRID(ST_MakePoint(g.lng, g.lat), 4326),
        geocodificado_via = 'logradouros_geo_fallback'
    FROM g
    WHERE t.geom IS NULL
      AND t.logradouro_norm = g.ln
    RETURNING 1
  )
  SELECT count(*) INTO v_fallback FROM upd;

  SELECT count(*) INTO v_restantes FROM itbi_transactions WHERE geom IS NULL;

  RETURN jsonb_build_object(
    'atualizados_exato', v_exato,
    'atualizados_fallback', v_fallback,
    'total_atualizados', v_exato + v_fallback,
    'restantes_sem_geom', v_restantes
  );
END;
$$;

-- 2) Lista de logradouros distintos ainda sem coordenadas (prioriza os de maior volume)
CREATE OR REPLACE FUNCTION public.itbi_logradouros_pendentes(p_limite integer DEFAULT 100, p_bairro text DEFAULT NULL)
RETURNS TABLE(logradouro text, bairro text, registros bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.logradouro, t.bairro, count(*) AS registros
  FROM itbi_transactions t
  WHERE t.geom IS NULL
    AND (t.geocodificado_via IS NULL OR t.geocodificado_via NOT LIKE 'erro_%')
    AND (p_bairro IS NULL OR t.bairro ILIKE '%' || p_bairro || '%')
  GROUP BY t.logradouro, t.bairro
  ORDER BY count(*) DESC
  LIMIT GREATEST(1, LEAST(coalesce(p_limite, 100), 500));
$$;

-- 3) Status geral da geocodificação do ITBI
CREATE OR REPLACE FUNCTION public.itbi_geocoding_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'com_geom', count(*) FILTER (WHERE geom IS NOT NULL),
    'sem_geom', count(*) FILTER (WHERE geom IS NULL),
    'ruas_sem_geom', count(DISTINCT logradouro) FILTER (WHERE geom IS NULL),
    'com_erro', count(*) FILTER (WHERE geom IS NULL AND geocodificado_via LIKE 'erro_%')
  )
  FROM itbi_transactions;
$$;

-- 4) Aplica coordenadas a todas as linhas de um logradouro
CREATE OR REPLACE FUNCTION public.update_itbi_geom_por_logradouro(
  p_logradouro text,
  p_bairro text,
  p_lat double precision,
  p_lng double precision,
  p_via text DEFAULT 'google_maps_logradouro'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE itbi_transactions
  SET lat = p_lat,
      lng = p_lng,
      geom = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
      geocodificado_via = p_via
  WHERE geom IS NULL
    AND logradouro = p_logradouro
    AND bairro IS NOT DISTINCT FROM p_bairro;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.update_itbi_geom_por_logradouro(text, text, double precision, double precision, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_itbi_geom_por_logradouro(text, text, double precision, double precision, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.itbi_logradouros_pendentes(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.itbi_geocoding_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.backfill_itbi_geom_from_logradouros() TO authenticated, service_role;
