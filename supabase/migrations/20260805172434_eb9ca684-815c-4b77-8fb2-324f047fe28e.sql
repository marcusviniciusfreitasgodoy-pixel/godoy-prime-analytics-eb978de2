DROP POLICY IF EXISTS "Public can read shared valuation PDFs" ON storage.objects;

CREATE POLICY "Org members can read shared valuation PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avaliacoes-publicas'
  AND (storage.foldername(name))[1] = (get_user_org_id(auth.uid()))::text
);

DROP POLICY IF EXISTS "Org members can view own proposal documents" ON storage.objects;

CREATE POLICY "Org members can view own proposal documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-proposta'
  AND EXISTS (
    SELECT 1 FROM public.propostas_compra pc
    WHERE pc.organization_id = get_user_org_id(auth.uid())
      AND (storage.foldername(storage.objects.name))[1] = pc.codigo
  )
);