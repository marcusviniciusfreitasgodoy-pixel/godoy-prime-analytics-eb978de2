
-- =============================================
-- FASE 1: Multi-Tenant Foundation
-- =============================================

-- 1.1 Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  phone TEXT,
  address TEXT,
  creci TEXT,
  website TEXT,
  person_type TEXT DEFAULT 'pj',
  logo_url TEXT,
  plan TEXT DEFAULT 'starter',
  plan_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  max_users INTEGER DEFAULT 5,
  max_valuations_month INTEGER DEFAULT 50,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2 Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);

-- 1.3 Create helper function BEFORE policies
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = _user_id
$$;

-- 1.4 Now create organizations RLS
CREATE POLICY "Members can view their organization"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- 1.5 Add organization_id to all operational tables
ALTER TABLE public.valuations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_valuations_org ON public.valuations(organization_id);

ALTER TABLE public.vistorias ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_vistorias_org ON public.vistorias(organization_id);

ALTER TABLE public.pricing_strategies ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_pricing_strategies_org ON public.pricing_strategies(organization_id);

ALTER TABLE public.fichas_visita ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_fichas_visita_org ON public.fichas_visita(organization_id);

ALTER TABLE public.agendamentos_visita ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_agendamentos_visita_org ON public.agendamentos_visita(organization_id);

ALTER TABLE public.disponibilidade_corretor ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_disponibilidade_org ON public.disponibilidade_corretor(organization_id);

ALTER TABLE public.leads ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_leads_org ON public.leads(organization_id);

ALTER TABLE public.user_activity_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_activity_logs_org ON public.user_activity_logs(organization_id);

ALTER TABLE public.notification_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_notification_settings_org ON public.notification_settings(organization_id);

ALTER TABLE public.valuation_characteristics ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_val_chars_org ON public.valuation_characteristics(organization_id);

ALTER TABLE public.valuation_documentation_factors ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_val_doc_factors_org ON public.valuation_documentation_factors(organization_id);

ALTER TABLE public.vistoria_checklist_categories ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_vistoria_cats_org ON public.vistoria_checklist_categories(organization_id);

ALTER TABLE public.vistoria_checklist_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_vistoria_items_org ON public.vistoria_checklist_items(organization_id);

ALTER TABLE public.sofia_knowledge_base ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
CREATE INDEX idx_sofia_kb_org ON public.sofia_knowledge_base(organization_id);

-- 1.6 Organization invites
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  email TEXT NOT NULL,
  role public.app_role DEFAULT 'corretor',
  invited_by UUID NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage invites"
ON public.organization_invites FOR ALL TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active invites"
ON public.organization_invites FOR SELECT TO anon, authenticated
USING (accepted_at IS NULL AND expires_at > now());

-- =============================================
-- FASE 6: Data Migration
-- =============================================

INSERT INTO public.organizations (id, name, slug, plan, plan_status, max_users, max_valuations_month)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Godoy Prime Realty', 'godoy-prime', 'enterprise', 'active', 999, 9999);

UPDATE public.profiles SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.valuations SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.vistorias SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.pricing_strategies SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.fichas_visita SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.agendamentos_visita SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.disponibilidade_corretor SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.leads SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.user_activity_logs SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.notification_settings SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.valuation_characteristics SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.valuation_documentation_factors SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.vistoria_checklist_categories SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.vistoria_checklist_items SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.sofia_knowledge_base SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Migrate company_settings to organizations
UPDATE public.organizations o SET
  cnpj = (SELECT setting_value FROM public.company_settings WHERE setting_key = 'cnpj' LIMIT 1),
  phone = (SELECT setting_value FROM public.company_settings WHERE setting_key = 'phone' LIMIT 1),
  address = (SELECT setting_value FROM public.company_settings WHERE setting_key = 'address' LIMIT 1),
  creci = (SELECT setting_value FROM public.company_settings WHERE setting_key = 'creci' LIMIT 1),
  website = (SELECT setting_value FROM public.company_settings WHERE setting_key = 'website' LIMIT 1),
  person_type = COALESCE((SELECT setting_value FROM public.company_settings WHERE setting_key = 'person_type' LIMIT 1), 'pj'),
  logo_url = (SELECT setting_value FROM public.company_settings WHERE setting_key = 'logo_url' LIMIT 1)
WHERE o.id = 'a0000000-0000-0000-0000-000000000001';

-- Helper functions
CREATE OR REPLACE FUNCTION public.check_org_limits(_org_id UUID, _resource_type TEXT)
RETURNS TABLE(allowed BOOLEAN, current_count BIGINT, max_allowed INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_max INTEGER; v_count BIGINT;
BEGIN
  IF _resource_type = 'users' THEN
    SELECT max_users INTO v_max FROM organizations WHERE id = _org_id;
    SELECT COUNT(*) INTO v_count FROM profiles WHERE organization_id = _org_id;
  ELSIF _resource_type = 'valuations_month' THEN
    SELECT max_valuations_month INTO v_max FROM organizations WHERE id = _org_id;
    SELECT COUNT(*) INTO v_count FROM valuations WHERE organization_id = _org_id AND created_at >= date_trunc('month', now());
  ELSE
    v_max := 999999; v_count := 0;
  END IF;
  RETURN QUERY SELECT v_count < v_max, v_count, v_max;
END;
$$;

-- Update triggers to support invites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org_id UUID; v_role public.app_role;
BEGIN
  SELECT organization_id, role INTO v_org_id, v_role
  FROM public.organization_invites
  WHERE email = lower(trim(NEW.email)) AND accepted_at IS NULL AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, COALESCE(v_role, 'corretor'));

  IF v_org_id IS NOT NULL THEN
    UPDATE public.organization_invites SET accepted_at = now()
    WHERE email = lower(trim(NEW.email)) AND accepted_at IS NULL AND expires_at > now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM public.organization_invites
  WHERE email = lower(trim(NEW.email)) AND accepted_at IS NOT NULL
  ORDER BY accepted_at DESC LIMIT 1;

  INSERT INTO public.profiles (id, full_name, phone, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    v_org_id
  );
  RETURN NEW;
END;
$$;
