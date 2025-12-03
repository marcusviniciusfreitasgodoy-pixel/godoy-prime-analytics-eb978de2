-- Definir security_invoker na view para usar permissões do usuário que consulta
ALTER VIEW public.view_ranking_microbairros SET (security_invoker = true);