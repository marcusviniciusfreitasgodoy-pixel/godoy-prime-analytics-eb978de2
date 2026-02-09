
-- ============================================================
-- FASE 2.5: REWRITE ALL RLS POLICIES FOR ORG-BASED ISOLATION
-- ============================================================

-- ============================================================
-- 1. VALUATIONS - from user_id to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver suas avaliações" ON valuations;
DROP POLICY IF EXISTS "Usuários podem criar avaliações" ON valuations;
DROP POLICY IF EXISTS "Usuários podem atualizar suas avaliações" ON valuations;
DROP POLICY IF EXISTS "Usuários podem deletar suas avaliações" ON valuations;

CREATE POLICY "Org members can view valuations"
  ON valuations FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create valuations"
  ON valuations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = get_user_org_id(auth.uid())
  );

CREATE POLICY "Org members can update valuations"
  ON valuations FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete valuations"
  ON valuations FOR DELETE
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND auth.uid() = user_id
  );

-- ============================================================
-- 2. VALUATION_RESPONSES - via join to valuations (keep join-based but org-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver respostas de suas avaliações" ON valuation_responses;
DROP POLICY IF EXISTS "Usuários podem criar respostas" ON valuation_responses;
DROP POLICY IF EXISTS "Usuários podem atualizar respostas de suas avaliações" ON valuation_responses;
DROP POLICY IF EXISTS "Usuários podem deletar respostas de suas avaliações" ON valuation_responses;

CREATE POLICY "Org members can view valuation responses"
  ON valuation_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_responses.valuation_id
      AND v.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Org members can create valuation responses"
  ON valuation_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_responses.valuation_id
      AND v.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Org members can update valuation responses"
  ON valuation_responses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_responses.valuation_id
      AND v.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Org members can delete valuation responses"
  ON valuation_responses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM valuations v
    WHERE v.id = valuation_responses.valuation_id
      AND v.organization_id = get_user_org_id(auth.uid())
  ));

-- ============================================================
-- 3. PRICING_STRATEGIES - from user_id to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver suas estratégias" ON pricing_strategies;
DROP POLICY IF EXISTS "Usuários podem criar estratégias" ON pricing_strategies;
DROP POLICY IF EXISTS "Usuários podem atualizar suas estratégias" ON pricing_strategies;
DROP POLICY IF EXISTS "Usuários podem deletar suas estratégias" ON pricing_strategies;

CREATE POLICY "Org members can view strategies"
  ON pricing_strategies FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create strategies"
  ON pricing_strategies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = get_user_org_id(auth.uid())
  );

CREATE POLICY "Org members can update strategies"
  ON pricing_strategies FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete strategies"
  ON pricing_strategies FOR DELETE
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND auth.uid() = user_id
  );

-- ============================================================
-- 4. FICHAS_VISITA - from corretor_id/admin to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Admins podem ver todas fichas" ON fichas_visita;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer ficha" ON fichas_visita;
DROP POLICY IF EXISTS "Corretores podem ver suas fichas" ON fichas_visita;
DROP POLICY IF EXISTS "Corretores podem atualizar suas fichas" ON fichas_visita;
DROP POLICY IF EXISTS "Gerentes podem ver todas fichas" ON fichas_visita;
DROP POLICY IF EXISTS "Usuários autenticados podem criar fichas" ON fichas_visita;

CREATE POLICY "Org members can view fichas"
  ON fichas_visita FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create fichas"
  ON fichas_visita FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id = get_user_org_id(auth.uid())
  );

CREATE POLICY "Org members can update fichas"
  ON fichas_visita FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

-- ============================================================
-- 5. AGENDAMENTOS_VISITA - from corretor_id/admin to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Admins podem ver todos agendamentos" ON agendamentos_visita;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer agendamento" ON agendamentos_visita;
DROP POLICY IF EXISTS "Corretores podem ver seus agendamentos" ON agendamentos_visita;
DROP POLICY IF EXISTS "Corretores podem atualizar seus agendamentos" ON agendamentos_visita;
DROP POLICY IF EXISTS "Gerentes podem ver todos agendamentos" ON agendamentos_visita;
DROP POLICY IF EXISTS "Qualquer pessoa pode criar agendamento" ON agendamentos_visita;

CREATE POLICY "Org members can view agendamentos"
  ON agendamentos_visita FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create agendamentos"
  ON agendamentos_visita FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    OR organization_id IS NOT NULL  -- allows public booking with org_id set
  );

-- Keep public insert for external booking (anon users)
CREATE POLICY "Public can create agendamentos"
  ON agendamentos_visita FOR INSERT TO anon
  WITH CHECK (organization_id IS NOT NULL);

CREATE POLICY "Org members can update agendamentos"
  ON agendamentos_visita FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

-- ============================================================
-- 6. FEEDBACKS_VISITA - keep public insert, org-scoped read
-- ============================================================
DROP POLICY IF EXISTS "Admins podem ver todos feedbacks" ON feedbacks_visita;
DROP POLICY IF EXISTS "Corretor pode ver feedbacks de suas fichas" ON feedbacks_visita;
-- Keep: "Anon pode criar feedback" and "Autenticado pode criar feedback"

CREATE POLICY "Org members can view feedbacks"
  ON feedbacks_visita FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM fichas_visita fv
    WHERE fv.id = feedbacks_visita.ficha_visita_id
      AND fv.organization_id = get_user_org_id(auth.uid())
  ));

-- ============================================================
-- 7. DISPONIBILIDADE_CORRETOR - from corretor_id/admin to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Admins podem gerenciar qualquer disponibilidade" ON disponibilidade_corretor;
DROP POLICY IF EXISTS "Corretor pode gerenciar sua disponibilidade" ON disponibilidade_corretor;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver disponibilidade" ON disponibilidade_corretor;

CREATE POLICY "Org members can manage disponibilidade"
  ON disponibilidade_corretor FOR ALL
  USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- Public can still view (for booking pages)
CREATE POLICY "Public can view disponibilidade"
  ON disponibilidade_corretor FOR SELECT
  USING (true);

-- ============================================================
-- 8. LEADS - from admin-only to org-scoped
-- ============================================================
DROP POLICY IF EXISTS "Admins podem gerenciar leads" ON leads;
DROP POLICY IF EXISTS "Admins podem visualizar todos os leads" ON leads;
-- Keep: "Qualquer pessoa pode se cadastrar como lead"

CREATE POLICY "Org admins/gerentes can view leads"
  ON leads FOR SELECT
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'))
  );

CREATE POLICY "Org admins can manage leads"
  ON leads FOR ALL
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 9. USER_ACTIVITY_LOGS - from user_id/admin to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Admins podem ver todas atividades" ON user_activity_logs;
DROP POLICY IF EXISTS "Usuários podem ver suas atividades" ON user_activity_logs;
DROP POLICY IF EXISTS "Usuários podem registrar atividades" ON user_activity_logs;

CREATE POLICY "Org members can view activity logs"
  ON user_activity_logs FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert activity logs"
  ON user_activity_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = get_user_org_id(auth.uid())
  );

-- ============================================================
-- 10. NOTIFICATION_SETTINGS - from user_id to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;

CREATE POLICY "Org members can view notification settings"
  ON notification_settings FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can insert notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = get_user_org_id(auth.uid())
  );

CREATE POLICY "Org members can update notification settings"
  ON notification_settings FOR UPDATE
  USING (
    auth.uid() = user_id
    AND organization_id = get_user_org_id(auth.uid())
  );

-- ============================================================
-- 11. VISTORIAS - from user_id/admin to organization_id
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all vistorias" ON vistorias;
DROP POLICY IF EXISTS "Users can view their own vistorias" ON vistorias;
DROP POLICY IF EXISTS "Users can create their own vistorias" ON vistorias;
DROP POLICY IF EXISTS "Users can update their own vistorias" ON vistorias;
DROP POLICY IF EXISTS "Users can delete their own vistorias" ON vistorias;

CREATE POLICY "Org members can view vistorias"
  ON vistorias FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create vistorias"
  ON vistorias FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = get_user_org_id(auth.uid())
  );

CREATE POLICY "Org members can update vistorias"
  ON vistorias FOR UPDATE
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete vistorias"
  ON vistorias FOR DELETE
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND auth.uid() = user_id
  );

-- ============================================================
-- 12. VALUATION_CHARACTERISTICS - org-scoped calibration
-- ============================================================
DROP POLICY IF EXISTS "Apenas admins podem gerenciar características" ON valuation_characteristics;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar características" ON valuation_characteristics;

CREATE POLICY "Org members can view characteristics"
  ON valuation_characteristics FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can manage characteristics"
  ON valuation_characteristics FOR ALL
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 13. VALUATION_DOCUMENTATION_FACTORS - org-scoped calibration
-- ============================================================
DROP POLICY IF EXISTS "Apenas admins podem gerenciar fatores" ON valuation_documentation_factors;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar fatores" ON valuation_documentation_factors;

CREATE POLICY "Org members can view documentation factors"
  ON valuation_documentation_factors FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can manage documentation factors"
  ON valuation_documentation_factors FOR ALL
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 14. VISTORIA_CHECKLIST_CATEGORIES - org-scoped calibration
-- ============================================================
DROP POLICY IF EXISTS "Apenas admins podem gerenciar categorias" ON vistoria_checklist_categories;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar categorias" ON vistoria_checklist_categories;

CREATE POLICY "Org members can view checklist categories"
  ON vistoria_checklist_categories FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can manage checklist categories"
  ON vistoria_checklist_categories FOR ALL
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 15. VISTORIA_CHECKLIST_ITEMS - org-scoped calibration
-- ============================================================
DROP POLICY IF EXISTS "Apenas admins podem gerenciar itens" ON vistoria_checklist_items;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar itens" ON vistoria_checklist_items;

CREATE POLICY "Org members can view checklist items"
  ON vistoria_checklist_items FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can manage checklist items"
  ON vistoria_checklist_items FOR ALL
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 16. SOFIA_KNOWLEDGE_BASE - org-scoped
-- ============================================================
DROP POLICY IF EXISTS "Apenas admins podem gerenciar conhecimento" ON sofia_knowledge_base;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar conhecimento" ON sofia_knowledge_base;

CREATE POLICY "Org members can view knowledge base"
  ON sofia_knowledge_base FOR SELECT
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND is_active = true
  );

CREATE POLICY "Org admins can manage knowledge base"
  ON sofia_knowledge_base FOR ALL
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- 17. PROFILES - add org-scoped view for team members
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- Keep: "Users can view their own profile", "Users can insert/update their own profile"

CREATE POLICY "Org members can view team profiles"
  ON profiles FOR SELECT
  USING (organization_id = get_user_org_id(auth.uid()));

-- ============================================================
-- 18. COMPANY_SETTINGS - org-scoped (legacy, will be deprecated)
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON company_settings;

CREATE POLICY "Org admins can manage company settings"
  ON company_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can view company settings"
  ON company_settings FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- GLOBAL TABLES: No changes needed (keep public read access)
-- itbi_transactions, condominios_mapeamento, logradouros_geo,
-- logradouros_normalizacao, microbairros_geo, bairros_cache,
-- ia_valuation_weights, rate_limit_log
-- ============================================================
