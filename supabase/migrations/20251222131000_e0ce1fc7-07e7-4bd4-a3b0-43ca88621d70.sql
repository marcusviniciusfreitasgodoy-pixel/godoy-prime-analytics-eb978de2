-- =============================================
-- MÓDULO DE AGENDAMENTO DE VISITAS
-- =============================================

-- Criar enums para o módulo de visitas
CREATE TYPE public.status_visita AS ENUM ('agendada', 'confirmada', 'realizada', 'cancelada');
CREATE TYPE public.tipo_servico_visita AS ENUM ('visita', 'avaliacao', 'consultoria', 'fotografia');
CREATE TYPE public.origem_agendamento AS ENUM ('site', 'indicacao', 'whatsapp', 'instagram', 'facebook', 'google', 'outro');
CREATE TYPE public.nivel_interesse_visita AS ENUM ('baixo', 'medio', 'alto', 'muito_alto');
CREATE TYPE public.percepcao_valor_visita AS ENUM ('abaixo', 'justo', 'acima');

-- =============================================
-- Tabela: fichas_visita
-- =============================================
CREATE TABLE public.fichas_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  
  -- Dados do Visitante
  nome_visitante TEXT NOT NULL,
  cpf_visitante TEXT NOT NULL,
  telefone_visitante TEXT NOT NULL,
  email_visitante TEXT,
  
  -- Dados do Imóvel
  codigo_imovel TEXT,
  endereco_imovel TEXT NOT NULL,
  valor_imovel NUMERIC,
  nome_proprietario TEXT NOT NULL,
  
  -- Dados do Corretor
  corretor_id UUID REFERENCES auth.users(id),
  nome_corretor TEXT NOT NULL,
  
  -- Visita
  data_visita TIMESTAMPTZ NOT NULL DEFAULT now(),
  status status_visita NOT NULL DEFAULT 'agendada',
  
  -- Assinaturas (base64)
  assinatura_visitante TEXT,
  assinatura_corretor TEXT,
  
  -- Observações
  notas TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Tabela: feedbacks_visita
-- =============================================
CREATE TABLE public.feedbacks_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_visita_id UUID NOT NULL REFERENCES public.fichas_visita(id) ON DELETE CASCADE,
  
  -- Avaliação Geral
  atende_necessidades BOOLEAN,
  gostaria_fazer_proposta BOOLEAN,
  avaliacao_geral INTEGER CHECK (avaliacao_geral BETWEEN 1 AND 5),
  conexao_imovel INTEGER CHECK (conexao_imovel BETWEEN 1 AND 5),
  
  -- Intenção de Compra
  valor_ofertaria NUMERIC,
  nivel_interesse nivel_interesse_visita,
  compraria_imovel BOOLEAN,
  
  -- Percepções
  ponto_resistencia TEXT,
  percepcao_valor percepcao_valor_visita,
  
  -- Feedback Descritivo
  o_que_mais_gostou TEXT,
  o_que_menos_gostou TEXT,
  o_que_alteraria TEXT,
  pontos_positivos TEXT,
  pontos_negativos TEXT,
  sugestoes_melhoria TEXT,
  
  -- Efeito UAU
  efeito_uau TEXT[],
  efeito_uau_detalhe TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Tabela: agendamentos_visita
-- =============================================
CREATE TABLE public.agendamentos_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vinculação com lead existente (opcional)
  lead_id UUID REFERENCES public.leads(id),
  
  -- Dados do Visitante
  nome_visitante TEXT NOT NULL,
  telefone_visitante TEXT NOT NULL,
  email_visitante TEXT,
  
  -- Dados do Imóvel
  endereco_imovel TEXT NOT NULL,
  codigo_imovel TEXT,
  
  -- Corretor Responsável
  corretor_id UUID REFERENCES auth.users(id),
  
  -- Agendamento
  tipo_servico tipo_servico_visita NOT NULL DEFAULT 'visita',
  data_hora TIMESTAMPTZ NOT NULL,
  status status_visita NOT NULL DEFAULT 'agendada',
  
  -- Origem e Observações
  origem origem_agendamento DEFAULT 'site',
  notas TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Tabela: disponibilidade_corretor
-- =============================================
CREATE TABLE public.disponibilidade_corretor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID REFERENCES auth.users(id) NOT NULL,
  data DATE NOT NULL,
  horarios_disponiveis TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(corretor_id, data)
);

-- =============================================
-- Habilitar RLS em todas as tabelas
-- =============================================
ALTER TABLE public.fichas_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidade_corretor ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Políticas RLS: fichas_visita
-- =============================================

-- Corretores podem ver suas próprias fichas
CREATE POLICY "Corretores podem ver suas fichas"
ON public.fichas_visita
FOR SELECT
USING (auth.uid() = corretor_id);

-- Admins podem ver todas as fichas
CREATE POLICY "Admins podem ver todas fichas"
ON public.fichas_visita
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Gerentes podem ver todas as fichas
CREATE POLICY "Gerentes podem ver todas fichas"
ON public.fichas_visita
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

-- Usuários autenticados podem criar fichas
CREATE POLICY "Usuários autenticados podem criar fichas"
ON public.fichas_visita
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Corretores podem atualizar suas fichas
CREATE POLICY "Corretores podem atualizar suas fichas"
ON public.fichas_visita
FOR UPDATE
USING (auth.uid() = corretor_id);

-- Admins podem atualizar qualquer ficha
CREATE POLICY "Admins podem atualizar qualquer ficha"
ON public.fichas_visita
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Políticas RLS: feedbacks_visita
-- =============================================

-- Qualquer pessoa pode criar feedback (público)
CREATE POLICY "Qualquer pessoa pode criar feedback"
ON public.feedbacks_visita
FOR INSERT
WITH CHECK (true);

-- Admins podem ver todos os feedbacks
CREATE POLICY "Admins podem ver todos feedbacks"
ON public.feedbacks_visita
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Corretor responsável pode ver feedbacks de suas fichas
CREATE POLICY "Corretor pode ver feedbacks de suas fichas"
ON public.feedbacks_visita
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fichas_visita fv
    WHERE fv.id = ficha_visita_id
    AND fv.corretor_id = auth.uid()
  )
);

-- =============================================
-- Políticas RLS: agendamentos_visita
-- =============================================

-- Qualquer pessoa pode criar agendamento (público)
CREATE POLICY "Qualquer pessoa pode criar agendamento"
ON public.agendamentos_visita
FOR INSERT
WITH CHECK (true);

-- Corretores podem ver seus agendamentos
CREATE POLICY "Corretores podem ver seus agendamentos"
ON public.agendamentos_visita
FOR SELECT
USING (auth.uid() = corretor_id);

-- Admins podem ver todos agendamentos
CREATE POLICY "Admins podem ver todos agendamentos"
ON public.agendamentos_visita
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Gerentes podem ver todos agendamentos
CREATE POLICY "Gerentes podem ver todos agendamentos"
ON public.agendamentos_visita
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role));

-- Corretores podem atualizar seus agendamentos
CREATE POLICY "Corretores podem atualizar seus agendamentos"
ON public.agendamentos_visita
FOR UPDATE
USING (auth.uid() = corretor_id);

-- Admins podem atualizar qualquer agendamento
CREATE POLICY "Admins podem atualizar qualquer agendamento"
ON public.agendamentos_visita
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Políticas RLS: disponibilidade_corretor
-- =============================================

-- Qualquer pessoa pode ver disponibilidade (público)
CREATE POLICY "Qualquer pessoa pode ver disponibilidade"
ON public.disponibilidade_corretor
FOR SELECT
USING (true);

-- Corretor pode gerenciar sua própria disponibilidade
CREATE POLICY "Corretor pode gerenciar sua disponibilidade"
ON public.disponibilidade_corretor
FOR ALL
USING (auth.uid() = corretor_id)
WITH CHECK (auth.uid() = corretor_id);

-- Admins podem gerenciar qualquer disponibilidade
CREATE POLICY "Admins podem gerenciar qualquer disponibilidade"
ON public.disponibilidade_corretor
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Triggers para updated_at
-- =============================================

CREATE TRIGGER update_fichas_visita_updated_at
  BEFORE UPDATE ON public.fichas_visita
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendamentos_visita_updated_at
  BEFORE UPDATE ON public.agendamentos_visita
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Função para gerar código único de visita
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_visit_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gera código no formato: VIS-YYYYMMDD-XXXX
    new_code := 'VIS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM public.fichas_visita WHERE codigo = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;