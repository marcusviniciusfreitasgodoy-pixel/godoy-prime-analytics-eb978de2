-- Fase 1: Atualização da tabela condominios_mapeamento
-- Adicionar novos campos para enriquecimento com dados do Google Maps

ALTER TABLE public.condominios_mapeamento
ADD COLUMN IF NOT EXISTS logradouro_itbi_normalizado TEXT,
ADD COLUMN IF NOT EXISTS ruas_internas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS endereco_completo TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar índices para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_condominios_logradouro_itbi ON public.condominios_mapeamento(logradouro_itbi_normalizado);
CREATE INDEX IF NOT EXISTS idx_condominios_coords ON public.condominios_mapeamento(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_condominios_place_id ON public.condominios_mapeamento(google_place_id);

-- Criar tabela auxiliar de normalização de logradouros
CREATE TABLE IF NOT EXISTS public.logradouros_normalizacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logradouro_original TEXT NOT NULL,
  logradouro_normalizado TEXT NOT NULL,
  tipo_logradouro TEXT,
  bairro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(logradouro_original, bairro)
);

-- Habilitar RLS na tabela de normalização
ALTER TABLE public.logradouros_normalizacao ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (dados de referência)
CREATE POLICY "Logradouros normalizados são públicos para leitura"
ON public.logradouros_normalizacao
FOR SELECT
USING (true);

-- Política de escrita apenas para admins
CREATE POLICY "Apenas admins podem modificar logradouros"
ON public.logradouros_normalizacao
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Criar índices para a tabela de normalização
CREATE INDEX IF NOT EXISTS idx_logradouros_original ON public.logradouros_normalizacao(logradouro_original);
CREATE INDEX IF NOT EXISTS idx_logradouros_normalizado ON public.logradouros_normalizacao(logradouro_normalizado);
CREATE INDEX IF NOT EXISTS idx_logradouros_bairro ON public.logradouros_normalizacao(bairro);

-- Inserir mapeamentos iniciais de tipos de logradouro comuns
INSERT INTO public.logradouros_normalizacao (logradouro_original, logradouro_normalizado, tipo_logradouro, bairro)
VALUES 
  ('AVN DAS AMERICAS', 'Avenida das Américas', 'AVN', 'BARRA DA TIJUCA'),
  ('AVN AYRTON SENNA', 'Avenida Ayrton Senna', 'AVN', 'BARRA DA TIJUCA'),
  ('AVN SERNAMBETIBA', 'Avenida Sernambetiba', 'AVN', 'BARRA DA TIJUCA'),
  ('AVN LUCIO COSTA', 'Avenida Lúcio Costa', 'AVN', 'BARRA DA TIJUCA'),
  ('AVN ABELARDO BUENO', 'Avenida Abelardo Bueno', 'AVN', 'BARRA DA TIJUCA'),
  ('AVN ARMANDO LOMBARDI', 'Avenida Armando Lombardi', 'AVN', 'BARRA DA TIJUCA'),
  ('AVN DO PEPE', 'Avenida do Pepê', 'AVN', 'BARRA DA TIJUCA'),
  ('RUA FLAMBOYANTS', 'Rua dos Flamboyants', 'RUA', 'BARRA DA TIJUCA'),
  ('EST DA BARRA DA TIJUCA', 'Estrada da Barra da Tijuca', 'EST', 'BARRA DA TIJUCA'),
  ('EST DOS BANDEIRANTES', 'Estrada dos Bandeirantes', 'EST', 'BARRA DA TIJUCA')
ON CONFLICT (logradouro_original, bairro) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_condominios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_condominios_mapeamento_updated_at ON public.condominios_mapeamento;
CREATE TRIGGER update_condominios_mapeamento_updated_at
BEFORE UPDATE ON public.condominios_mapeamento
FOR EACH ROW
EXECUTE FUNCTION public.update_condominios_updated_at();