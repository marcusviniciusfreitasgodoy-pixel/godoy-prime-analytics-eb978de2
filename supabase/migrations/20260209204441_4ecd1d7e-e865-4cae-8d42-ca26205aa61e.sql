
-- ============================================================
-- AUTO-FILL organization_id ON INSERT via trigger
-- This ensures organization_id is always set correctly,
-- regardless of whether the frontend sends it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if not already provided and user is authenticated
  IF NEW.organization_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.organization_id := get_user_org_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to all tenant-scoped tables
CREATE TRIGGER set_org_id_valuations
  BEFORE INSERT ON valuations
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_pricing_strategies
  BEFORE INSERT ON pricing_strategies
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_fichas_visita
  BEFORE INSERT ON fichas_visita
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_agendamentos_visita
  BEFORE INSERT ON agendamentos_visita
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_disponibilidade_corretor
  BEFORE INSERT ON disponibilidade_corretor
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_leads
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_user_activity_logs
  BEFORE INSERT ON user_activity_logs
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_notification_settings
  BEFORE INSERT ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_vistorias
  BEFORE INSERT ON vistorias
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_valuation_characteristics
  BEFORE INSERT ON valuation_characteristics
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_valuation_documentation_factors
  BEFORE INSERT ON valuation_documentation_factors
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_vistoria_checklist_categories
  BEFORE INSERT ON vistoria_checklist_categories
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_vistoria_checklist_items
  BEFORE INSERT ON vistoria_checklist_items
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_org_id_sofia_knowledge_base
  BEFORE INSERT ON sofia_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();
