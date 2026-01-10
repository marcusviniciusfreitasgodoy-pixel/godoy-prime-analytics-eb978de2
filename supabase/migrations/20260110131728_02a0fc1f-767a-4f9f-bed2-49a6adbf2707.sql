-- Adicionar política de DELETE para valuation_responses
-- Usuários podem deletar respostas de suas próprias avaliações

CREATE POLICY "Usuários podem deletar respostas de suas avaliações" 
ON public.valuation_responses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_responses.valuation_id 
    AND v.user_id = auth.uid()
  )
);

-- Adicionar política de UPDATE para valuation_responses (para futuras edições)
CREATE POLICY "Usuários podem atualizar respostas de suas avaliações" 
ON public.valuation_responses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_responses.valuation_id 
    AND v.user_id = auth.uid()
  )
);