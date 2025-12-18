-- Tabela para rastrear atividade de usuários autenticados
CREATE TABLE public.user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action_type varchar(50) NOT NULL,
  action_details jsonb DEFAULT '{}',
  page_path varchar(255),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_user_activity_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_action_type ON public.user_activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias atividades
CREATE POLICY "Usuários podem ver suas atividades"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem registrar suas atividades
CREATE POLICY "Usuários podem registrar atividades"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todas as atividades
CREATE POLICY "Admins podem ver todas atividades"
ON public.user_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- View agregada para relatório de atividade por usuário
CREATE OR REPLACE VIEW public.view_user_activity_summary AS
SELECT 
  u.user_id,
  p.full_name,
  p.phone,
  COUNT(*) as total_actions,
  COUNT(DISTINCT DATE(u.created_at)) as active_days,
  COUNT(*) FILTER (WHERE u.action_type = 'login') as logins,
  COUNT(*) FILTER (WHERE u.action_type = 'valuation') as valuations,
  COUNT(*) FILTER (WHERE u.action_type = 'vistoria') as vistorias,
  COUNT(*) FILTER (WHERE u.action_type = 'search') as searches,
  COUNT(*) FILTER (WHERE u.action_type = 'export') as exports,
  MIN(u.created_at) as first_activity,
  MAX(u.created_at) as last_activity
FROM public.user_activity_logs u
LEFT JOIN public.profiles p ON p.id = u.user_id
GROUP BY u.user_id, p.full_name, p.phone;