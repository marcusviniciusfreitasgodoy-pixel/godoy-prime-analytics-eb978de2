
-- Passo 1: Remover política com recursão infinita
DROP POLICY IF EXISTS "Admin or superadmin can manage roles" ON public.user_roles;

-- Passo 2: Criar função RPC SECURITY DEFINER para listar corretores
CREATE OR REPLACE FUNCTION public.get_corretores_list()
RETURNS TABLE(id uuid, full_name text, phone text, email text, creci text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id(auth.uid());
  
  RETURN QUERY
  SELECT p.id, p.full_name, p.phone, p.email, p.creci
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.organization_id = v_org_id
  ORDER BY p.full_name;
END;
$$;
