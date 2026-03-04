-- RPC: get_lotes_pal_bbox - returns lotes as GeoJSON within bounding box
CREATE OR REPLACE FUNCTION get_lotes_pal_bbox(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  geom_geojson json,
  logradouro text,
  area_lote numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    l.id,
    ST_AsGeoJSON(l.geom)::json as geom_geojson,
    l.logradouro,
    l.area_lote
  FROM lotes_pal l
  WHERE l.geom IS NOT NULL
    AND l.geom && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
  LIMIT p_limit;
$$;

-- RPC: get_coverage_stats - returns dynamic counts for admin dashboard
CREATE OR REPLACE FUNCTION get_coverage_stats()
RETURNS TABLE (
  edificacoes_total bigint,
  edificacoes_com_area bigint,
  lotes_total bigint,
  iptu_logradouros bigint,
  condominios_total bigint,
  condominios_com_itbi bigint,
  condominios_com_logradouro bigint
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*)::bigint FROM edificacoes_geo),
    (SELECT COUNT(*)::bigint FROM edificacoes_geo WHERE area_footprint IS NOT NULL),
    (SELECT COUNT(*)::bigint FROM lotes_pal),
    (SELECT COUNT(*)::bigint FROM iptu_logradouro_resumo),
    (SELECT COUNT(*)::bigint FROM condominios_mapeamento),
    (SELECT COUNT(*)::bigint FROM condominios_mapeamento WHERE preco_medio_m2 > 0),
    (SELECT COUNT(*)::bigint FROM condominios_mapeamento
      WHERE logradouro_padrao NOT LIKE '%não cadastrado%'
        AND logradouro_padrao NOT LIKE '%não identificado%');
END;
$$;

-- RPC: get_logradouros_sem_geo - for enrich-logradouros-geo edge function
CREATE OR REPLACE FUNCTION get_logradouros_sem_geo(p_limite integer DEFAULT 100)
RETURNS TABLE (
  logradouro text,
  logradouro_norm text
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT r.logradouro, r.logradouro_norm
  FROM iptu_logradouro_resumo r
  WHERE r.bairro ILIKE '%Barra%'
    AND NOT EXISTS (
      SELECT 1 FROM logradouros_geo g
      WHERE UPPER(TRIM(g.logradouro)) = UPPER(TRIM(r.logradouro))
    )
  LIMIT p_limite;
$$;