-- Tabela para configurações de notificação WhatsApp
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_confirmacao BOOLEAN NOT NULL DEFAULT true,
  whatsapp_lembrete BOOLEAN NOT NULL DEFAULT true,
  whatsapp_cancelamento BOOLEAN NOT NULL DEFAULT true,
  whatsapp_reagendamento BOOLEAN NOT NULL DEFAULT true,
  lembrete_horas_antes INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notification settings" 
ON public.notification_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" 
ON public.notification_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" 
ON public.notification_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna para rastrear lembretes enviados
ALTER TABLE public.agendamentos_visita 
ADD COLUMN IF NOT EXISTS lembrete_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lembrete_enviado_at TIMESTAMP WITH TIME ZONE;