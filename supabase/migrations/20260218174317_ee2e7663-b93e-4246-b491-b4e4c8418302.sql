
-- Fix update_lead_by_email to prevent cross-organization data corruption
-- Only update leads that are NOT yet assigned to any organization (public leads)
-- This prevents a public form submission from overwriting org-assigned lead data
CREATE OR REPLACE FUNCTION public.update_lead_by_email(
  p_email text,
  p_nome text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_bairro_interesse text DEFAULT NULL,
  p_area_interesse numeric DEFAULT NULL,
  p_valor_interesse numeric DEFAULT NULL,
  p_quartos integer DEFAULT NULL,
  p_banheiros integer DEFAULT NULL,
  p_suites integer DEFAULT NULL,
  p_vagas integer DEFAULT NULL,
  p_objetivo text DEFAULT NULL,
  p_urgencia text DEFAULT NULL,
  p_preferencia_contato text DEFAULT NULL,
  p_aceita_marketing boolean DEFAULT NULL,
  p_diferenciais_imovel text DEFAULT NULL,
  p_interesse text DEFAULT NULL,
  p_endereco_imovel_analise text DEFAULT NULL,
  p_valor_pedido_vendedor numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Only update leads that are NOT assigned to an organization
  -- This prevents cross-org data contamination from public forms
  UPDATE public.leads 
  SET 
    nome = COALESCE(p_nome, nome),
    telefone = COALESCE(p_telefone, telefone),
    bairro_interesse = COALESCE(p_bairro_interesse, bairro_interesse),
    area_interesse = COALESCE(p_area_interesse, area_interesse),
    valor_interesse = COALESCE(p_valor_interesse, valor_interesse),
    quartos = COALESCE(p_quartos, quartos),
    banheiros = COALESCE(p_banheiros, banheiros),
    suites = COALESCE(p_suites, suites),
    vagas = COALESCE(p_vagas, vagas),
    objetivo = COALESCE(p_objetivo, objetivo),
    urgencia = COALESCE(p_urgencia, urgencia),
    preferencia_contato = COALESCE(p_preferencia_contato, preferencia_contato),
    aceita_marketing = COALESCE(p_aceita_marketing, aceita_marketing),
    diferenciais_imovel = COALESCE(p_diferenciais_imovel, diferenciais_imovel),
    interesse = COALESCE(p_interesse, interesse),
    endereco_imovel_analise = COALESCE(p_endereco_imovel_analise, endereco_imovel_analise),
    valor_pedido_vendedor = COALESCE(p_valor_pedido_vendedor, valor_pedido_vendedor),
    updated_at = now()
  WHERE email = lower(trim(p_email))
    AND organization_id IS NULL
  RETURNING id INTO v_lead_id;
  
  -- Also increment evaluation count if lead was found
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads 
    SET evaluation_count = COALESCE(evaluation_count, 0) + 1
    WHERE id = v_lead_id;
  END IF;
  
  RETURN v_lead_id;
END;
$$;

-- Also fix check_lead_exists to only check unassigned leads (public context)
CREATE OR REPLACE FUNCTION public.check_lead_exists(lead_email text)
RETURNS TABLE(exists_flag boolean, current_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check leads NOT assigned to an organization (public leads)
  -- This prevents enumeration of org-assigned leads
  RETURN QUERY
  SELECT 
    TRUE as exists_flag,
    1 as current_count
  FROM public.leads 
  WHERE email = lower(trim(lead_email))
    AND organization_id IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE as exists_flag, 0 as current_count;
  END IF;
END;
$$;

-- Fix check_org_limits to require authenticated caller
CREATE OR REPLACE FUNCTION public.check_org_limits(_org_id uuid, _resource_type text)
RETURNS TABLE(allowed boolean, current_count bigint, max_allowed integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_max INTEGER; v_count BIGINT;
BEGIN
  -- Require authenticated user who belongs to the org
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF get_user_org_id(auth.uid()) != _org_id THEN
    RAISE EXCEPTION 'Access denied: not a member of this organization';
  END IF;

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
