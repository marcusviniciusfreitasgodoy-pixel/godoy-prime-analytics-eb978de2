-- Adicionar políticas para permitir acesso anônimo (sem autenticação) às tabelas de dados públicos

-- itbi_transactions - dados públicos do governo
CREATE POLICY "Acesso público para visualização de transações ITBI" 
ON public.itbi_transactions 
FOR SELECT 
TO anon
USING (true);

-- condominios_mapeamento - dados de referência
CREATE POLICY "Acesso público para visualização de condomínios" 
ON public.condominios_mapeamento 
FOR SELECT 
TO anon
USING (true);

-- ia_valuation_weights - pesos de avaliação (apenas leitura)
CREATE POLICY "Acesso público para visualização de pesos" 
ON public.ia_valuation_weights 
FOR SELECT 
TO anon
USING (true);

-- valuation_characteristics - características de avaliação (apenas leitura)
CREATE POLICY "Acesso público para visualização de características" 
ON public.valuation_characteristics 
FOR SELECT 
TO anon
USING (true);

-- valuation_documentation_factors - fatores de documentação (apenas leitura)
CREATE POLICY "Acesso público para visualização de fatores" 
ON public.valuation_documentation_factors 
FOR SELECT 
TO anon
USING (true);