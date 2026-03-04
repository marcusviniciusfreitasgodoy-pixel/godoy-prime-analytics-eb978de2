
-- Part 1: Widen geometry types
ALTER TABLE lotes_pal
  ALTER COLUMN geom TYPE geometry(Geometry, 4326)
  USING geom::geometry(Geometry, 4326);

ALTER TABLE edificacoes_geo
  ALTER COLUMN geom TYPE geometry(Geometry, 4326)
  USING geom::geometry(Geometry, 4326);

ALTER TABLE condominios_mapeamento
  ALTER COLUMN geom_lote TYPE geometry(Geometry, 4326)
  USING geom_lote::geometry(Geometry, 4326);

-- Part 2: Recreate GIST indexes
DROP INDEX IF EXISTS idx_lotes_geom;
CREATE INDEX idx_lotes_geom ON lotes_pal USING GIST(geom);

DROP INDEX IF EXISTS idx_edif_geom;
CREATE INDEX idx_edif_geom ON edificacoes_geo USING GIST(geom);

DROP INDEX IF EXISTS idx_cond_geom;
CREATE INDEX idx_cond_geom ON condominios_mapeamento USING GIST(geom);

-- Part 3: Create RPC for PostGIS centroid calculation
CREATE OR REPLACE FUNCTION calcular_centroids_edificacoes_pendentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  UPDATE edificacoes_geo
  SET lat = ST_Y(ST_Centroid(geom)),
      lng = ST_X(ST_Centroid(geom))
  WHERE (lat IS NULL OR lng IS NULL)
    AND geom IS NOT NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
