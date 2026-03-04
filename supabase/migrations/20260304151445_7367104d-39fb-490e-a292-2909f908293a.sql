
-- Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- PASSO 1: Expandir condominios_mapeamento
ALTER TABLE condominios_mapeamento
  ADD COLUMN IF NOT EXISTS numero_torres integer,
  ADD COLUMN IF NOT EXISTS unidades_estimadas integer,
  ADD COLUMN IF NOT EXISTS area_total_construida numeric,
  ADD COLUMN IF NOT EXISTS area_lote numeric,
  ADD COLUMN IF NOT EXISTS valor_venal_estimado numeric,
  ADD COLUMN IF NOT EXISTS tipologia_predominante text,
  ADD COLUMN IF NOT EXISTS andares_predominantes integer,
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS geom_lote geometry(Polygon, 4326),
  ADD COLUMN IF NOT EXISTS fonte_identificacao text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confianca_identificacao numeric,
  ADD COLUMN IF NOT EXISTS total_transacoes_itbi integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_medio_m2 numeric,
  ADD COLUMN IF NOT EXISTS ultima_transacao_itbi date,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cond_geom ON condominios_mapeamento USING GIST(geom);

-- PASSO 2: iptu_imoveis
CREATE TABLE IF NOT EXISTS iptu_imoveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_municipal text UNIQUE,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  tipologia text,
  cod_logradouro text,
  valor_venal numeric,
  area_terreno numeric,
  area_construida numeric,
  lat double precision,
  lng double precision,
  geom geometry(Point, 4326),
  geocodificado_via text,
  fonte text DEFAULT 'prefeitura_rio',
  importado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iptu_bairro ON iptu_imoveis(bairro);
CREATE INDEX IF NOT EXISTS idx_iptu_logradouro ON iptu_imoveis(logradouro);
CREATE INDEX IF NOT EXISTS idx_iptu_geom ON iptu_imoveis USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_iptu_inscricao ON iptu_imoveis(inscricao_municipal);

ALTER TABLE iptu_imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica iptu_imoveis" ON iptu_imoveis FOR SELECT USING (true);

-- edificacoes_geo
CREATE TABLE IF NOT EXISTS edificacoes_geo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objectid_origem integer UNIQUE,
  area_footprint numeric,
  altura_max numeric,
  andares_estimados integer,
  geom geometry(Polygon, 4326),
  lat double precision,
  lng double precision,
  importado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edif_geom ON edificacoes_geo USING GIST(geom);

ALTER TABLE edificacoes_geo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica edificacoes" ON edificacoes_geo FOR SELECT USING (true);

-- lotes_pal
CREATE TABLE IF NOT EXISTS lotes_pal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num_contribuinte text,
  logradouro text,
  numero text,
  bairro text,
  area_lote numeric,
  geom geometry(Polygon, 4326),
  importado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lotes_geom ON lotes_pal USING GIST(geom);

ALTER TABLE lotes_pal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica lotes_pal" ON lotes_pal FOR SELECT USING (true);

-- torres_condominios
CREATE TABLE IF NOT EXISTS torres_condominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid REFERENCES condominios_mapeamento(id) ON DELETE CASCADE,
  edificacao_id uuid REFERENCES edificacoes_geo(id),
  numero_torre integer,
  nome_torre text,
  area_footprint numeric,
  altura numeric,
  andares integer,
  unidades_estimadas integer,
  lat double precision,
  lng double precision,
  geom geometry(Point, 4326),
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE torres_condominios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica torres" ON torres_condominios FOR SELECT USING (true);

-- iptu_logradouro_resumo
CREATE TABLE IF NOT EXISTS iptu_logradouro_resumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logradouro text NOT NULL,
  bairro text NOT NULL,
  tipologia text,
  total_imoveis integer,
  total_area_construida numeric,
  valor_venal_total numeric,
  valor_venal_medio numeric,
  preco_real_medio_itbi numeric,
  total_transacoes_itbi integer,
  desconto_venal_percentual numeric,
  geom geometry(LineString, 4326),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(logradouro, bairro, tipologia)
);

ALTER TABLE iptu_logradouro_resumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica iptu_logradouro_resumo" ON iptu_logradouro_resumo FOR SELECT USING (true);

-- etl_log (RLS corrigido com has_role)
CREATE TABLE IF NOT EXISTS etl_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte text NOT NULL,
  bairro text,
  status text NOT NULL,
  registros_importados integer DEFAULT 0,
  registros_atualizados integer DEFAULT 0,
  registros_com_erro integer DEFAULT 0,
  erro_mensagem text,
  detalhes jsonb,
  iniciado_em timestamptz DEFAULT now(),
  finalizado_em timestamptz
);

ALTER TABLE etl_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem etl_log" ON etl_log FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- proprietarios_multiplos (RLS corrigido com has_role)
CREATE TABLE IF NOT EXISTS proprietarios_multiplos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_contribuinte text,
  quantidade_imoveis integer,
  valor_venal_total numeric,
  bairros_atuacao text[],
  inscricoes_municipais text[],
  identificado_em timestamptz DEFAULT now()
);

ALTER TABLE proprietarios_multiplos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem proprietarios" ON proprietarios_multiplos FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
