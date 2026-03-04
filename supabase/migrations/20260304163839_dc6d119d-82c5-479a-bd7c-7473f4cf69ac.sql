
-- RPC 1: Identificar condomínios via lotes PAL
CREATE OR REPLACE FUNCTION identificar_condominios_pal()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lote RECORD;
  edificacoes_count integer;
  iptu_rec RECORD;
  centroid_lat double precision;
  centroid_lng double precision;
  centroid_geom geometry;
  cond_id uuid;
  torres_inseridas integer := 0;
  condominios_inseridos integer := 0;
  condominios_atualizados integer := 0;
  lote_logradouro text;
  lote_numero text;
  nome_gerado text;
BEGIN
  FOR lote IN
    SELECT * FROM lotes_pal WHERE geom IS NOT NULL
  LOOP
    -- Contar edificações dentro do lote
    SELECT COUNT(*)
    INTO edificacoes_count
    FROM edificacoes_geo
    WHERE ST_Within(geom, lote.geom);

    IF edificacoes_count = 0 THEN
      CONTINUE;
    END IF;

    -- Calcular centroid do lote
    centroid_geom := ST_Centroid(lote.geom);
    centroid_lat := ST_Y(centroid_geom);
    centroid_lng := ST_X(centroid_geom);

    -- Dados IPTU do logradouro mais próximo (usando geom do resumo)
    SELECT
      COALESCE(SUM(r.total_imoveis), 0) as iptu_count,
      COALESCE(SUM(r.total_area_construida), 0) as iptu_area_total,
      COALESCE(SUM(r.valor_venal_total), 0) as iptu_valor_total,
      MAX(r.tipologia) as iptu_tipologia,
      MAX(r.logradouro) as iptu_logradouro
    INTO iptu_rec
    FROM iptu_logradouro_resumo r
    WHERE r.geom IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326),
        r.geom,
        0.002
      );

    -- Pular lotes com 1 edificação pequena e poucos imóveis
    IF edificacoes_count = 1
      AND (iptu_rec.iptu_count < 4 OR iptu_rec.iptu_count IS NULL)
    THEN
      DECLARE
        fp numeric;
      BEGIN
        SELECT area_footprint INTO fp
        FROM edificacoes_geo
        WHERE ST_Within(geom, lote.geom)
        LIMIT 1;
        IF fp IS NOT NULL AND fp < 400 THEN
          CONTINUE;
        END IF;
      END;
    END IF;

    -- Gerar nome e logradouro
    lote_logradouro := COALESCE(lote.logradouro, iptu_rec.iptu_logradouro, 'Logradouro não identificado');
    lote_numero := COALESCE(lote.numero, '');
    nome_gerado := 'Condomínio ' || lote_logradouro;
    IF lote_numero <> '' THEN
      nome_gerado := nome_gerado || ' #' || lote_numero;
    END IF;

    -- Verificar se já existe condomínio manual nessa localização
    SELECT id INTO cond_id
    FROM condominios_mapeamento
    WHERE ST_DWithin(
      geom,
      ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326),
      0.0003
    )
    AND fonte_identificacao = 'manual'
    LIMIT 1;

    IF cond_id IS NOT NULL THEN
      -- Enriquecer condomínio manual
      UPDATE condominios_mapeamento SET
        numero_torres = edificacoes_count,
        unidades_estimadas = COALESCE(iptu_rec.iptu_count, 0),
        area_total_construida = iptu_rec.iptu_area_total,
        area_lote = lote.area_lote,
        valor_venal_estimado = iptu_rec.iptu_valor_total,
        tipologia_predominante = iptu_rec.iptu_tipologia,
        geom_lote = lote.geom,
        atualizado_em = now()
      WHERE id = cond_id;

      condominios_atualizados := condominios_atualizados + 1;
    ELSE
      -- Verificar se já existe condomínio algorítmico nessa localização
      SELECT id INTO cond_id
      FROM condominios_mapeamento
      WHERE ST_DWithin(
        geom,
        ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326),
        0.0003
      )
      AND fonte_identificacao IN ('algoritmo_pal', 'algoritmo_dbscan')
      LIMIT 1;

      IF cond_id IS NOT NULL THEN
        -- Atualizar condomínio algorítmico existente
        UPDATE condominios_mapeamento SET
          numero_torres = edificacoes_count,
          unidades_estimadas = COALESCE(iptu_rec.iptu_count, 0),
          area_total_construida = iptu_rec.iptu_area_total,
          area_lote = lote.area_lote,
          valor_venal_estimado = iptu_rec.iptu_valor_total,
          tipologia_predominante = iptu_rec.iptu_tipologia,
          geom_lote = lote.geom,
          atualizado_em = now()
        WHERE id = cond_id;

        condominios_atualizados := condominios_atualizados + 1;
      ELSE
        -- Inserir novo condomínio
        INSERT INTO condominios_mapeamento (
          nome_condominio,
          logradouro_padrao,
          latitude, longitude,
          geom, geom_lote,
          numero_torres,
          unidades_estimadas,
          area_total_construida,
          area_lote,
          valor_venal_estimado,
          tipologia_predominante,
          fonte_identificacao,
          confianca_identificacao
        ) VALUES (
          nome_gerado,
          lote_logradouro,
          centroid_lat,
          centroid_lng,
          ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326),
          lote.geom,
          edificacoes_count,
          COALESCE(iptu_rec.iptu_count, 0),
          iptu_rec.iptu_area_total,
          lote.area_lote,
          iptu_rec.iptu_valor_total,
          iptu_rec.iptu_tipologia,
          'algoritmo_pal',
          0.90
        )
        RETURNING id INTO cond_id;

        condominios_inseridos := condominios_inseridos + 1;
      END IF;
    END IF;

    -- Inserir torres para este condomínio
    INSERT INTO torres_condominios (
      condominio_id,
      edificacao_id,
      numero_torre,
      area_footprint,
      altura,
      andares,
      unidades_estimadas,
      lat, lng,
      geom
    )
    SELECT
      cond_id,
      e.id,
      ROW_NUMBER() OVER (ORDER BY e.area_footprint DESC),
      e.area_footprint,
      e.altura_max,
      e.andares_estimados,
      CASE
        WHEN e.andares_estimados IS NOT NULL AND e.area_footprint IS NOT NULL
          THEN GREATEST(1, ROUND((e.area_footprint * 0.70 / 90.0) * e.andares_estimados))::integer
        WHEN e.area_footprint > 800
          THEN (ROUND(e.area_footprint * 0.70 / 90.0) * 8)::integer
        ELSE 1
      END,
      e.lat, e.lng,
      ST_Centroid(e.geom)
    FROM edificacoes_geo e
    WHERE ST_Within(e.geom, lote.geom)
    ON CONFLICT DO NOTHING;

    torres_inseridas := torres_inseridas + (
      SELECT COUNT(*) FROM torres_condominios WHERE condominio_id = cond_id
    );

  END LOOP;

  RETURN jsonb_build_object(
    'condominios_inseridos', condominios_inseridos,
    'condominios_atualizados', condominios_atualizados,
    'torres_inseridas', torres_inseridas
  );
END;
$$;

-- RPC 2: Enriquecer condominios com ITBI (match por logradouro texto)
CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      AVG(
        CASE WHEN t.area_m2 > 0
          THEN t.valor_transacao / t.area_m2
          ELSE NULL
        END
      ) as preco_medio_m2,
      MAX(t.data_transacao) as ultima_transacao
    FROM condominios_mapeamento c2
    JOIN itbi_transactions t
      ON UPPER(TRIM(t.logradouro)) = UPPER(TRIM(c2.logradouro_padrao))
    WHERE t.data_transacao >= (NOW() - INTERVAL '5 years')::text
    GROUP BY c2.id
  ) sub
  WHERE c.id = sub.id;

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object('condominios_com_itbi', atualizados);
END;
$$;

-- RPC 3: Atualizar resumo logradouros com preço real ITBI
CREATE OR REPLACE FUNCTION atualizar_resumo_logradouros()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      t.logradouro,
      AVG(CASE WHEN t.area_m2 > 0 THEN t.valor_transacao / t.area_m2 ELSE NULL END) as preco_medio,
      SUM(t.total_transacoes) as total
    FROM itbi_transactions t
    GROUP BY t.logradouro
  ) sub
  WHERE UPPER(TRIM(r.logradouro)) = UPPER(TRIM(sub.logradouro));

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object('logradouros_atualizados', atualizados);
END;
$$;
