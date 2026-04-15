
-- PART 1: Override GOOGLE hierarchy for streets that are internal to condominiums
WITH condo_ruas AS (
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
),
condo_centroids AS (
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
  AND lg.hierarquia = 'GOOGLE';

-- PART 2: Generate normalization aliases for ITBI abbreviations
INSERT INTO logradouros_normalizacao (logradouro_original, logradouro_normalizado, bairro, tipo_logradouro)
SELECT DISTINCT
  it.logradouro AS logradouro_original,
  cm.logradouro_padrao AS logradouro_normalizado,
  it.bairro,
  CASE 
    WHEN cm.logradouro_padrao ILIKE 'RUA %' THEN 'RUA'
    WHEN cm.logradouro_padrao ILIKE 'AVENIDA %' THEN 'AVENIDA'
    WHEN cm.logradouro_padrao ILIKE 'TRAVESSA %' THEN 'TRAVESSA'
    WHEN cm.logradouro_padrao ILIKE 'ESTRADA %' THEN 'ESTRADA'
    ELSE NULL
  END
FROM itbi_transactions it
JOIN condominios_mapeamento cm 
  ON cm.ativo = true 
  AND cm.logradouro_itbi_normalizado IS NOT NULL
  AND UPPER(TRIM(it.logradouro)) = UPPER(TRIM(cm.logradouro_itbi_normalizado))
WHERE UPPER(TRIM(it.logradouro)) != UPPER(TRIM(cm.logradouro_padrao))
  AND NOT EXISTS (
    SELECT 1 FROM logradouros_normalizacao ln 
    WHERE ln.logradouro_original = it.logradouro
  )
LIMIT 500;

-- PART 3: Clean noise from ruas_internas arrays (remove major public roads)
UPDATE condominios_mapeamento
SET ruas_internas = array_remove(
  array_remove(
    array_remove(
      ruas_internas,
      'AVENIDA DAS AMERICAS'
    ),
    'AV. AYRTON SENNA'
  ),
  'AVENIDA AYRTON SENNA'
)
WHERE ruas_internas IS NOT NULL
  AND (
    'AVENIDA DAS AMERICAS' = ANY(ruas_internas)
    OR 'AV. AYRTON SENNA' = ANY(ruas_internas)
    OR 'AVENIDA AYRTON SENNA' = ANY(ruas_internas)
  );

-- Also remove Av. Afonso Arinos and Av. Gen. Felicíssimo Cardoso
UPDATE condominios_mapeamento
SET ruas_internas = array_remove(
  array_remove(
    array_remove(
      array_remove(
        ruas_internas,
        'AVENIDA AFONSO ARINOS DE MELO FRANCO'
      ),
      'AV. AFONSO ARINOS DE MELO FRANCO'
    ),
    'AVENIDA GENERAL FELICISSIMO CARDOSO'
  ),
  'AV. GENERAL FELICISSIMO CARDOSO'
)
WHERE ruas_internas IS NOT NULL
  AND (
    'AVENIDA AFONSO ARINOS DE MELO FRANCO' = ANY(ruas_internas)
    OR 'AV. AFONSO ARINOS DE MELO FRANCO' = ANY(ruas_internas)
    OR 'AVENIDA GENERAL FELICISSIMO CARDOSO' = ANY(ruas_internas)
    OR 'AV. GENERAL FELICISSIMO CARDOSO' = ANY(ruas_internas)
  );
