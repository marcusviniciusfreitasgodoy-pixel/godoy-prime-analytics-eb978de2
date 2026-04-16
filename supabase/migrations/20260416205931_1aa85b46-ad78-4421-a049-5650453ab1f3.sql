-- Adiciona colunas de expiração
ALTER TABLE public.document_analyses
  ADD COLUMN IF NOT EXISTS file_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Trigger function para calcular expiração no insert
CREATE OR REPLACE FUNCTION public.set_document_analysis_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.file_expires_at IS NULL THEN
    NEW.file_expires_at := COALESCE(NEW.created_at, now()) + INTERVAL '30 days';
  END IF;
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := COALESCE(NEW.created_at, now()) + INTERVAL '180 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_document_analysis_expiration ON public.document_analyses;
CREATE TRIGGER trg_set_document_analysis_expiration
BEFORE INSERT ON public.document_analyses
FOR EACH ROW
EXECUTE FUNCTION public.set_document_analysis_expiration();

-- Preenche registros existentes
UPDATE public.document_analyses
SET
  file_expires_at = COALESCE(file_expires_at, created_at + INTERVAL '30 days'),
  expires_at = COALESCE(expires_at, created_at + INTERVAL '180 days')
WHERE file_expires_at IS NULL OR expires_at IS NULL;

-- Índices para a limpeza periódica
CREATE INDEX IF NOT EXISTS idx_document_analyses_file_expires_at
  ON public.document_analyses (file_expires_at)
  WHERE file_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_analyses_expires_at
  ON public.document_analyses (expires_at);