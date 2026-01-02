-- Tornar explícito para os papéis usados pelo cliente (anon/authenticated)
DROP POLICY IF EXISTS "Qualquer pessoa pode criar feedback" ON public.feedbacks_visita;

CREATE POLICY "Anon pode criar feedback"
ON public.feedbacks_visita
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Autenticado pode criar feedback"
ON public.feedbacks_visita
FOR INSERT
TO authenticated
WITH CHECK (true);