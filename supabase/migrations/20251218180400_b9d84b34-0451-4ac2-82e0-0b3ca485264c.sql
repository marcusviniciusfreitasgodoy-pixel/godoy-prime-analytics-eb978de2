-- =============================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA
-- =============================================

-- 1. ITBI_TRANSACTIONS: Remover acesso público e exigir autenticação
-- Drop das políticas públicas existentes
DROP POLICY IF EXISTS "Acesso público para visualização de transações ITBI" ON public.itbi_transactions;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar transações" ON public.itbi_transactions;

-- Nova política: APENAS usuários autenticados podem visualizar
CREATE POLICY "Apenas usuários autenticados podem visualizar transações"
ON public.itbi_transactions
FOR SELECT
TO authenticated
USING (true);

-- Admins podem gerenciar (INSERT/UPDATE/DELETE via service role ou admin)
CREATE POLICY "Admins podem gerenciar transações ITBI"
ON public.itbi_transactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Drop da política de INSERT que bloqueia tudo
DROP POLICY IF EXISTS "Apenas sistema pode inserir transações" ON public.itbi_transactions;


-- 2. LEADS: Manter INSERT público mas remover políticas duplicadas
-- Drop de políticas duplicadas
DROP POLICY IF EXISTS "Permitir cadastro público de leads" ON public.leads;

-- A política "Qualquer pessoa pode se cadastrar como lead" já existe e é suficiente para INSERT

-- 3. CONDOMINIOS_MAPEAMENTO: Exigir autenticação para acesso
DROP POLICY IF EXISTS "Acesso público para visualização de condomínios" ON public.condominios_mapeamento;

-- Manter apenas acesso autenticado
-- A política "Usuários autenticados podem visualizar condomínios" já existe

-- 4. VALUATION_CHARACTERISTICS: Exigir autenticação
DROP POLICY IF EXISTS "Acesso público para visualização de características" ON public.valuation_characteristics;

-- 5. VALUATION_DOCUMENTATION_FACTORS: Exigir autenticação
DROP POLICY IF EXISTS "Acesso público para visualização de fatores" ON public.valuation_documentation_factors;

-- 6. IA_VALUATION_WEIGHTS: Exigir autenticação
DROP POLICY IF EXISTS "Acesso público para visualização de pesos" ON public.ia_valuation_weights;

-- 7. SOFIA_KNOWLEDGE_BASE: Exigir autenticação para acesso
DROP POLICY IF EXISTS "Acesso público para leitura" ON public.sofia_knowledge_base;

-- Criar nova política para acesso autenticado
CREATE POLICY "Usuários autenticados podem visualizar conhecimento"
ON public.sofia_knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true);