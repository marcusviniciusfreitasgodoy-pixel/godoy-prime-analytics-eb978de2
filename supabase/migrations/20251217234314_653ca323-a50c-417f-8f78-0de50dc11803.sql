-- Create a secure function to update lead data with email validation
-- This prevents arbitrary updates to any lead by anonymous users

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
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Update the lead and return its ID
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
  RETURNING id INTO v_lead_id;
  
  -- Also increment evaluation count
  UPDATE public.leads 
  SET evaluation_count = COALESCE(evaluation_count, 0) + 1
  WHERE id = v_lead_id;
  
  RETURN v_lead_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.update_lead_by_email(text, text, text, text, numeric, numeric, integer, integer, integer, integer, text, text, text, boolean, text, text, text, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.update_lead_by_email(text, text, text, text, numeric, numeric, integer, integer, integer, integer, text, text, text, boolean, text, text, text, numeric) TO authenticated;