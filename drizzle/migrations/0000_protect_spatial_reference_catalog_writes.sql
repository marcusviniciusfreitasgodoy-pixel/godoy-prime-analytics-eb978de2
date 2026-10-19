REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.spatial_ref_sys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated;
