
-- company_settings: add org isolation
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.company_settings SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.company_settings ALTER COLUMN organization_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_org_key_uniq ON public.company_settings(organization_id, setting_key);

DROP POLICY IF EXISTS "Admins can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Org admins can manage company settings" ON public.company_settings;

CREATE POLICY "Org members can view company settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can insert company settings"
  ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org admins can update company settings"
  ON public.company_settings FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org admins can delete company settings"
  ON public.company_settings FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role));

-- ia_valuation_weights: add org isolation
ALTER TABLE public.ia_valuation_weights ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.ia_valuation_weights SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.ia_valuation_weights ALTER COLUMN organization_id SET NOT NULL;

DROP POLICY IF EXISTS "Apenas admins podem gerenciar pesos" ON public.ia_valuation_weights;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar pesos" ON public.ia_valuation_weights;

CREATE POLICY "Org members can view valuation weights"
  ON public.ia_valuation_weights FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can manage valuation weights"
  ON public.ia_valuation_weights FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::app_role));
