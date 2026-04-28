-- Function to clone global template (organization_id IS NULL) into a specific org
CREATE OR REPLACE FUNCTION public.seed_proposta_compra_for_org(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_count int;
BEGIN
  IF _org_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO existing_count
  FROM public.form_config_sections
  WHERE tipo_formulario = 'proposta_compra'
    AND organization_id = _org_id;

  IF existing_count > 0 THEN
    RETURN;
  END IF;

  -- Clone sections
  INSERT INTO public.form_config_sections
    (tipo_formulario, section_id, title, description, display_order, is_active, organization_id)
  SELECT
    tipo_formulario, section_id, title, description, display_order, is_active, _org_id
  FROM public.form_config_sections
  WHERE tipo_formulario = 'proposta_compra'
    AND organization_id IS NULL;

  -- Clone fields
  INSERT INTO public.form_config_fields
    (tipo_formulario, section_id, field_id, label, field_type, placeholder, help_text,
     options, is_required, is_locked, display_order, is_active, modelos, organization_id)
  SELECT
    tipo_formulario, section_id, field_id, label, field_type, placeholder, help_text,
    options, is_required, is_locked, display_order, is_active, modelos, _org_id
  FROM public.form_config_fields
  WHERE tipo_formulario = 'proposta_compra'
    AND organization_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_proposta_compra_for_org(uuid) TO authenticated;