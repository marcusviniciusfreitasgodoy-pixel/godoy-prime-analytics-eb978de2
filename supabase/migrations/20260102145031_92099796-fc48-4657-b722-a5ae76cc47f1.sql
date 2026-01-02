-- Security fix: Restrict get_ficha_by_codigo to return only minimal non-sensitive data
-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.get_ficha_by_codigo(text);

-- Recreate with minimal data needed for feedback form only
CREATE OR REPLACE FUNCTION public.get_ficha_by_codigo(p_codigo TEXT)
RETURNS TABLE (
  id UUID,
  codigo TEXT,
  endereco_imovel TEXT,
  data_visita TIMESTAMPTZ,
  nome_corretor TEXT,
  status status_visita
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return non-sensitive data needed for feedback form
  -- REMOVED for security: cpf_visitante, telefone_visitante, email_visitante, 
  -- nome_visitante, nome_proprietario, valor_imovel, codigo_imovel, notas
  RETURN QUERY
  SELECT 
    fv.id,
    fv.codigo,
    fv.endereco_imovel,
    fv.data_visita,
    fv.nome_corretor,
    fv.status
  FROM fichas_visita fv
  WHERE fv.codigo = p_codigo
    AND fv.status != 'cancelada';
END;
$$;