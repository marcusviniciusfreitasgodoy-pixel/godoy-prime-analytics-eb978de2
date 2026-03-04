
-- 1. Drop constraint errada em lotes_pal (num_contribuinte não é unique)
ALTER TABLE lotes_pal DROP CONSTRAINT IF EXISTS lotes_pal_num_contribuinte_unique;
DROP INDEX IF EXISTS lotes_pal_num_contribuinte_unique;

-- 2. Garantir unique index em objectid_origem para lotes_pal
CREATE UNIQUE INDEX IF NOT EXISTS idx_lotes_pal_objectid_unique
  ON lotes_pal(objectid_origem)
  WHERE objectid_origem IS NOT NULL;

-- 3. RPC para calcular area_footprint pendentes em edificacoes_geo
CREATE OR REPLACE FUNCTION calcular_area_edificacoes_pendentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE edificacoes_geo
  SET area_footprint = ST_Area(ST_Transform(geom::geometry, 31983))
  WHERE area_footprint IS NULL
    AND geom IS NOT NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 4. Recalcular area_lote para registros já inseridos em lotes_pal
UPDATE lotes_pal
SET area_lote = ST_Area(ST_Transform(geom::geometry, 31983))
WHERE area_lote IS NULL AND geom IS NOT NULL;
