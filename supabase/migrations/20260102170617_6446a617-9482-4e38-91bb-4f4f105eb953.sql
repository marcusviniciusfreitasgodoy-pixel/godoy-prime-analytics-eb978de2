-- Corrigir a política de INSERT para feedbacks_visita
-- Remover a política restrictive e criar como permissive

DROP POLICY IF EXISTS "Qualquer pessoa pode criar feedback" ON public.feedbacks_visita;

CREATE POLICY "Qualquer pessoa pode criar feedback" 
ON public.feedbacks_visita 
FOR INSERT 
TO public
WITH CHECK (true);