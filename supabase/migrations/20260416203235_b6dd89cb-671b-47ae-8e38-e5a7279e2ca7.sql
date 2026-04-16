-- Tabela de histórico de análises
CREATE TABLE public.document_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT,
  tipo_documento TEXT,
  status TEXT,
  status_motivo TEXT,
  dados_extraidos JSONB DEFAULT '{}'::jsonb,
  alertas JSONB DEFAULT '[]'::jsonb,
  validade DATE,
  checklist_item TEXT,
  proximos_passos JSONB DEFAULT '[]'::jsonb,
  confianca TEXT,
  raw_response TEXT,
  ficha_visita_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_analyses_org ON public.document_analyses(organization_id, created_at DESC);
CREATE INDEX idx_document_analyses_user ON public.document_analyses(user_id);
CREATE INDEX idx_document_analyses_ficha ON public.document_analyses(ficha_visita_id) WHERE ficha_visita_id IS NOT NULL;

ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view document analyses"
ON public.document_analyses FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create document analyses"
ON public.document_analyses FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Org members can update document analyses"
ON public.document_analyses FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete document analyses"
ON public.document_analyses FOR DELETE TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE TRIGGER update_document_analyses_updated_at
BEFORE UPDATE ON public.document_analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para os arquivos originais
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-analyses', 'document-analyses', false)
ON CONFLICT (id) DO NOTHING;

-- Estrutura de pasta: {organization_id}/{user_id}/{filename}
CREATE POLICY "Org members can view their analysis files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'document-analyses'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org members can upload analysis files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'document-analyses'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org members can delete their analysis files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'document-analyses'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);