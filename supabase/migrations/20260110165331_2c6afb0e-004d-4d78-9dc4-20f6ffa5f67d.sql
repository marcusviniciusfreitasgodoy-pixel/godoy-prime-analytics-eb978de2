-- Criar função segura para buscar ficha para assinatura
-- Retorna apenas os campos necessários para a página de assinatura
CREATE OR REPLACE FUNCTION public.get_ficha_for_signature(p_codigo text)
RETURNS TABLE(
  id uuid,
  codigo text,
  endereco_imovel text,
  data_visita timestamptz,
  nome_corretor text,
  status status_visita,
  assinatura_visitante text,
  assinatura_corretor text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fv.id,
    fv.codigo,
    fv.endereco_imovel,
    fv.data_visita,
    fv.nome_corretor,
    fv.status,
    fv.assinatura_visitante,
    fv.assinatura_corretor
  FROM fichas_visita fv
  WHERE fv.codigo = p_codigo
    AND fv.status != 'cancelada';
END;
$$;

-- Permitir execução anônima (necessário para assinatura pública)
GRANT EXECUTE ON FUNCTION public.get_ficha_for_signature(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ficha_for_signature(text) TO authenticated;

-- Dropar a política perigosa que expõe todos os dados PII
DROP POLICY IF EXISTS "Acesso público para feedback por código" ON public.fichas_visita;