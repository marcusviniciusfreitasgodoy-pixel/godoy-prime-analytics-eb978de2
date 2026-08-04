UPDATE itbi_transactions t
SET lat = s.lat,
    lng = s.lng,
    geom = ST_SetSRID(ST_MakePoint(s.lng, s.lat), 4326),
    geocodificado_via = 'google'
FROM itbi_geo_staging s
WHERE t.geom IS NULL
  AND t.logradouro = s.logradouro
  AND t.bairro IS NOT DISTINCT FROM s.bairro;

INSERT INTO logradouros_geo (logradouro, bairro, latitude, longitude, hierarquia, last_sync)
SELECT s.logradouro, COALESCE(s.bairro, 'RIO DE JANEIRO'), s.lat, s.lng, 'GOOGLE', now()
FROM itbi_geo_staging s
ON CONFLICT (logradouro, bairro) DO UPDATE
SET latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    last_sync = now();

DROP TABLE public.itbi_geo_staging;