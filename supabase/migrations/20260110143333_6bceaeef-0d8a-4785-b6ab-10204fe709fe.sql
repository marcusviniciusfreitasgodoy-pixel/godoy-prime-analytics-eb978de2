-- Tabela para persistir estratégias de precificação
CREATE TABLE public.pricing_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valuation_id UUID REFERENCES public.valuations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Valor base
  valor_itbi NUMERIC NOT NULL,
  
  -- Status do imóvel no mercado
  is_new_listing BOOLEAN NOT NULL DEFAULT true,
  
  -- Diagnóstico (Q1-Q9)
  q1_tempo_mercado VARCHAR(50),
  q2_concorrencia VARCHAR(50),
  q3_prioridade VARCHAR(50),
  q4_horizonte_tempo VARCHAR(50),
  q5_situacao_financeira VARCHAR(50),
  q6_estado_mercado VARCHAR(50),
  q7_clientes_potenciais VARCHAR(50),
  q8_pronto_vender VARCHAR(50),
  q9_padrao_imovel VARCHAR(50),
  
  -- Estratégia recomendada e selecionada
  estrategia_recomendada VARCHAR(20) NOT NULL, -- 'atracao', 'mercado', 'premium'
  estrategia_selecionada VARCHAR(20), -- pode ser null até selecionar
  
  -- Percentuais aplicados por estratégia
  p_atracao NUMERIC NOT NULL DEFAULT 0.04,
  p_mercado NUMERIC NOT NULL DEFAULT 0.09,
  p_premium NUMERIC NOT NULL DEFAULT 0.14,
  
  -- Valores calculados - ATRAÇÃO
  preco_anuncio_atracao NUMERIC,
  corretagem_atracao NUMERIC,
  liquido_atracao NUMERIC,
  piso_planejado_atracao NUMERIC,
  liquido_min_atracao NUMERIC,
  premio_liquido_pct_atracao NUMERIC,
  
  -- Valores calculados - MERCADO
  preco_anuncio_mercado NUMERIC,
  corretagem_mercado NUMERIC,
  liquido_mercado NUMERIC,
  piso_planejado_mercado NUMERIC,
  liquido_min_mercado NUMERIC,
  premio_liquido_pct_mercado NUMERIC,
  
  -- Valores calculados - PREMIUM
  preco_anuncio_premium NUMERIC,
  corretagem_premium NUMERIC,
  liquido_premium NUMERIC,
  piso_planejado_premium NUMERIC,
  liquido_min_premium NUMERIC,
  premio_liquido_pct_premium NUMERIC,
  
  -- Plano de ajuste Premium ativado
  plano_ajuste_ativo BOOLEAN DEFAULT false,
  
  -- Status e timestamps
  status VARCHAR(20) NOT NULL DEFAULT 'diagnostico', -- 'diagnostico', 'analisado', 'selecionado', 'confirmado'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_strategies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver suas estratégias" 
ON public.pricing_strategies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar estratégias" 
ON public.pricing_strategies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas estratégias" 
ON public.pricing_strategies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas estratégias" 
ON public.pricing_strategies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_pricing_strategies_updated_at
BEFORE UPDATE ON public.pricing_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para busca rápida
CREATE INDEX idx_pricing_strategies_valuation ON public.pricing_strategies(valuation_id);
CREATE INDEX idx_pricing_strategies_user ON public.pricing_strategies(user_id);