-- Allow public read access to fichas_visita by codigo for feedback functionality
CREATE POLICY "Acesso público para feedback por código"
ON public.fichas_visita
FOR SELECT
USING (true);