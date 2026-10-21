ALTER POLICY cinto_leitura_autenticada ON public.itbi_cinto TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON TABLE public.itbi_cinto FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.itbi_cinto FROM authenticated;
GRANT SELECT ON TABLE public.itbi_cinto TO authenticated;
GRANT ALL ON TABLE public.itbi_cinto TO service_role;