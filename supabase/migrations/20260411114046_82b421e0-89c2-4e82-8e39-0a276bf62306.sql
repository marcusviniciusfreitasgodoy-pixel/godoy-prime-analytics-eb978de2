
-- Create WhatsApp message logs table
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone_destino TEXT NOT NULL,
  tipo_mensagem TEXT NOT NULL,
  mensagem_texto TEXT,
  status_envio TEXT NOT NULL DEFAULT 'pending',
  resposta_api JSONB,
  message_id_externo TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  usuario_id UUID,
  dados_contexto JSONB DEFAULT '{}'::jsonb,
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Org members can view their logs
CREATE POLICY "Org members can view whatsapp logs"
ON public.whatsapp_message_logs
FOR SELECT
TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

-- Admins can delete logs
CREATE POLICY "Admins can delete whatsapp logs"
ON public.whatsapp_message_logs
FOR DELETE
TO authenticated
USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (edge function uses service role)
CREATE POLICY "Service role can insert whatsapp logs"
ON public.whatsapp_message_logs
FOR INSERT
TO public
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_whatsapp_logs_org_created ON public.whatsapp_message_logs(organization_id, created_at DESC);
CREATE INDEX idx_whatsapp_logs_tipo ON public.whatsapp_message_logs(tipo_mensagem);
