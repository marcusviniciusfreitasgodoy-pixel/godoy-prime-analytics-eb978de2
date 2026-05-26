
-- 1) Add public PDF URL column to valuations
ALTER TABLE public.valuations
  ADD COLUMN IF NOT EXISTS public_pdf_url TEXT;

-- 2) Create public storage bucket for shared valuation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('avaliacoes-publicas', 'avaliacoes-publicas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Storage policies
DROP POLICY IF EXISTS "Public can read shared valuation PDFs" ON storage.objects;
CREATE POLICY "Public can read shared valuation PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'avaliacoes-publicas');

DROP POLICY IF EXISTS "Org members can upload shared valuation PDFs" ON storage.objects;
CREATE POLICY "Org members can upload shared valuation PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avaliacoes-publicas'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

DROP POLICY IF EXISTS "Org members can update shared valuation PDFs" ON storage.objects;
CREATE POLICY "Org members can update shared valuation PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avaliacoes-publicas'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

DROP POLICY IF EXISTS "Org members can delete shared valuation PDFs" ON storage.objects;
CREATE POLICY "Org members can delete shared valuation PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avaliacoes-publicas'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);
