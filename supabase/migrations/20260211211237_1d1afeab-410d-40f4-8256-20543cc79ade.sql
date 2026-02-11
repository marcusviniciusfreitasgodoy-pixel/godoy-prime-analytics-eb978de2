
-- 1. ALTER TABLE leads - adicionar colunas CRM
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS estagio_pipeline VARCHAR DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS score_qualificacao INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS responsavel_id UUID,
  ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR,
  ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prazo_compra VARCHAR;

-- 2. CREATE TABLE atividades_lead
CREATE TABLE public.atividades_lead (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo VARCHAR NOT NULL,
  titulo VARCHAR,
  descricao TEXT,
  metadata JSONB DEFAULT '{}',
  usuario_id UUID,
  usuario_nome VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.atividades_lead ENABLE ROW LEVEL SECURITY;

-- Org admins/gerentes can view atividades of their org's leads
CREATE POLICY "Org members can view atividades"
  ON public.atividades_lead FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = atividades_lead.lead_id
    AND l.organization_id = get_user_org_id(auth.uid())
  ));

-- Org admins/gerentes can create atividades
CREATE POLICY "Org members can create atividades"
  ON public.atividades_lead FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = atividades_lead.lead_id
    AND l.organization_id = get_user_org_id(auth.uid())
  ));

-- Org admins/gerentes can delete atividades
CREATE POLICY "Org members can delete atividades"
  ON public.atividades_lead FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = atividades_lead.lead_id
    AND l.organization_id = get_user_org_id(auth.uid())
  ));

-- 3. CREATE TABLE tarefas
CREATE TABLE public.tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id),
  titulo VARCHAR NOT NULL,
  descricao TEXT,
  responsavel_id UUID,
  responsavel_nome VARCHAR,
  data_vencimento TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  prioridade VARCHAR DEFAULT 'media',
  status VARCHAR DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Org members can manage their tarefas
CREATE POLICY "Org members can manage tarefas"
  ON public.tarefas FOR ALL
  USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- 4. CREATE TABLE notas_lead
CREATE TABLE public.notas_lead (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  autor_id UUID,
  autor_nome VARCHAR,
  privada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notas_lead ENABLE ROW LEVEL SECURITY;

-- Org members can view notas (respecting privada)
CREATE POLICY "Org members can view notas"
  ON public.notas_lead FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = notas_lead.lead_id
      AND l.organization_id = get_user_org_id(auth.uid())
    )
    AND (privada = false OR autor_id = auth.uid())
  );

-- Org members can create notas
CREATE POLICY "Org members can create notas"
  ON public.notas_lead FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = notas_lead.lead_id
    AND l.organization_id = get_user_org_id(auth.uid())
  ));

-- Users can update their own notas
CREATE POLICY "Users can update own notas"
  ON public.notas_lead FOR UPDATE
  USING (autor_id = auth.uid());

-- Users can delete their own notas
CREATE POLICY "Users can delete own notas"
  ON public.notas_lead FOR DELETE
  USING (autor_id = auth.uid());
