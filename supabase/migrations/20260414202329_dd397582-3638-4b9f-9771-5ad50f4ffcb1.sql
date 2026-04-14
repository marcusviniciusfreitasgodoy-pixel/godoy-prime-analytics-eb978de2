ALTER TABLE public.condominios_mapeamento 
  ADD COLUMN IF NOT EXISTS google_place_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_maps_uri text,
  ADD COLUMN IF NOT EXISTS google_editorial_summary text,
  ADD COLUMN IF NOT EXISTS google_photos_refs text[] DEFAULT '{}';