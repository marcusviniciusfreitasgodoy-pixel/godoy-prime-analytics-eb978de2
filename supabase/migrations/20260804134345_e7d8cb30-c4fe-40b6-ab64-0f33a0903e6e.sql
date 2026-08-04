CREATE TABLE public.itbi_geo_staging (
  logradouro text NOT NULL,
  bairro text,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itbi_geo_staging TO authenticated;
GRANT ALL ON public.itbi_geo_staging TO service_role;
ALTER TABLE public.itbi_geo_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam staging de geocodificacao"
ON public.itbi_geo_staging FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));