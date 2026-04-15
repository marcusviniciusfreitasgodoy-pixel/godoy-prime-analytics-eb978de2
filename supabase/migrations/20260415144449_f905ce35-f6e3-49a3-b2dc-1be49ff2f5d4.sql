-- Batch update logradouros_geo STALE entries using condominium coordinates
-- For streets internal to a single condominium: copy its coordinates
-- For streets shared between multiple condominiums: use average (centroid)

WITH condo_ruas AS (
  -- Expand all internal streets from active condominiums with coordinates
  SELECT 
    UPPER(TRIM(unnest(ruas_internas))) AS rua,
    latitude,
    longitude,
    nome_condominio
  FROM condominios_mapeamento
  WHERE ativo = true 
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND ruas_internas IS NOT NULL
  
  UNION ALL
  
  -- Also include logradouro_padrao
  SELECT 
    UPPER(TRIM(logradouro_padrao)) AS rua,
    latitude,
    longitude,
    nome_condominio
  FROM condominios_mapeamento
  WHERE ativo = true 
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND logradouro_padrao IS NOT NULL

  UNION ALL
  
  -- Also include logradouro_itbi_normalizado
  SELECT 
    UPPER(TRIM(logradouro_itbi_normalizado)) AS rua,
    latitude,
    longitude,
    nome_condominio
  FROM condominios_mapeamento
  WHERE ativo = true 
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND logradouro_itbi_normalizado IS NOT NULL
),
condo_centroids AS (
  -- Calculate centroid for each street (works for single and multi-condo)
  SELECT 
    rua,
    AVG(latitude) AS avg_lat,
    AVG(longitude) AS avg_lng,
    COUNT(DISTINCT nome_condominio) AS num_condos
  FROM condo_ruas
  WHERE rua != ''
  GROUP BY rua
)
UPDATE logradouros_geo lg
SET 
  latitude = cc.avg_lat,
  longitude = cc.avg_lng,
  hierarquia = 'CONDOMINIO',
  last_sync = NOW()
FROM condo_centroids cc
WHERE UPPER(TRIM(lg.logradouro)) = cc.rua
  AND (lg.hierarquia IN ('STALE', 'FALLBACK') OR lg.hierarquia IS NULL OR lg.latitude IS NULL);