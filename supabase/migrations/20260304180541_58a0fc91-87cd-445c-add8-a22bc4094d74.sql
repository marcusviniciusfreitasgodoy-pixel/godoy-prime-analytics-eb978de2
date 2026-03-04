DROP FUNCTION IF EXISTS get_condominios_bbox(double precision, double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_condominios_bbox(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_limit integer DEFAULT 300
)
RETURNS TABLE (
  id uuid,
  nome_condominio text,
  logradouro_padrao text,
  latitude double precision,
  longitude double precision,
  unidades_estimadas integer,
  numero_torres integer,
  preco_medio_m2 numeric,
  total_transacoes_itbi integer,
  ultima_transacao_itbi text,
  padrao_construtivo text,
  fonte_identificacao text,
  confianca_identificacao numeric,
  area_lote numeric,
  area_total_construida numeric,
  valor_venal_estimado numeric
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.nome_condominio, c.logradouro_padrao,
    c.latitude, c.longitude, c.unidades_estimadas,
    c.numero_torres, c.preco_medio_m2, c.total_transacoes_itbi,
    c.ultima_transacao_itbi::text, c.padrao_construtivo,
    c.fonte_identificacao, c.confianca_identificacao,
    c.area_lote, c.area_total_construida, c.valor_venal_estimado
  FROM condominios_mapeamento c
  WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    AND c.latitude BETWEEN p_south AND p_north
    AND c.longitude BETWEEN p_west AND p_east
  ORDER BY c.preco_medio_m2 DESC NULLS LAST
  LIMIT p_limit;
END;
$$