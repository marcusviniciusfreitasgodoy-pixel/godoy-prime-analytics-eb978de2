
-- =============================================
-- Sistema Unificado de Configuração de Formulários
-- =============================================

-- 1. Tabela de seções
CREATE TABLE public.form_config_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_formulario VARCHAR NOT NULL,
  section_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de campos
CREATE TABLE public.form_config_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_formulario VARCHAR NOT NULL,
  section_id VARCHAR NOT NULL,
  field_id VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL,
  placeholder VARCHAR,
  help_text VARCHAR,
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.form_config_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_config_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org form config sections"
  ON public.form_config_sections FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert own org form config sections"
  ON public.form_config_sections FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own org form config sections"
  ON public.form_config_sections FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can delete own org form config sections"
  ON public.form_config_sections FOR DELETE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can view own org form config fields"
  ON public.form_config_fields FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert own org form config fields"
  ON public.form_config_fields FOR INSERT
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own org form config fields"
  ON public.form_config_fields FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can delete own org form config fields"
  ON public.form_config_fields FOR DELETE
  USING (organization_id = get_user_org_id(auth.uid()));

-- 4. Triggers set_organization_id
CREATE TRIGGER set_form_config_sections_org_id
  BEFORE INSERT ON public.form_config_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_form_config_fields_org_id
  BEFORE INSERT ON public.form_config_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

-- 5. Triggers updated_at
CREATE TRIGGER update_form_config_sections_updated_at
  BEFORE UPDATE ON public.form_config_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_config_fields_updated_at
  BEFORE UPDATE ON public.form_config_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Colunas JSONB para campos customizados
ALTER TABLE public.fichas_visita ADD COLUMN IF NOT EXISTS campos_customizados JSONB;
ALTER TABLE public.feedbacks_visita ADD COLUMN IF NOT EXISTS campos_customizados JSONB;

-- 7. Migrar dados existentes do Feedback Corretor para tabelas unificadas
INSERT INTO public.form_config_sections (tipo_formulario, section_id, title, description, display_order, is_active, organization_id, created_at, updated_at)
SELECT 'feedback_corretor', section_id, title, description, display_order, is_active, organization_id, created_at, updated_at
FROM public.feedback_corretor_config_sections;

INSERT INTO public.form_config_fields (tipo_formulario, section_id, field_id, label, field_type, options, is_required, display_order, is_active, organization_id, created_at, updated_at)
SELECT 'feedback_corretor', section_id, field_id, label, field_type, options, is_required, display_order, is_active, organization_id, created_at, updated_at
FROM public.feedback_corretor_config_fields;
