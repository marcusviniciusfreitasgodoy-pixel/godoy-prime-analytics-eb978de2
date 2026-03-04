

## Plan: Fix geometry type mismatch + update centroid calculation

### Problem confirmed
- `lotes_pal.geom` = `POLYGON` (rejects MultiPolygon)
- `edificacoes_geo.geom` = `POLYGON` (rejects MultiPolygon)
- `condominios_mapeamento.geom` = `POINT` (no change needed — it's a centroid)
- `condominios_mapeamento.geom_lote` = `POLYGON` (needs fix)
- `torres_condominios.geom` = `POINT` (no change needed — it's a centroid)
- GIST indexes already exist on all three polygon tables

### Migration SQL (single migration)

**Part 1 — Widen geometry types to accept any geometry:**
```sql
ALTER TABLE lotes_pal
  ALTER COLUMN geom TYPE geometry(Geometry, 4326)
  USING geom::geometry(Geometry, 4326);

ALTER TABLE edificacoes_geo
  ALTER COLUMN geom TYPE geometry(Geometry, 4326)
  USING geom::geometry(Geometry, 4326);

ALTER TABLE condominios_mapeamento
  ALTER COLUMN geom_lote TYPE geometry(Geometry, 4326)
  USING geom_lote::geometry(Geometry, 4326);
```

Note: `torres_condominios.geom` and `condominios_mapeamento.geom` are POINT columns — they don't receive polygon data, so no change needed.

**Part 2 — Recreate GIST indexes:**
```sql
DROP INDEX IF EXISTS idx_lotes_geom;
CREATE INDEX idx_lotes_geom ON lotes_pal USING GIST(geom);

DROP INDEX IF EXISTS idx_edif_geom;
CREATE INDEX idx_edif_geom ON edificacoes_geo USING GIST(geom);

DROP INDEX IF EXISTS idx_cond_geom;
CREATE INDEX idx_cond_geom ON condominios_mapeamento USING GIST(geom);
```

**Part 3 — Create RPC for PostGIS centroid calculation:**
```sql
CREATE OR REPLACE FUNCTION calcular_centroids_edificacoes_pendentes()
RETURNS integer
LANGUAGE plpgsql AS $$
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
```

### Edge Function changes

**`ingest-edificacoes-geo/index.ts`:**
- Remove `calcCentroidLat` and `calcCentroidLng` functions
- Remove inline lat/lng calculation from the transform step (set lat/lng to null)
- After `calcular_area_edificacoes_pendentes` RPC call, also call `calcular_centroids_edificacoes_pendentes`

**`ingest-lotes-pal/index.ts`:**
- No changes needed (doesn't calculate centroids)

### Files to modify

| File | Change |
|------|--------|
| New migration SQL | ALTER column types, recreate indexes, create centroid RPC |
| `supabase/functions/ingest-edificacoes-geo/index.ts` | Remove JS centroid calc, use PostGIS RPC instead |

