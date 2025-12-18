-- Recriar a view com SECURITY INVOKER para usar permissões do usuário consultante
DROP VIEW IF EXISTS public.view_user_activity_summary;

CREATE VIEW public.view_user_activity_summary 
WITH (security_invoker = true) AS
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