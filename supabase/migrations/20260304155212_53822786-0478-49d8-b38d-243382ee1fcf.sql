
-- ============================================================
-- CORREÇÃO: Adicionar colunas faltantes + RPCs atualizadas
-- ============================================================

-- 1. iptu_logradouro_resumo: adicionar cod_logradouro
ALTER TABLE iptu_logradouro_resumo ADD COLUMN IF NOT EXISTS cod_logradouro text;

-- 2. lotes_pal: adicionar colunas para GeoPAL
ALTER TABLE lotes_pal ADD COLUMN IF NOT EXISTS objectid_origem integer;
ALTER TABLE lotes_pal ADD COLUMN IF NOT EXISTS paa text;
ALTER TABLE lotes_pal ADD COLUMN IF NOT EXISTS tipo_parcelamento text;
ALTER TABLE lotes_pal ADD COLUMN IF NOT EXISTS situacao text;

-- Unique constraint em objectid_origem (DROP IF EXISTS para segurança)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_pal_objectid_origem_unique'
  ) THEN
    ALTER TABLE lotes_pal ADD CONSTRAINT lotes_pal_objectid_origem_unique UNIQUE (objectid_origem);
  END IF;
END $$;

-- 3. edificacoes_geo: adicionar colunas para Edificacoes_2019
ALTER TABLE edificacoes_geo ADD COLUMN IF NOT EXISTS cod_lote text;
ALTER TABLE edificacoes_geo ADD COLUMN IF NOT EXISTS tipo_edificacao text;
ALTER TABLE edificacoes_geo ADD COLUMN IF NOT EXISTS cota_base numeric;
ALTER TABLE edificacoes_geo ADD COLUMN IF NOT EXISTS cota_topo numeric;

-- ============================================================
-- RPC: Upsert IPTU logradouro resumo (agregado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_iptu_logradouro_resumo(
  p_logradouro text,
  p_bairro text,
  p_tipologia text,
  p_total_imoveis integer,
  p_total_area_construida numeric,
  p_cod_logradouro text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO iptu_logradouro_resumo (
    logradouro, bairro, tipologia, total_imoveis, total_area_construida, cod_logradouro, atualizado_em
  ) VALUES (
    p_logradouro, p_bairro, p_tipologia, p_total_imoveis, p_total_area_construida, p_cod_logradouro, now()
  )
  ON CONFLICT (logradouro, bairro, tipologia) DO UPDATE SET
    total_imoveis = EXCLUDED.total_imoveis,
    total_area_construida = EXCLUDED.total_area_construida,
    cod_logradouro = COALESCE(EXCLUDED.cod_logradouro, iptu_logradouro_resumo.cod_logradouro),
    atualizado_em = now();
END;
$$;

-- ============================================================
-- RPC: Upsert lote PAL (atualizada para GeoPAL)
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_lote_pal(
  p_objectid_origem integer,
  p_num_contribuinte text DEFAULT NULL,
  p_logradouro text DEFAULT NULL,
  p_numero text DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_area_lote numeric DEFAULT NULL,
  p_paa text DEFAULT NULL,
  p_tipo_parcelamento text DEFAULT NULL,
  p_situacao text DEFAULT NULL,
  p_geojson text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO lotes_pal (
    objectid_origem, num_contribuinte, logradouro, numero, bairro,
    area_lote, paa, tipo_parcelamento, situacao, geom, importado_em
  ) VALUES (
    p_objectid_origem, p_num_contribuinte, p_logradouro, p_numero, p_bairro,
    p_area_lote, p_paa, p_tipo_parcelamento, p_situacao,
    CASE WHEN p_geojson IS NOT NULL
      THEN ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
      ELSE NULL
    END,
    now()
  )
  ON CONFLICT (objectid_origem) DO UPDATE SET
    num_contribuinte = COALESCE(EXCLUDED.num_contribuinte, lotes_pal.num_contribuinte),
    logradouro = COALESCE(EXCLUDED.logradouro, lotes_pal.logradouro),
    numero = COALESCE(EXCLUDED.numero, lotes_pal.numero),
    bairro = COALESCE(EXCLUDED.bairro, lotes_pal.bairro),
    area_lote = COALESCE(EXCLUDED.area_lote, lotes_pal.area_lote),
    paa = COALESCE(EXCLUDED.paa, lotes_pal.paa),
    tipo_parcelamento = COALESCE(EXCLUDED.tipo_parcelamento, lotes_pal.tipo_parcelamento),
    situacao = COALESCE(EXCLUDED.situacao, lotes_pal.situacao),
    geom = CASE WHEN p_geojson IS NOT NULL
      THEN ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
      ELSE lotes_pal.geom
    END,
    importado_em = now();
END;
$$;

-- ============================================================
-- RPC: Upsert edificacao geo (atualizada para Edificacoes_2019)
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_edificacao_geo(
  p_objectid integer,
  p_altura_max numeric DEFAULT NULL,
  p_andares integer DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_geojson text DEFAULT NULL,
  p_cod_lote text DEFAULT NULL,
  p_tipo_edificacao text DEFAULT NULL,
  p_cota_base numeric DEFAULT NULL,
  p_cota_topo numeric DEFAULT NULL,
  p_area numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO edificacoes_geo (
    objectid_origem, altura_max, andares_estimados, area_footprint,
    lat, lng, geom, cod_lote, tipo_edificacao, cota_base, cota_topo, importado_em
  ) VALUES (
    p_objectid, p_altura_max, p_andares, p_area,
    p_lat, p_lng,
    CASE WHEN p_geojson IS NOT NULL
      THEN ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
      ELSE CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
        ELSE NULL
      END
    END,
    p_cod_lote, p_tipo_edificacao, p_cota_base, p_cota_topo, now()
  )
  ON CONFLICT (objectid_origem) DO UPDATE SET
    altura_max = COALESCE(EXCLUDED.altura_max, edificacoes_geo.altura_max),
    andares_estimados = COALESCE(EXCLUDED.andares_estimados, edificacoes_geo.andares_estimados),
    area_footprint = COALESCE(EXCLUDED.area_footprint, edificacoes_geo.area_footprint),
    lat = COALESCE(EXCLUDED.lat, edificacoes_geo.lat),
    lng = COALESCE(EXCLUDED.lng, edificacoes_geo.lng),
    geom = CASE WHEN p_geojson IS NOT NULL
      THEN ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
      ELSE COALESCE(edificacoes_geo.geom, CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
        ELSE NULL
      END)
    END,
    cod_lote = COALESCE(EXCLUDED.cod_lote, edificacoes_geo.cod_lote),
    tipo_edificacao = COALESCE(EXCLUDED.tipo_edificacao, edificacoes_geo.tipo_edificacao),
    cota_base = COALESCE(EXCLUDED.cota_base, edificacoes_geo.cota_base),
    cota_topo = COALESCE(EXCLUDED.cota_topo, edificacoes_geo.cota_topo),
    importado_em = now();
END;
$$;

-- ============================================================
-- RPC: Calcular area_footprint via PostGIS (SIRGAS 2000 UTM 23S)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_footprint_areas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE edificacoes_geo
  SET area_footprint = ST_Area(ST_Transform(geom::geometry, 31983))
  WHERE area_footprint IS NULL AND geom IS NOT NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  UPDATE edificacoes_geo
  SET
    lat = ST_Y(ST_Centroid(geom::geometry)),
    lng = ST_X(ST_Centroid(geom::geometry))
  WHERE lat IS NULL AND geom IS NOT NULL;
  
  RETURN updated_count;
END;
$$;

-- ============================================================
-- RPC: Calcular area_lote via PostGIS para lotes_pal
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_lote_areas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE lotes_pal
  SET area_lote = ST_Area(ST_Transform(geom::geometry, 31983))
  WHERE area_lote IS NULL AND geom IS NOT NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
