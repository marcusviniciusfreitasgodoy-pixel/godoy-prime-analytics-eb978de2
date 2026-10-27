DROP POLICY IF EXISTS "Authenticated can view iptu_imoveis" ON public.iptu_imoveis;
CREATE POLICY "Admins can view iptu_imoveis" ON public.iptu_imoveis FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Leitura publica lotes_pal" ON public.lotes_pal;
CREATE POLICY "Leitura autenticada lotes_pal" ON public.lotes_pal FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE SELECT ON public.lotes_pal FROM anon;

DROP POLICY IF EXISTS "Authenticated can view company assets" ON storage.objects;
CREATE POLICY "Org members can view own company assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);