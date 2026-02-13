
-- Remove permissive public INSERT on propostas_compra (already handled by public-submit edge function)
DROP POLICY IF EXISTS "Qualquer pessoa pode criar proposta" ON public.propostas_compra;
