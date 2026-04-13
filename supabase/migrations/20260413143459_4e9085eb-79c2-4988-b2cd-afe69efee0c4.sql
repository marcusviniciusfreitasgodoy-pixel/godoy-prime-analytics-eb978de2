
-- 1. Fix WhatsApp message logs: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert whatsapp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Service role can insert whatsapp logs"
  ON public.whatsapp_message_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Fix mutable search_path on application functions
ALTER FUNCTION public.atualizar_resumo_logradouros() SET search_path = public;
ALTER FUNCTION public.get_condo_itbi_history(double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION public.get_condominios_bbox(double precision, double precision, double precision, double precision, integer) SET search_path = public;
ALTER FUNCTION public.get_coverage_stats() SET search_path = public;
ALTER FUNCTION public.get_logradouros_sem_geo(integer) SET search_path = public;
ALTER FUNCTION public.get_lotes_pal_bbox(double precision, double precision, double precision, double precision, integer) SET search_path = public;
ALTER FUNCTION public.get_territorial_kpis() SET search_path = public;
ALTER FUNCTION public.identificar_condominios_pal() SET search_path = public;
ALTER FUNCTION public.normalizar_logradouro(text) SET search_path = public;
ALTER FUNCTION public.processar_iptu_2025() SET search_path = public;
ALTER FUNCTION public.recalcular_unidades_estimadas() SET search_path = public;
