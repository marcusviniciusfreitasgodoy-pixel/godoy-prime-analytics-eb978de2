WITH g AS (
  SELECT normalizar_logradouro(logradouro) AS ln, upper(bairro) AS bn,
         avg(latitude)::double precision AS lat, avg(longitude)::double precision AS lng
  FROM logradouros_geo
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  GROUP BY 1,2
)
UPDATE itbi_transactions t
SET lat = g.lat,
    lng = g.lng,
    geom = ST_SetSRID(ST_MakePoint(g.lng, g.lat), 4326),
    geocodificado_via = 'logradouros_geo'
FROM g
WHERE t.geom IS NULL
  AND t.logradouro_norm = g.ln
  AND upper(t.bairro) = g.bn;

WITH g AS (
  SELECT normalizar_logradouro(logradouro) AS ln,
         avg(latitude)::double precision AS lat, avg(longitude)::double precision AS lng
  FROM logradouros_geo
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  GROUP BY 1
  HAVING count(DISTINCT upper(bairro)) = 1
)
UPDATE itbi_transactions t
SET lat = g.lat,
    lng = g.lng,
    geom = ST_SetSRID(ST_MakePoint(g.lng, g.lat), 4326),
    geocodificado_via = 'logradouros_geo_fallback'
FROM g
WHERE t.geom IS NULL
  AND t.logradouro_norm = g.ln;