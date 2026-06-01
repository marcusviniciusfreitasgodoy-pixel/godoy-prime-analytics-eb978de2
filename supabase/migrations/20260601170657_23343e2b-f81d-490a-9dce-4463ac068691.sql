
-- 1. Add columns to agendamentos_visita
ALTER TABLE public.agendamentos_visita
  ADD COLUMN IF NOT EXISTS token_confirmacao text UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS confirmada_pelo_cliente_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmada_pelo_cliente_ip text,
  ADD COLUMN IF NOT EXISTS acao_cliente text,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento_cliente text,
  ADD COLUMN IF NOT EXISTS reagendado_para_id uuid REFERENCES public.agendamentos_visita(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_visita_token ON public.agendamentos_visita (token_confirmacao);

-- 2. Trigger to auto-generate token on insert
CREATE OR REPLACE FUNCTION public.gerar_token_confirmacao_visita()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.token_confirmacao IS NULL THEN
    NEW.token_confirmacao := encode(gen_random_bytes(24), 'base64');
    -- url-safe
    NEW.token_confirmacao := replace(replace(replace(NEW.token_confirmacao, '+', '-'), '/', '_'), '=', '');
  END IF;
  IF NEW.token_expira_em IS NULL THEN
    NEW.token_expira_em := NEW.data_hora;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_token_confirmacao_visita ON public.agendamentos_visita;
CREATE TRIGGER trg_gerar_token_confirmacao_visita
BEFORE INSERT ON public.agendamentos_visita
FOR EACH ROW
EXECUTE FUNCTION public.gerar_token_confirmacao_visita();

-- Backfill tokens for existing rows
UPDATE public.agendamentos_visita
SET token_confirmacao = replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', ''),
    token_expira_em = data_hora
WHERE token_confirmacao IS NULL;

-- 3. Audit table
CREATE TABLE IF NOT EXISTS public.visita_confirmacao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos_visita(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'visualizou' | 'confirmou' | 'cancelou' | 'reagendou'
  ip text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.visita_confirmacao_eventos TO authenticated;
GRANT ALL ON public.visita_confirmacao_eventos TO service_role;

ALTER TABLE public.visita_confirmacao_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins/gerentes can view confirmacao eventos"
ON public.visita_confirmacao_eventos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendamentos_visita a
    WHERE a.id = visita_confirmacao_eventos.agendamento_id
      AND a.organization_id = public.get_user_org_id(auth.uid())
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role))
  )
);

CREATE INDEX IF NOT EXISTS idx_visita_confirmacao_eventos_agendamento ON public.visita_confirmacao_eventos (agendamento_id, created_at DESC);
