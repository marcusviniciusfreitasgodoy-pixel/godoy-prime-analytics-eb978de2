
-- 1. Tabela de seções do formulário de feedback do corretor
CREATE TABLE public.feedback_corretor_config_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_corretor_config_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org sections" ON public.feedback_corretor_config_sections
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their org sections" ON public.feedback_corretor_config_sections
  FOR INSERT WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update their org sections" ON public.feedback_corretor_config_sections
  FOR UPDATE USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete their org sections" ON public.feedback_corretor_config_sections
  FOR DELETE USING (organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER set_org_id_feedback_sections BEFORE INSERT ON public.feedback_corretor_config_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER update_feedback_sections_updated_at BEFORE UPDATE ON public.feedback_corretor_config_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de campos do formulário
CREATE TABLE public.feedback_corretor_config_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id VARCHAR NOT NULL,
  field_id VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_corretor_config_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org fields" ON public.feedback_corretor_config_fields
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their org fields" ON public.feedback_corretor_config_fields
  FOR INSERT WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update their org fields" ON public.feedback_corretor_config_fields
  FOR UPDATE USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete their org fields" ON public.feedback_corretor_config_fields
  FOR DELETE USING (organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER set_org_id_feedback_fields BEFORE INSERT ON public.feedback_corretor_config_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();
CREATE TRIGGER update_feedback_fields_updated_at BEFORE UPDATE ON public.feedback_corretor_config_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela de feedbacks do corretor
CREATE TABLE public.feedbacks_corretor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_visita_id UUID NOT NULL REFERENCES public.fichas_visita(id),
  corretor_id UUID NOT NULL,
  respostas JSONB NOT NULL DEFAULT '{}',
  notas_gerais TEXT,
  proximos_passos TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks_corretor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org broker feedbacks" ON public.feedbacks_corretor
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their org broker feedbacks" ON public.feedbacks_corretor
  FOR INSERT WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update their org broker feedbacks" ON public.feedbacks_corretor
  FOR UPDATE USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can delete their org broker feedbacks" ON public.feedbacks_corretor
  FOR DELETE USING (organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER set_org_id_feedbacks_corretor BEFORE INSERT ON public.feedbacks_corretor
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_id();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks_corretor;
