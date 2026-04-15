
-- 1. Atualizar logradouros_geo com coordenadas de condominios_mapeamento (logradouro_padrao) - INCLUI GOOGLE
UPDATE public.logradouros_geo lg
SET 
  latitude = cm.latitude,
  longitude = cm.longitude,
  hierarquia = 'CONDOMINIO',
  last_sync = now()
FROM public.condominios_mapeamento cm
WHERE cm.ativo = true
  AND cm.latitude IS NOT NULL
  AND cm.longitude IS NOT NULL
  AND UPPER(lg.logradouro) = UPPER(cm.logradouro_padrao);

-- 2. Atualizar logradouros_geo com coordenadas de condominios_mapeamento (ruas_internas)
UPDATE public.logradouros_geo lg
SET 
  latitude = cm.latitude,
  longitude = cm.longitude,
  hierarquia = 'CONDOMINIO',
  last_sync = now()
FROM public.condominios_mapeamento cm
WHERE cm.ativo = true
  AND cm.latitude IS NOT NULL
  AND cm.longitude IS NOT NULL
  AND lg.hierarquia != 'CONDOMINIO'
  AND UPPER(lg.logradouro) = ANY(
    SELECT UPPER(unnest(cm.ruas_internas))
  );

-- 3. Atualizar logradouros_geo com coordenadas de condominios_mapeamento (logradouro_itbi_normalizado)
UPDATE public.logradouros_geo lg
SET 
  latitude = cm.latitude,
  longitude = cm.longitude,
  hierarquia = 'CONDOMINIO',
  last_sync = now()
FROM public.condominios_mapeamento cm
WHERE cm.ativo = true
  AND cm.latitude IS NOT NULL
  AND cm.longitude IS NOT NULL
  AND cm.logradouro_itbi_normalizado IS NOT NULL
  AND lg.hierarquia != 'CONDOMINIO'
  AND UPPER(lg.logradouro) = UPPER(cm.logradouro_itbi_normalizado);
