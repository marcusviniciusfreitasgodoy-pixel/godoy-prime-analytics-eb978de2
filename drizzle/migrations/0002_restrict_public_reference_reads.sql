DROP POLICY IF EXISTS "Leitura publica torres" ON public.torres_condominios;
CREATE POLICY "Leitura autenticada torres" ON public.torres_condominios FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Leitura publica iptu_2025" ON public.iptu_2025_logradouro;
CREATE POLICY "Leitura autenticada iptu_2025" ON public.iptu_2025_logradouro FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Leitura publica edificacoes" ON public.edificacoes_geo;
CREATE POLICY "Leitura autenticada edificacoes" ON public.edificacoes_geo FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;
CREATE POLICY "Authenticated can view company assets" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);