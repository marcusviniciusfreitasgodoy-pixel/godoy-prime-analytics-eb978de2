
-- =====================================================
-- FIX: Change RLS policies from PUBLIC to AUTHENTICATED
-- This prevents anonymous users from accessing org-scoped data
-- =====================================================

-- PROFILES: restrict to authenticated
DROP POLICY IF EXISTS "Org members can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org or superadmin" ON public.profiles;

CREATE POLICY "Org members can view team profiles" ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Users can view profiles in their org or superadmin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR organization_id = get_user_org_id(auth.uid()) OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'));

-- LEADS: restrict SELECT/UPDATE/DELETE to authenticated, keep INSERT public for lead capture
DROP POLICY IF EXISTS "Org admins can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Org admins/gerentes can view leads" ON public.leads;
DROP POLICY IF EXISTS "Permitir leitura pública de leads por email" ON public.leads;

CREATE POLICY "Org admins can manage leads" ON public.leads FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Org admins/gerentes can view leads" ON public.leads FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente')));

-- VALUATIONS: restrict to authenticated
DROP POLICY IF EXISTS "Org members can create valuations" ON public.valuations;
DROP POLICY IF EXISTS "Org members can delete valuations" ON public.valuations;
DROP POLICY IF EXISTS "Org members can update valuations" ON public.valuations;
DROP POLICY IF EXISTS "Org members can view valuations" ON public.valuations;

CREATE POLICY "Org members can create valuations" ON public.valuations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete valuations" ON public.valuations FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Org members can update valuations" ON public.valuations FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view valuations" ON public.valuations FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- VISTORIAS: restrict to authenticated
DROP POLICY IF EXISTS "Org members can create vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Org members can delete vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Org members can update vistorias" ON public.vistorias;
DROP POLICY IF EXISTS "Org members can view vistorias" ON public.vistorias;

CREATE POLICY "Org members can create vistorias" ON public.vistorias FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete vistorias" ON public.vistorias FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Org members can update vistorias" ON public.vistorias FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view vistorias" ON public.vistorias FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- FICHAS_VISITA: restrict to authenticated
DROP POLICY IF EXISTS "Org members can create fichas" ON public.fichas_visita;
DROP POLICY IF EXISTS "Org members can update fichas" ON public.fichas_visita;
DROP POLICY IF EXISTS "Org members can view fichas" ON public.fichas_visita;

CREATE POLICY "Org members can create fichas" ON public.fichas_visita FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update fichas" ON public.fichas_visita FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view fichas" ON public.fichas_visita FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- PROPOSTAS_COMPRA: restrict SELECT/UPDATE to authenticated, keep INSERT public
DROP POLICY IF EXISTS "Org members can update propostas" ON public.propostas_compra;
DROP POLICY IF EXISTS "Org members can view propostas" ON public.propostas_compra;
DROP POLICY IF EXISTS "Public pode ler proposta por codigo" ON public.propostas_compra;

CREATE POLICY "Org members can update propostas" ON public.propostas_compra FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view propostas" ON public.propostas_compra FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- AGENDAMENTOS_VISITA: restrict SELECT/UPDATE to authenticated
DROP POLICY IF EXISTS "Org members can create agendamentos" ON public.agendamentos_visita;
DROP POLICY IF EXISTS "Org members can update agendamentos" ON public.agendamentos_visita;
DROP POLICY IF EXISTS "Org members can view agendamentos" ON public.agendamentos_visita;

CREATE POLICY "Org members can create agendamentos" ON public.agendamentos_visita FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()) OR organization_id IS NOT NULL);
CREATE POLICY "Org members can update agendamentos" ON public.agendamentos_visita FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view agendamentos" ON public.agendamentos_visita FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- FEEDBACKS_VISITA: restrict SELECT to authenticated (INSERT already has anon policy)
DROP POLICY IF EXISTS "Org members can view feedbacks" ON public.feedbacks_visita;

CREATE POLICY "Org members can view feedbacks" ON public.feedbacks_visita FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM fichas_visita fv WHERE fv.id = feedbacks_visita.ficha_visita_id AND fv.organization_id = get_user_org_id(auth.uid())));

-- ATIVIDADES_LEAD: restrict to authenticated
DROP POLICY IF EXISTS "Org members can create atividades" ON public.atividades_lead;
DROP POLICY IF EXISTS "Org members can delete atividades" ON public.atividades_lead;
DROP POLICY IF EXISTS "Org members can view atividades" ON public.atividades_lead;

CREATE POLICY "Org members can create atividades" ON public.atividades_lead FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM leads l WHERE l.id = atividades_lead.lead_id AND l.organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Org members can delete atividades" ON public.atividades_lead FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM leads l WHERE l.id = atividades_lead.lead_id AND l.organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Org members can view atividades" ON public.atividades_lead FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM leads l WHERE l.id = atividades_lead.lead_id AND l.organization_id = get_user_org_id(auth.uid())));

-- NOTAS_LEAD: restrict to authenticated
DROP POLICY IF EXISTS "Org members can create notas" ON public.notas_lead;
DROP POLICY IF EXISTS "Org members can view notas" ON public.notas_lead;
DROP POLICY IF EXISTS "Users can delete own notas" ON public.notas_lead;
DROP POLICY IF EXISTS "Users can update own notas" ON public.notas_lead;

CREATE POLICY "Org members can create notas" ON public.notas_lead FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM leads l WHERE l.id = notas_lead.lead_id AND l.organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Org members can view notas" ON public.notas_lead FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM leads l WHERE l.id = notas_lead.lead_id AND l.organization_id = get_user_org_id(auth.uid())) AND (privada = false OR autor_id = auth.uid()));
CREATE POLICY "Users can delete own notas" ON public.notas_lead FOR DELETE TO authenticated
  USING (autor_id = auth.uid());
CREATE POLICY "Users can update own notas" ON public.notas_lead FOR UPDATE TO authenticated
  USING (autor_id = auth.uid());

-- TAREFAS: restrict to authenticated
DROP POLICY IF EXISTS "Org members can manage tarefas" ON public.tarefas;

CREATE POLICY "Org members can manage tarefas" ON public.tarefas FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- PRICING_STRATEGIES: restrict to authenticated
DROP POLICY IF EXISTS "Org members can create strategies" ON public.pricing_strategies;
DROP POLICY IF EXISTS "Org members can delete strategies" ON public.pricing_strategies;
DROP POLICY IF EXISTS "Org members can update strategies" ON public.pricing_strategies;
DROP POLICY IF EXISTS "Org members can view strategies" ON public.pricing_strategies;

CREATE POLICY "Org members can create strategies" ON public.pricing_strategies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can delete strategies" ON public.pricing_strategies FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Org members can update strategies" ON public.pricing_strategies FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view strategies" ON public.pricing_strategies FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- USER_ACTIVITY_LOGS: restrict to authenticated
DROP POLICY IF EXISTS "Org members can insert activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Org members can view activity logs" ON public.user_activity_logs;

CREATE POLICY "Org members can insert activity logs" ON public.user_activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view activity logs" ON public.user_activity_logs FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- FEEDBACKS_CORRETOR: restrict to authenticated
DROP POLICY IF EXISTS "Users can delete their org broker feedbacks" ON public.feedbacks_corretor;
DROP POLICY IF EXISTS "Users can insert their org broker feedbacks" ON public.feedbacks_corretor;
DROP POLICY IF EXISTS "Users can update their org broker feedbacks" ON public.feedbacks_corretor;
DROP POLICY IF EXISTS "Users can view their org broker feedbacks" ON public.feedbacks_corretor;

CREATE POLICY "Users can delete their org broker feedbacks" ON public.feedbacks_corretor FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their org broker feedbacks" ON public.feedbacks_corretor FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update their org broker feedbacks" ON public.feedbacks_corretor FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can view their org broker feedbacks" ON public.feedbacks_corretor FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- FEEDBACK_CORRETOR_CONFIG: restrict to authenticated
DROP POLICY IF EXISTS "Users can delete their org fields" ON public.feedback_corretor_config_fields;
DROP POLICY IF EXISTS "Users can insert their org fields" ON public.feedback_corretor_config_fields;
DROP POLICY IF EXISTS "Users can update their org fields" ON public.feedback_corretor_config_fields;
DROP POLICY IF EXISTS "Users can view their org fields" ON public.feedback_corretor_config_fields;

CREATE POLICY "Users can delete their org fields" ON public.feedback_corretor_config_fields FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their org fields" ON public.feedback_corretor_config_fields FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update their org fields" ON public.feedback_corretor_config_fields FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can view their org fields" ON public.feedback_corretor_config_fields FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their org sections" ON public.feedback_corretor_config_sections;
DROP POLICY IF EXISTS "Users can insert their org sections" ON public.feedback_corretor_config_sections;
DROP POLICY IF EXISTS "Users can update their org sections" ON public.feedback_corretor_config_sections;
DROP POLICY IF EXISTS "Users can view their org sections" ON public.feedback_corretor_config_sections;

CREATE POLICY "Users can delete their org sections" ON public.feedback_corretor_config_sections FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert their org sections" ON public.feedback_corretor_config_sections FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update their org sections" ON public.feedback_corretor_config_sections FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can view their org sections" ON public.feedback_corretor_config_sections FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- FORM_CONFIG: restrict to authenticated
DROP POLICY IF EXISTS "Users can delete own org form config fields" ON public.form_config_fields;
DROP POLICY IF EXISTS "Users can insert own org form config fields" ON public.form_config_fields;
DROP POLICY IF EXISTS "Users can update own org form config fields" ON public.form_config_fields;
DROP POLICY IF EXISTS "Users can view own org form config fields" ON public.form_config_fields;

CREATE POLICY "Users can delete own org form config fields" ON public.form_config_fields FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert own org form config fields" ON public.form_config_fields FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update own org form config fields" ON public.form_config_fields FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can view own org form config fields" ON public.form_config_fields FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Users can delete own org form config sections" ON public.form_config_sections;
DROP POLICY IF EXISTS "Users can insert own org form config sections" ON public.form_config_sections;
DROP POLICY IF EXISTS "Users can update own org form config sections" ON public.form_config_sections;
DROP POLICY IF EXISTS "Users can view own org form config sections" ON public.form_config_sections;

CREATE POLICY "Users can delete own org form config sections" ON public.form_config_sections FOR DELETE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can insert own org form config sections" ON public.form_config_sections FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can update own org form config sections" ON public.form_config_sections FOR UPDATE TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Users can view own org form config sections" ON public.form_config_sections FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- NOTIFICATION_SETTINGS: restrict to authenticated
DROP POLICY IF EXISTS "Org members can insert notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Org members can update notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Org members can view notification settings" ON public.notification_settings;

CREATE POLICY "Org members can insert notification settings" ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can update notification settings" ON public.notification_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Org members can view notification settings" ON public.notification_settings FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

-- DISPONIBILIDADE_CORRETOR: restrict manage to authenticated, keep public SELECT
DROP POLICY IF EXISTS "Org members can manage disponibilidade" ON public.disponibilidade_corretor;

CREATE POLICY "Org members can manage disponibilidade" ON public.disponibilidade_corretor FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- ORGANIZATION_INVITES: fix superadmin policy to authenticated
DROP POLICY IF EXISTS "superadmin_read_all_orgs" ON public.organizations;
DROP POLICY IF EXISTS "superadmin_update_all_orgs" ON public.organizations;

CREATE POLICY "superadmin_read_all_orgs" ON public.organizations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin') OR id = get_user_org_id(auth.uid()));
CREATE POLICY "superadmin_update_all_orgs" ON public.organizations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'));

-- USER_ROLES: restrict to authenticated
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- LOGRADOUROS_GEO: restrict write to authenticated, keep public read (reference data)
DROP POLICY IF EXISTS "Apenas admins podem gerenciar logradouros" ON public.logradouros_geo;
DROP POLICY IF EXISTS "Service role pode gerenciar logradouros" ON public.logradouros_geo;

CREATE POLICY "Apenas admins podem gerenciar logradouros" ON public.logradouros_geo FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- LOGRADOUROS_NORMALIZACAO: restrict write to authenticated
DROP POLICY IF EXISTS "Apenas admins podem modificar logradouros" ON public.logradouros_normalizacao;

CREATE POLICY "Apenas admins podem modificar logradouros" ON public.logradouros_normalizacao FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
