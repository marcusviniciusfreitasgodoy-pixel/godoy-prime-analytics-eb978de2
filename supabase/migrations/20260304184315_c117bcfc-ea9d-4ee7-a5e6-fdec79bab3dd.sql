
-- P1.5: Fix "Logradouro não identificado" entries
UPDATE condominios_mapeamento c
SET logradouro_padrao = sub.logradouro
FROM (
  SELECT DISTINCT ON (c2.id)
    c2.id,
    r.logradouro
  FROM condominios_mapeamento c2
  JOIN iptu_logradouro_resumo r
    ON ST_DWithin(
      ST_SetSRID(ST_MakePoint(c2.longitude, c2.latitude), 4326)::geography,
      ST_Centroid(r.geom)::geography,
      300
    )
  WHERE c2.logradouro_padrao = 'Logradouro não identificado'
    AND r.geom IS NOT NULL
    AND c2.latitude IS NOT NULL
    AND c2.longitude IS NOT NULL
  ORDER BY c2.id,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(c2.longitude, c2.latitude), 4326)::geography,
      ST_Centroid(r.geom)::geography
    ) ASC
) sub
WHERE c.id = sub.id;

-- Rename remaining to more honest label
UPDATE condominios_mapeamento
SET logradouro_padrao = 'Endereço não identificado'
WHERE logradouro_padrao = 'Logradouro não identificado';
