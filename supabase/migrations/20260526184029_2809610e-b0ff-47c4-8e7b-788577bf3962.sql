
DROP POLICY IF EXISTS "Public can view disponibilidade" ON public.disponibilidade_corretor;

DROP POLICY IF EXISTS "Leitura publica iptu_imoveis" ON public.iptu_imoveis;
CREATE POLICY "Authenticated can view iptu_imoveis" ON public.iptu_imoveis FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage org invites" ON public.organization_invites;

DROP POLICY IF EXISTS "Org admins can manage knowledge base" ON public.sofia_knowledge_base;
DROP POLICY IF EXISTS "Org members can view knowledge base" ON public.sofia_knowledge_base;
CREATE POLICY "Org admins can manage knowledge base" ON public.sofia_knowledge_base FOR ALL TO authenticated USING ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view knowledge base" ON public.sofia_knowledge_base FOR SELECT TO authenticated USING ((organization_id = get_user_org_id(auth.uid())) AND (is_active = true));

DROP POLICY IF EXISTS "Org admins can manage characteristics" ON public.valuation_characteristics;
DROP POLICY IF EXISTS "Org members can view characteristics" ON public.valuation_characteristics;
CREATE POLICY "Org admins can manage characteristics" ON public.valuation_characteristics FOR ALL TO authenticated USING ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view characteristics" ON public.valuation_characteristics FOR SELECT TO authenticated USING (organization_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Org admins can manage documentation factors" ON public.valuation_documentation_factors;
DROP POLICY IF EXISTS "Org members can view documentation factors" ON public.valuation_documentation_factors;
CREATE POLICY "Org admins can manage documentation factors" ON public.valuation_documentation_factors FOR ALL TO authenticated USING ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view documentation factors" ON public.valuation_documentation_factors FOR SELECT TO authenticated USING (organization_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Org admins can manage checklist categories" ON public.vistoria_checklist_categories;
DROP POLICY IF EXISTS "Org members can view checklist categories" ON public.vistoria_checklist_categories;
CREATE POLICY "Org admins can manage checklist categories" ON public.vistoria_checklist_categories FOR ALL TO authenticated USING ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view checklist categories" ON public.vistoria_checklist_categories FOR SELECT TO authenticated USING (organization_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Org admins can manage checklist items" ON public.vistoria_checklist_items;
DROP POLICY IF EXISTS "Org members can view checklist items" ON public.vistoria_checklist_items;
CREATE POLICY "Org admins can manage checklist items" ON public.vistoria_checklist_items FOR ALL TO authenticated USING ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((organization_id = get_user_org_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view checklist items" ON public.vistoria_checklist_items FOR SELECT TO authenticated USING (organization_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Org members can create valuation responses" ON public.valuation_responses;
DROP POLICY IF EXISTS "Org members can delete valuation responses" ON public.valuation_responses;
DROP POLICY IF EXISTS "Org members can update valuation responses" ON public.valuation_responses;
DROP POLICY IF EXISTS "Org members can view valuation responses" ON public.valuation_responses;
CREATE POLICY "Org members can view valuation responses" ON public.valuation_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.valuations v WHERE v.id = valuation_responses.valuation_id AND v.organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Org members can create valuation responses" ON public.valuation_responses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.valuations v WHERE v.id = valuation_responses.valuation_id AND v.organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Org members can update valuation responses" ON public.valuation_responses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.valuations v WHERE v.id = valuation_responses.valuation_id AND v.organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Org members can delete valuation responses" ON public.valuation_responses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.valuations v WHERE v.id = valuation_responses.valuation_id AND v.organization_id = get_user_org_id(auth.uid())));
