
-- 1. Fix organization_invites
DROP POLICY IF EXISTS "Public can read invite by token" ON public.organization_invites;
DROP POLICY IF EXISTS "Anyone can read active invites" ON public.organization_invites;

CREATE OR REPLACE FUNCTION public.lookup_invite_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  accepted_at timestamptz,
  organization_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oi.id,
    oi.email,
    oi.role::text,
    oi.expires_at,
    oi.accepted_at,
    o.name AS organization_name
  FROM public.organization_invites oi
  JOIN public.organizations o ON o.id = oi.organization_id
  WHERE oi.token = p_token
    AND oi.accepted_at IS NULL
    AND oi.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_invite_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_invite_by_token(text) TO authenticated;

CREATE POLICY "Users can accept their own invite"
  ON public.organization_invites FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2. Fix documentos-proposta storage
DROP POLICY IF EXISTS "Authenticated can view documentos proposta" ON storage.objects;

CREATE POLICY "Org members can view own proposal documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos-proposta'
    AND EXISTS (
      SELECT 1 FROM public.propostas_compra pc
      WHERE pc.organization_id = get_user_org_id(auth.uid())
        AND (
          pc.cnh_url LIKE '%' || name || '%'
          OR pc.assinatura_proponente LIKE '%' || name || '%'
        )
    )
  );

-- 3. Add DELETE policy for agendamentos_visita
CREATE POLICY "Org members can delete own agendamentos"
  ON public.agendamentos_visita FOR DELETE
  TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
