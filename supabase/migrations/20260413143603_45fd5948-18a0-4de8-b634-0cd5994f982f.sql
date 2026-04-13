
-- Allow service_role to upload (used by public-submit edge function)
CREATE POLICY "Service role can upload proposal docs"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'documentos-proposta');

-- Allow authenticated org members to upload docs to their org's proposals
CREATE POLICY "Org members can upload proposal docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-proposta'
    AND EXISTS (
      SELECT 1 FROM propostas_compra pc
      WHERE pc.organization_id = get_user_org_id(auth.uid())
        AND (storage.foldername(name))[1] = pc.codigo
    )
  );

-- Allow authenticated org members to delete docs from their org's proposals
CREATE POLICY "Org members can delete proposal docs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos-proposta'
    AND EXISTS (
      SELECT 1 FROM propostas_compra pc
      WHERE pc.organization_id = get_user_org_id(auth.uid())
        AND (storage.foldername(name))[1] = pc.codigo
    )
  );
