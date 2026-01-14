-- Adicionar coluna microbairro na tabela itbi_transactions
ALTER TABLE public.itbi_transactions 
ADD COLUMN IF NOT EXISTS microbairro TEXT;

-- Criar índice para otimizar queries por microbairro
CREATE INDEX IF NOT EXISTS idx_itbi_transactions_microbairro 
ON public.itbi_transactions(microbairro);

-- Criar tabela para definir polígonos de microbairros (para classificação geográfica)
CREATE TABLE IF NOT EXISTS public.microbairros_geo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  bairro TEXT NOT NULL DEFAULT 'BARRA DA TIJUCA',
  latitude_centro NUMERIC,
  longitude_centro NUMERIC,
  -- Bounding box aproximado para classificação rápida
  lat_min NUMERIC,
  lat_max NUMERIC,
  lng_min NUMERIC,
  lng_max NUMERIC,
  -- Palavras-chave para classificação por nome de logradouro
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.microbairros_geo ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Microbairros são públicos para leitura" 
ON public.microbairros_geo 
FOR SELECT 
USING (true);

-- Inserir microbairros conhecidos da Barra da Tijuca com coordenadas aproximadas
INSERT INTO public.microbairros_geo (nome, bairro, latitude_centro, longitude_centro, lat_min, lat_max, lng_min, lng_max, keywords) VALUES
  ('Orla', 'BARRA DA TIJUCA', -23.0100, -43.3100, -23.0200, -22.9950, -43.3600, -43.2800, ARRAY['LUCIO COSTA', 'LÚCIO COSTA', 'SERNAMBETIBA', 'PEPE', 'PEPÊ']),
  ('Península', 'BARRA DA TIJUCA', -23.0050, -43.3500, -23.0150, -22.9950, -43.3600, -43.3400, ARRAY['PENINSULA', 'PENÍNSULA', 'ACACIAS DA PENINSULA', 'FLAMBOYANTS DA PENINSULA', 'JACARANDAS DA PENINSULA', 'BROMELIAS DA PENINSULA', 'BAUHINEAS DA PENINSULA']),
  ('Jardim Oceânico', 'BARRA DA TIJUCA', -23.0080, -43.3050, -23.0150, -23.0000, -43.3200, -43.2900, ARRAY['OLEGARIO', 'OLEGÁRIO', 'ERICO', 'ÉRICO', 'VERÍSSIMO', 'VERISSIMO', 'GASTAO SENGES', 'GASTÃO SENGES', 'GAL GUEDES DA FONTOURA', 'ALCEU AMOROSO LIMA', 'AFONSO ARINOS', 'GILBERTO AMADO', 'PEREGRINO JUNIOR', 'PEREGRINO JÚNIOR', 'ADOLPHO DE VASCONCELLOS', 'DI CAVALCANTI', 'DJALMA RIBEIRO', 'PROF FAUSTO MOREIRA', 'EVANDRO LINS', 'LUIZ ARANHA', 'JOAO CABRAL DE MELLO', 'ALDA GARRIDO', 'SOBRAL PINTO', 'TIM LOPES']),
  ('Centro Metropolitano', 'BARRA DA TIJUCA', -22.9850, -43.3650, -22.9950, -22.9750, -43.3750, -43.3550, ARRAY['ABELARDO BUENO', 'EMBAIXADOR', 'EMBAIX']),
  ('Ayrton Senna', 'BARRA DA TIJUCA', -22.9900, -43.3800, -23.0000, -22.9800, -43.4000, -43.3600, ARRAY['AYRTON SENNA', 'VIA PARQUE', 'ALFA BARRA']),
  ('ABM', 'BARRA DA TIJUCA', -23.0150, -43.3400, -23.0250, -23.0050, -43.3500, -43.3300, ARRAY['DULCIDIO', 'DULCÍDIO', 'CARDOSO', 'PREF DULCIDIO']),
  ('Parque das Rosas', 'BARRA DA TIJUCA', -22.9980, -43.3550, -23.0080, -22.9880, -43.3650, -43.3450, ARRAY['MARIO COVAS', 'MÁRIO COVAS', 'CESAR LATTES', 'CÉSAR LATTES', 'HENRIQUE CORDEIRO', 'JORN HENRIQUE CORDEIRO']),
  ('Eixo Américas', 'BARRA DA TIJUCA', -22.9950, -43.3700, -23.0050, -22.9850, -43.3850, -43.3550, ARRAY['AMERICAS', 'AMÉRICAS', 'DAS AMERICAS'])
ON CONFLICT (nome) DO UPDATE SET
  keywords = EXCLUDED.keywords,
  latitude_centro = EXCLUDED.latitude_centro,
  longitude_centro = EXCLUDED.longitude_centro,
  lat_min = EXCLUDED.lat_min,
  lat_max = EXCLUDED.lat_max,
  lng_min = EXCLUDED.lng_min,
  lng_max = EXCLUDED.lng_max,
  updated_at = now();