
CREATE POLICY "Admins podem gerenciar iptu_logradouro_resumo"
ON public.iptu_logradouro_resumo
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
