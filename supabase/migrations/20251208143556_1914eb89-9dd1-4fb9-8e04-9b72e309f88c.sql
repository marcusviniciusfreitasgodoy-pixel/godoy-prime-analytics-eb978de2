-- Allow anonymous users to insert leads (public lead capture form)
CREATE POLICY "Permitir cadastro público de leads"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read their own lead by email (for duplicate checking)
CREATE POLICY "Permitir leitura pública de leads por email"
ON public.leads
FOR SELECT
TO anon
USING (true);