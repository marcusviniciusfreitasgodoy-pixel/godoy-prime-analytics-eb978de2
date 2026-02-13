
-- Corrigir registros existentes com organization_id NULL
UPDATE form_config_sections SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE form_config_fields SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Triggers para auto-preencher organization_id em novos registros
CREATE TRIGGER set_form_config_sections_org BEFORE INSERT ON form_config_sections
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();
CREATE TRIGGER set_form_config_fields_org BEFORE INSERT ON form_config_fields
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();
