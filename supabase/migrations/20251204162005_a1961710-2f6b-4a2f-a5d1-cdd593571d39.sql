-- ============================================
-- TABELA 1: CARACTERÍSTICAS DE AVALIAÇÃO (26 itens)
-- ============================================
CREATE TABLE public.valuation_characteristics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(1) NOT NULL,              -- A, B, C, D, E
  category_name VARCHAR(100) NOT NULL,
  char_code VARCHAR(50) NOT NULL UNIQUE,     -- Ex: "vista_mar", "andar_alto"
  char_name VARCHAR(150) NOT NULL,
  char_description TEXT,
  char_type VARCHAR(10) NOT NULL CHECK (char_type IN ('positive', 'negative')),
  weight_value DECIMAL(5,4) NOT NULL,        -- Ex: 0.07 para +7%
  category_cap_max DECIMAL(5,4) NOT NULL,    -- Cap da categoria
  category_cap_min DECIMAL(5,4) NOT NULL,    -- Cap negativo da categoria
  display_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_valuation_characteristics_updated_at
BEFORE UPDATE ON public.valuation_characteristics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TABELA 2: FATORES DE DOCUMENTAÇÃO
-- ============================================
CREATE TABLE public.valuation_documentation_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_code VARCHAR(50) NOT NULL UNIQUE,
  status_name VARCHAR(100) NOT NULL,
  factor DECIMAL(5,4),
  adjustment DECIMAL(5,4),
  severity VARCHAR(20) NOT NULL,
  action_required VARCHAR(50) NOT NULL,
  description TEXT,
  display_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- TABELA 3: AVALIAÇÕES REALIZADAS
-- ============================================
CREATE TABLE public.valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Dados do Imóvel
  logradouro TEXT NOT NULL,
  numero TEXT,
  bairro TEXT NOT NULL DEFAULT 'BARRA DA TIJUCA',
  property_area_m2 DECIMAL(10,2) NOT NULL,
  property_type VARCHAR(50) DEFAULT 'apartamento',
  
  -- Dados de Mercado (ITBI)
  itbi_min_m2 DECIMAL(10,2) NOT NULL,
  itbi_med_m2 DECIMAL(10,2) NOT NULL,
  itbi_max_m2 DECIMAL(10,2) NOT NULL,
  itbi_transaction_count INT,
  
  -- Dados de Anúncios (manual)
  anuncio_min_m2 DECIMAL(10,2),
  anuncio_med_m2 DECIMAL(10,2),
  anuncio_max_m2 DECIMAL(10,2),
  
  -- Combinado (70% ITBI + 30% Anúncios)
  combined_min_m2 DECIMAL(10,2) NOT NULL,
  combined_med_m2 DECIMAL(10,2) NOT NULL,
  combined_max_m2 DECIMAL(10,2) NOT NULL,
  
  -- Trend calculado
  trend_percentage DECIMAL(5,2),
  trend_direction VARCHAR(10) CHECK (trend_direction IN ('UP', 'STABLE', 'DOWN')),
  
  -- Base selecionada pelo usuário
  base_price_selected VARCHAR(10) DEFAULT 'med' CHECK (base_price_selected IN ('min', 'med', 'max', 'custom')),
  base_price_custom_m2 DECIMAL(10,2),
  
  -- Ajustes calculados
  total_adjustment DECIMAL(5,4) NOT NULL,
  auto_capped BOOLEAN DEFAULT false,
  
  -- Documentação
  documentation_status VARCHAR(50) NOT NULL,
  documentation_factor DECIMAL(5,4) NOT NULL,
  documentation_notes TEXT,
  
  -- Valores Finais
  final_value_min DECIMAL(15,2) NOT NULL,
  final_value_med DECIMAL(15,2) NOT NULL,
  final_value_max DECIMAL(15,2) NOT NULL,
  
  -- Confiança
  confidence_score INT NOT NULL,
  confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('green', 'yellow_high', 'yellow_medium', 'red')),
  spread_percentage DECIMAL(5,2) NOT NULL,
  
  -- Recomendação
  recommendation_action VARCHAR(100),
  recommendation_title VARCHAR(200),
  recommendation_details JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pdf_generated BOOLEAN DEFAULT false
);

-- Trigger para updated_at
CREATE TRIGGER update_valuations_updated_at
BEFORE UPDATE ON public.valuations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TABELA 4: RESPOSTAS DO QUESTIONÁRIO
-- ============================================
CREATE TABLE public.valuation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id UUID NOT NULL REFERENCES public.valuations(id) ON DELETE CASCADE,
  characteristic_id UUID NOT NULL REFERENCES public.valuation_characteristics(id),
  response_value VARCHAR(20) NOT NULL CHECK (response_value IN ('sim', 'nao', 'parcial', 'nao_aplica')),
  weight_applied DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.valuation_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_documentation_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_responses ENABLE ROW LEVEL SECURITY;

-- Características: todos autenticados podem ver, apenas admin pode gerenciar
CREATE POLICY "Usuários autenticados podem visualizar características"
ON public.valuation_characteristics FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem gerenciar características"
ON public.valuation_characteristics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fatores de documentação: todos autenticados podem ver
CREATE POLICY "Usuários autenticados podem visualizar fatores"
ON public.valuation_documentation_factors FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem gerenciar fatores"
ON public.valuation_documentation_factors FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Avaliações: usuário pode ver/criar/editar as próprias
CREATE POLICY "Usuários podem ver suas avaliações"
ON public.valuations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar avaliações"
ON public.valuations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas avaliações"
ON public.valuations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas avaliações"
ON public.valuations FOR DELETE
USING (auth.uid() = user_id);

-- Respostas: através da avaliação (cascade)
CREATE POLICY "Usuários podem ver respostas de suas avaliações"
ON public.valuation_responses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.valuations v 
  WHERE v.id = valuation_id AND v.user_id = auth.uid()
));

CREATE POLICY "Usuários podem criar respostas"
ON public.valuation_responses FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.valuations v 
  WHERE v.id = valuation_id AND v.user_id = auth.uid()
));

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_valuation_characteristics_category ON public.valuation_characteristics(category, is_active);
CREATE INDEX idx_valuations_user_date ON public.valuations(user_id, created_at DESC);
CREATE INDEX idx_valuations_logradouro ON public.valuations(logradouro);
CREATE INDEX idx_valuation_responses_valuation ON public.valuation_responses(valuation_id);