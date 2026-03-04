
-- RPC: Upsert IPTU imovel with PostGIS point geometry
CREATE OR REPLACE FUNCTION public.upsert_iptu_imovel(
  p_inscricao text,
  p_logradouro text,
  p_numero text,
  p_complemento text,
  p_bairro text,
  p_tipologia text,
  p_cod_logradouro text,
  p_valor_venal numeric,
  p_area_terreno numeric,
  p_area_construida numeric,
  p_lat double precision,
  p_lng double precision,
  p_fonte text DEFAULT 'prefeitura_arcgis'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO iptu_imoveis (
    inscricao_municipal, logradouro, numero, complemento, bairro,
    tipologia, cod_logradouro, valor_venal, area_terreno, area_construida,
    lat, lng, geom, fonte, importado_em
  ) VALUES (
    p_inscricao, p_logradouro, p_numero, p_complemento, p_bairro,
    p_tipologia, p_cod_logradouro, p_valor_venal, p_area_terreno, p_area_construida,
    p_lat, p_lng,
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
      ELSE NULL
    END,
    p_fonte, now()
  )
  ON CONFLICT (inscricao_municipal) DO UPDATE SET
    logradouro = EXCLUDED.logradouro,
    numero = EXCLUDED.numero,
    complemento = EXCLUDED.complemento,
    bairro = EXCLUDED.bairro,
    tipologia = EXCLUDED.tipologia,
    cod_logradouro = EXCLUDED.cod_logradouro,
    valor_venal = EXCLUDED.valor_venal,
    area_terreno = EXCLUDED.area_terreno,
    area_construida = EXCLUDED.area_construida,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    geom = EXCLUDED.geom,
    fonte = EXCLUDED.fonte,
    importado_em = now();
END;
$$;

-- RPC: Update IPTU geom from Google geocoding
CREATE OR REPLACE FUNCTION public.update_iptu_geom(
  p_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE iptu_imoveis SET
    lat = p_lat,
    lng = p_lng,
    geom = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    geocodificado_via = 'google_maps'
  WHERE id = p_id;
END;
$$;

-- RPC: Upsert lote PAL with polygon geometry from GeoJSON
CREATE OR REPLACE FUNCTION public.upsert_lote_pal(
  p_num_contribuinte text,
  p_logradouro text,
  p_numero text,
  p_bairro text,
  p_area_lote numeric,
  p_geojson text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO lotes_pal (
    num_contribuinte, logradouro, numero, bairro, area_lote, geom, importado_em
  ) VALUES (
    p_num_contribuinte, p_logradouro, p_numero, p_bairro, p_area_lote,
    CASE WHEN p_geojson IS NOT NULL
      THEN ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
      ELSE NULL
    END,
    now()
  )
  ON CONFLICT (num_contribuinte) DO UPDATE SET
    logradouro = EXCLUDED.logradouro,
    numero = EXCLUDED.numero,
    bairro = EXCLUDED.bairro,
    area_lote = EXCLUDED.area_lote,
    geom = EXCLUDED.geom,
    importado_em = now();
END;
$$;

-- RPC: Upsert edificacao with polygon geometry and centroid
CREATE OR REPLACE FUNCTION public.upsert_edificacao_geo(
  p_objectid integer,
  p_area numeric,
  p_altura_max numeric,
  p_andares integer,
  p_lat double precision,
  p_lng double precision,
  p_geojson text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO edificacoes_geo (
    objectid_origem, area_footprint, altura_max, andares_estimados,
    lat, lng, geom, importado_em
  ) VALUES (
    p_objectid, p_area, p_altura_max, p_andares,
    p_lat, p_lng,
    CASE WHEN p_geojson IS NOT NULL
      THEN ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
      ELSE CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
        ELSE NULL
      END
    END,
    now()
  )
  ON CONFLICT (objectid_origem) DO UPDATE SET
    area_footprint = EXCLUDED.area_footprint,
    altura_max = EXCLUDED.altura_max,
    andares_estimados = EXCLUDED.andares_estimados,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    geom = EXCLUDED.geom,
    importado_em = now();
END;
$$;

-- Add unique constraints needed for upserts
ALTER TABLE iptu_imoveis ADD CONSTRAINT iptu_imoveis_inscricao_unique UNIQUE (inscricao_municipal);
ALTER TABLE lotes_pal ADD CONSTRAINT lotes_pal_num_contribuinte_unique UNIQUE (num_contribuinte);
ALTER TABLE edificacoes_geo ADD CONSTRAINT edificacoes_geo_objectid_unique UNIQUE (objectid_origem);
