
CREATE TABLE IF NOT EXISTS public.analista_imobiliario_rate_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  ip_hash TEXT,
  status INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analista_imobiliario_rate_log_user_time_idx
  ON public.analista_imobiliario_rate_log (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.analista_imobiliario_rate_log TO authenticated;

ALTER TABLE public.analista_imobiliario_rate_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_analista_rate_log_select" ON public.analista_imobiliario_rate_log;
CREATE POLICY "own_analista_rate_log_select" ON public.analista_imobiliario_rate_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_analista_rate_log_insert" ON public.analista_imobiliario_rate_log;
CREATE POLICY "own_analista_rate_log_insert" ON public.analista_imobiliario_rate_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
