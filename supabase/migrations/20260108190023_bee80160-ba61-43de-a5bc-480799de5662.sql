-- Tabela para cache de coordenadas de logradouros
CREATE TABLE public.logradouros_geo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logradouro TEXT NOT NULL,
  bairro TEXT NOT NULL,
  cod_trecho INTEGER,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  hierarquia TEXT,
  tipo_logradouro TEXT,
  velocidade_regulamentada INTEGER,
  last_sync TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(logradouro, bairro)
);

-- Indexes para performance
CREATE INDEX idx_logradouros_geo_bairro ON public.logradouros_geo(bairro);
CREATE INDEX idx_logradouros_geo_logradouro ON public.logradouros_geo(logradouro);
CREATE INDEX idx_logradouros_geo_coords ON public.logradouros_geo(latitude, longitude) WHERE latitude IS NOT NULL;

-- Enable RLS
ALTER TABLE public.logradouros_geo ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa pode visualizar (dados públicos da Prefeitura)
CREATE POLICY "Qualquer pessoa pode visualizar logradouros" 
ON public.logradouros_geo 
FOR SELECT 
USING (true);

-- Política: apenas admins podem gerenciar
CREATE POLICY "Apenas admins podem gerenciar logradouros" 
ON public.logradouros_geo 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política: edge functions (service_role) podem inserir/atualizar
CREATE POLICY "Service role pode gerenciar logradouros"
ON public.logradouros_geo
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');