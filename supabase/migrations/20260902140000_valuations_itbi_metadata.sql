-- Rastreabilidade do motor de avaliação (Fase 1 da auditoria).
-- Guarda, por avaliação, tudo que é necessário para reproduzir a estatística
-- ITBI usada: fonte (rua/bairro), bairros incluídos, janela temporal,
-- tipologia filtrada, método de outlier, piso/teto, contagens e versão do motor.
ALTER TABLE public.valuations
  ADD COLUMN IF NOT EXISTS itbi_metadata jsonb;

COMMENT ON COLUMN public.valuations.itbi_metadata IS
  'Metadados do cálculo ITBI: engine_version, data_source, bairros_incluidos, janela_inicio, janela_fim, ano_corrente_incluido, tipologia_filtro, tipologia_fallback, outlier_method, piso_m2, teto_m2, linhas_agregadas, linhas_descartadas, escrituras_validas, truncado, calculado_em.';
