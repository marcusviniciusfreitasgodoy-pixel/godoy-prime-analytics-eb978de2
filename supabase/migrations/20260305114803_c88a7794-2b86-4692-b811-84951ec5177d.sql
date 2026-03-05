
-- STEP 1: Staging table for IPTU 2025 CSV data
CREATE TABLE IF NOT EXISTS iptu_2025_logradouro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objectid integer,
  cl text,
  nome_completo text,
  area_plane text,
  cod_rp text,
  rp text,
  codra text,
  regiao_adm text,
  cb_imovel text,
  nome text,
  tributacao text,
  tipologia text,
  tot_imoveis integer,
  areaconst_res integer,
  exercicio integer,
  area_media_unidade numeric GENERATED ALWAYS AS (
    CASE WHEN tot_imoveis > 0
      THEN ROUND((areaconst_res::numeric / tot_imoveis), 1)
      ELSE NULL
    END
  ) STORED,
  importado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iptu2025_cl ON iptu_2025_logradouro(cl);
CREATE INDEX IF NOT EXISTS idx_iptu2025_regiao ON iptu_2025_logradouro(regiao_adm);
CREATE INDEX IF NOT EXISTS idx_iptu2025_tipologia ON iptu_2025_logradouro(tipologia);

ALTER TABLE iptu_2025_logradouro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica iptu_2025"
  ON iptu_2025_logradouro FOR SELECT USING (true);

CREATE POLICY "Admin pode inserir iptu_2025"
  ON iptu_2025_logradouro FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar iptu_2025"
  ON iptu_2025_logradouro FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- STEP 2: Add columns to existing tables
ALTER TABLE iptu_logradouro_resumo
  ADD COLUMN IF NOT EXISTS nome_completo_oficial text,
  ADD COLUMN IF NOT EXISTS area_media_unidade numeric,
  ADD COLUMN IF NOT EXISTS tot_imoveis_oficial integer,
  ADD COLUMN IF NOT EXISTS areaconst_res_oficial integer;

ALTER TABLE condominios_mapeamento
  ADD COLUMN IF NOT EXISTS area_media_unidade_logradouro numeric;

-- STEP 3: RPC to process IPTU 2025 data
CREATE OR REPLACE FUNCTION processar_iptu_2025()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  logradouros_atualizados integer;
  condominios_atualizados integer;
  comerciais_inseridos integer;
  unidades_corrigidas integer;
BEGIN
  -- Enrich iptu_logradouro_resumo with residential APARTMENT data
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

  -- Propagate area_media to condominios
  UPDATE condominios_mapeamento c
  SET
    area_media_unidade_logradouro = r.area_media_unidade,
    atualizado_em = now()
  FROM iptu_logradouro_resumo r
  WHERE normalizar_logradouro(c.logradouro_padrao) = r.logradouro_norm
    AND r.area_media_unidade IS NOT NULL;
  GET DIAGNOSTICS condominios_atualizados = ROW_COUNT;

  -- Count divergences >20%
  SELECT COUNT(*) INTO unidades_corrigidas
  FROM condominios_mapeamento c
  JOIN iptu_logradouro_resumo r
    ON normalizar_logradouro(c.logradouro_padrao) = r.logradouro_norm
  WHERE r.tot_imoveis_oficial IS NOT NULL
    AND c.unidades_estimadas > 0
    AND ABS(c.unidades_estimadas - r.tot_imoveis_oficial)
        / NULLIF(r.tot_imoveis_oficial::numeric, 0) > 0.20;

  -- Insert commercial logradouros not yet in resumo
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
