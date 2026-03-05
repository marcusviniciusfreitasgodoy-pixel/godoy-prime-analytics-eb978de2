CREATE OR REPLACE FUNCTION processar_iptu_2025()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  logradouros_atualizados integer;
  condominios_atualizados integer;
  comerciais_inseridos integer;
  unidades_corrigidas integer;
BEGIN
  UPDATE iptu_logradouro_resumo r
  SET
    nome_completo_oficial = i.nome_completo,
    area_media_unidade = i.area_media_unidade,
    tot_imoveis_oficial = i.tot_imoveis,
    areaconst_res_oficial = i.areaconst_res,
    total_imoveis = CASE
      WHEN i.tributacao = 'R' THEN i.tot_imoveis
      ELSE r.total_imoveis
    END,
    atualizado_em = now()
  FROM (
    SELECT DISTINCT ON (cl)
      cl, nome_completo, area_media_unidade,
      tot_imoveis, areaconst_res, tributacao
    FROM iptu_2025_logradouro
    WHERE tipologia ILIKE '%APARTAMENTO%'
    ORDER BY cl, tot_imoveis DESC
  ) i
  WHERE r.cod_logradouro = i.cl;
  GET DIAGNOSTICS logradouros_atualizados = ROW_COUNT;

  UPDATE condominios_mapeamento c
  SET
    area_media_unidade_logradouro = r.area_media_unidade,
    atualizado_em = now()
  FROM iptu_logradouro_resumo r
  WHERE normalizar_logradouro(c.logradouro_padrao) = r.logradouro_norm
    AND r.area_media_unidade IS NOT NULL;
  GET DIAGNOSTICS condominios_atualizados = ROW_COUNT;

  SELECT COUNT(*) INTO unidades_corrigidas
  FROM condominios_mapeamento c
  JOIN iptu_logradouro_resumo r
    ON normalizar_logradouro(c.logradouro_padrao) = r.logradouro_norm
  WHERE r.tot_imoveis_oficial IS NOT NULL
    AND c.unidades_estimadas > 0
    AND ABS(c.unidades_estimadas - r.tot_imoveis_oficial)
        / NULLIF(r.tot_imoveis_oficial::numeric, 0) > 0.20;

  -- CORRIGIDO: filtro por região da Barra
  INSERT INTO iptu_logradouro_resumo
    (cod_logradouro, logradouro, bairro, tipologia,
     total_imoveis, total_area_construida,
     nome_completo_oficial, tot_imoveis_oficial)
  SELECT
    i.cl,
    i.nome_completo,
    TRIM(i.nome),
    TRIM(i.tipologia),
    i.tot_imoveis,
    i.areaconst_res,
    i.nome_completo,
    i.tot_imoveis
  FROM iptu_2025_logradouro i
  WHERE i.tributacao = 'N'
    AND TRIM(i.tipologia) IN ('SALA', 'LOJA', 'LOJA SHOPPING')
    AND (
      i.regiao_adm ILIKE '%BARRA%'
      OR i.regiao_adm ILIKE '%RECREIO%'
      OR i.regiao_adm ILIKE '%JACAREPAGUA%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM iptu_logradouro_resumo r
      WHERE r.cod_logradouro = i.cl
    )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS comerciais_inseridos = ROW_COUNT;

  RETURN jsonb_build_object(
    'logradouros_residenciais_enriquecidos', logradouros_atualizados,
    'condominios_com_area_media', condominios_atualizados,
    'condominios_com_divergencia_20pct', unidades_corrigidas,
    'logradouros_comerciais_inseridos', comerciais_inseridos
  );
END;
$$;