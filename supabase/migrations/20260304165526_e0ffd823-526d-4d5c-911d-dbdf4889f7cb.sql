-- CORRECTION 1b: UNIQUE constraint on torres_condominios
ALTER TABLE torres_condominios
  ADD CONSTRAINT uq_torre_condominio_edificacao
  UNIQUE (condominio_id, edificacao_id);

-- CORRECTION 1c + 2: Updated RPCs and normalization

-- normalizar_logradouro function
CREATE OR REPLACE FUNCTION normalizar_logradouro(texto text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF texto IS NULL THEN RETURN NULL; END IF;
  RETURN UPPER(
    TRIM(
      TRANSLATE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(
          UPPER(TRIM(texto)),
        'AV.', 'AV'),
        'AVN ', 'AV '),
        'AVENIDA ', 'AV '),
        'R.', 'RUA'),
        'AL.', 'ALA'),
        'EST.', 'EST'),
        'ESTR.', 'EST'),
        'ESTRADA ', 'EST '),
        'TV.', 'TV'),
        'PCA', 'PRACA'),
        'PC.', 'PRACA'),
        'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
        'AAAAAAEEEEIIIIOOOOOUUUUC'
      )
    )
  );
END;
$$;

-- Generated columns + indexes
ALTER TABLE iptu_logradouro_resumo
  ADD COLUMN IF NOT EXISTS logradouro_norm text
  GENERATED ALWAYS AS (normalizar_logradouro(logradouro)) STORED;

ALTER TABLE itbi_transactions
  ADD COLUMN IF NOT EXISTS logradouro_norm text
  GENERATED ALWAYS AS (normalizar_logradouro(logradouro)) STORED;

CREATE INDEX IF NOT EXISTS idx_iptu_logradouro_norm
  ON iptu_logradouro_resumo(logradouro_norm);

CREATE INDEX IF NOT EXISTS idx_itbi_logradouro_norm
  ON itbi_transactions(logradouro_norm);

-- Rewrite identificar_condominios_pal with upsert
CREATE OR REPLACE FUNCTION identificar_condominios_pal()
RETURNS jsonb
LANGUAGE plpgsql
SET statement_timeout = '300s'
AS $$
DECLARE
  lote RECORD;
  edif_count integer;
  iptu_row RECORD;
  nearest_logradouro text;
  centroid_lat double precision;
  centroid_lng double precision;
  cond_id uuid;
  torres_inseridas integer := 0;
  condominios_inseridos integer := 0;
  condominios_atualizados integer := 0;
  lotes_processados integer := 0;
  lotes_pulados integer := 0;
  valid_geom geometry;
  rows_affected integer;
  small_fp numeric;
BEGIN
  FOR lote IN
    SELECT * FROM lotes_pal WHERE geom IS NOT NULL
  LOOP
    BEGIN
      valid_geom := ST_MakeValid(lote.geom);
      IF valid_geom IS NULL OR ST_IsEmpty(valid_geom) THEN
        lotes_pulados := lotes_pulados + 1;
        CONTINUE;
      END IF;
      valid_geom := ST_Buffer(valid_geom, 0);
      IF valid_geom IS NULL OR ST_IsEmpty(valid_geom) THEN
        lotes_pulados := lotes_pulados + 1;
        CONTINUE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      lotes_pulados := lotes_pulados + 1;
      CONTINUE;
    END;

    lotes_processados := lotes_processados + 1;

    BEGIN
      SELECT COUNT(*) INTO edif_count
      FROM edificacoes_geo e
      WHERE e.geom IS NOT NULL
        AND e.geom && valid_geom
        AND ST_Intersects(e.geom, valid_geom);
    EXCEPTION WHEN OTHERS THEN
      lotes_pulados := lotes_pulados + 1;
      CONTINUE;
    END;

    IF edif_count = 0 THEN
      CONTINUE;
    END IF;

    centroid_lat := ST_Y(ST_Centroid(valid_geom));
    centroid_lng := ST_X(ST_Centroid(valid_geom));

    SELECT
      r.logradouro,
      COALESCE(r.total_imoveis, 0) as total_imoveis,
      COALESCE(r.total_area_construida, 0) as total_area_construida,
      COALESCE(r.valor_venal_total, 0) as valor_venal_total,
      r.tipologia
    INTO iptu_row
    FROM iptu_logradouro_resumo r
    WHERE r.geom IS NOT NULL
      AND r.geom && ST_Expand(valid_geom, 0.01)
    ORDER BY ST_Distance(ST_Centroid(valid_geom), r.geom)
    LIMIT 1;

    IF iptu_row IS NULL THEN
      SELECT
        r.logradouro,
        COALESCE(r.total_imoveis, 0) as total_imoveis,
        COALESCE(r.total_area_construida, 0) as total_area_construida,
        COALESCE(r.valor_venal_total, 0) as valor_venal_total,
        r.tipologia
      INTO iptu_row
      FROM iptu_logradouro_resumo r
      WHERE r.geom IS NOT NULL
      ORDER BY ST_Distance(ST_Centroid(valid_geom), r.geom)
      LIMIT 1;
    END IF;

    IF edif_count = 1 AND (iptu_row IS NULL OR iptu_row.total_imoveis < 4) THEN
      BEGIN
        SELECT e.area_footprint INTO small_fp
        FROM edificacoes_geo e
        WHERE e.geom IS NOT NULL
          AND e.geom && valid_geom
          AND ST_Intersects(e.geom, valid_geom)
        LIMIT 1;
        IF small_fp IS NOT NULL AND small_fp < 400 THEN
          CONTINUE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        CONTINUE;
      END;
    END IF;

    nearest_logradouro := COALESCE(iptu_row.logradouro, lote.logradouro, 'Logradouro não identificado');

    SELECT id INTO cond_id
    FROM condominios_mapeamento
    WHERE geom IS NOT NULL
      AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326), 0.0003)
      AND fonte_identificacao NOT IN ('algoritmo_pal', 'algoritmo_dbscan')
    LIMIT 1;

    IF cond_id IS NOT NULL THEN
      UPDATE condominios_mapeamento SET
        numero_torres = edif_count,
        unidades_estimadas = COALESCE(iptu_row.total_imoveis, 0),
        area_total_construida = COALESCE(iptu_row.total_area_construida, 0),
        area_lote = lote.area_lote,
        valor_venal_estimado = COALESCE(iptu_row.valor_venal_total, 0),
        tipologia_predominante = iptu_row.tipologia,
        geom_lote = valid_geom,
        atualizado_em = now()
      WHERE id = cond_id;
      condominios_atualizados := condominios_atualizados + 1;
    ELSE
      SELECT id INTO cond_id
      FROM condominios_mapeamento
      WHERE geom IS NOT NULL
        AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326), 0.0003)
        AND fonte_identificacao IN ('algoritmo_pal', 'algoritmo_dbscan')
      LIMIT 1;

      IF cond_id IS NOT NULL THEN
        UPDATE condominios_mapeamento SET
          numero_torres = edif_count,
          unidades_estimadas = COALESCE(iptu_row.total_imoveis, 0),
          area_total_construida = COALESCE(iptu_row.total_area_construida, 0),
          area_lote = lote.area_lote,
          valor_venal_estimado = COALESCE(iptu_row.valor_venal_total, 0),
          tipologia_predominante = iptu_row.tipologia,
          geom_lote = valid_geom,
          atualizado_em = now()
        WHERE id = cond_id;
        condominios_atualizados := condominios_atualizados + 1;
      ELSE
        INSERT INTO condominios_mapeamento (
          nome_condominio, logradouro_padrao,
          latitude, longitude, geom, geom_lote,
          numero_torres, unidades_estimadas, area_total_construida,
          area_lote, valor_venal_estimado, tipologia_predominante,
          fonte_identificacao, confianca_identificacao
        ) VALUES (
          'Condomínio ' || nearest_logradouro || COALESCE(' #' || lote.numero, ''),
          nearest_logradouro, centroid_lat, centroid_lng,
          ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326),
          valid_geom, edif_count,
          COALESCE(iptu_row.total_imoveis, 0),
          COALESCE(iptu_row.total_area_construida, 0),
          lote.area_lote,
          COALESCE(iptu_row.valor_venal_total, 0),
          iptu_row.tipologia, 'algoritmo_pal', 0.90
        )
        RETURNING id INTO cond_id;
        condominios_inseridos := condominios_inseridos + 1;
      END IF;
    END IF;

    -- Insert torres with UPSERT
    BEGIN
      INSERT INTO torres_condominios (
        condominio_id, edificacao_id, numero_torre,
        area_footprint, altura, andares, unidades_estimadas,
        lat, lng, geom
      )
      SELECT
        cond_id, e.id,
        ROW_NUMBER() OVER (ORDER BY e.area_footprint DESC),
        e.area_footprint, e.altura_max, e.andares_estimados,
        CASE
          WHEN e.andares_estimados IS NOT NULL AND e.area_footprint IS NOT NULL
            THEN GREATEST(1, ROUND((e.area_footprint * 0.70 / 90.0) * e.andares_estimados))
          WHEN e.area_footprint > 800
            THEN ROUND(e.area_footprint * 0.70 / 90.0) * 8
          ELSE 1
        END,
        e.lat, e.lng, ST_Centroid(e.geom)
      FROM edificacoes_geo e
      WHERE e.geom IS NOT NULL
        AND e.geom && valid_geom
        AND ST_Intersects(e.geom, valid_geom)
      ON CONFLICT ON CONSTRAINT uq_torre_condominio_edificacao
      DO UPDATE SET
        area_footprint = EXCLUDED.area_footprint,
        altura = EXCLUDED.altura,
        andares = EXCLUDED.andares,
        unidades_estimadas = EXCLUDED.unidades_estimadas,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        geom = EXCLUDED.geom;

      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      torres_inseridas := torres_inseridas + rows_affected;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'condominios_inseridos', condominios_inseridos,
    'condominios_atualizados', condominios_atualizados,
    'torres_inseridas', torres_inseridas,
    'lotes_processados', lotes_processados,
    'lotes_pulados', lotes_pulados
  );
END;
$$;

-- Rewrite atualizar_resumo_logradouros with normalized matching
CREATE OR REPLACE FUNCTION atualizar_resumo_logradouros()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  atualizados integer;
BEGIN
  UPDATE iptu_logradouro_resumo r
  SET
    preco_real_medio_itbi = sub.preco_medio,
    total_transacoes_itbi = sub.total,
    desconto_venal_percentual = CASE
      WHEN r.valor_venal_medio > 0 AND sub.preco_medio > 0
        THEN ROUND(
          ((sub.preco_medio - r.valor_venal_medio)
           / r.valor_venal_medio * 100)::numeric, 1
        )
      ELSE NULL
    END,
    atualizado_em = now()
  FROM (
    SELECT
      t.logradouro_norm,
      AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END) as preco_medio,
      SUM(t.total_transacoes) as total
    FROM itbi_transactions t
    WHERE t.logradouro_norm IS NOT NULL
    GROUP BY t.logradouro_norm
  ) sub
  WHERE r.logradouro_norm = sub.logradouro_norm;

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object('logradouros_atualizados', atualizados);
END;
$$;

-- Rewrite enriquecer_condominios_com_itbi with normalized matching
CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  atualizados integer;
BEGIN
  UPDATE condominios_mapeamento c
  SET
    total_transacoes_itbi = sub.total,
    preco_medio_m2 = sub.preco_medio_m2,
    ultima_transacao_itbi = sub.ultima_transacao,
    atualizado_em = now()
  FROM (
    SELECT
      c2.id,
      SUM(t.total_transacoes) as total,
      ROUND(
        AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END)
      ::numeric, 2) as preco_medio_m2,
      MAX(t.data_transacao) as ultima_transacao
    FROM condominios_mapeamento c2
    JOIN itbi_transactions t
      ON normalizar_logradouro(c2.logradouro_padrao) = t.logradouro_norm
    WHERE t.data_transacao >= (CURRENT_DATE - INTERVAL '5 years')::date
    GROUP BY c2.id
    HAVING SUM(t.total_transacoes) >= 1
  ) sub
  WHERE c.id = sub.id;

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object('condominios_com_itbi', atualizados);
END;
$$