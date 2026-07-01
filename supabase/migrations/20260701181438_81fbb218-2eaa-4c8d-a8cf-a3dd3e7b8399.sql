
-- company_settings: restrict SELECT to admins only
DROP POLICY IF EXISTS "Org members can view company settings" ON public.company_settings;
CREATE POLICY "Admins can view company settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- agendamentos_visita: SELECT/UPDATE/DELETE scoped to owning corretor or admin/gerente
DROP POLICY IF EXISTS "Org members can view agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Scoped view agendamentos"
  ON public.agendamentos_visita FOR SELECT TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR corretor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can update agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Scoped update agendamentos"
  ON public.agendamentos_visita FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR corretor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can delete own agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Scoped delete agendamentos"
  ON public.agendamentos_visita FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR corretor_id = auth.uid()
    )
  );

-- disponibilidade_corretor: split ALL policy so writes require corretor_id = auth.uid() (or admin/gerente)
DROP POLICY IF EXISTS "Org members can manage disponibilidade" ON public.disponibilidade_corretor;

CREATE POLICY "View disponibilidade in org"
  ON public.disponibilidade_corretor FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Insert own disponibilidade"
  ON public.disponibilidade_corretor FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND (
      corretor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

CREATE POLICY "Update own disponibilidade"
  ON public.disponibilidade_corretor FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      corretor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

CREATE POLICY "Delete own disponibilidade"
  ON public.disponibilidade_corretor FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      corretor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

-- document_analyses: restrict SELECT/UPDATE/DELETE to owner or admin/gerente
DROP POLICY IF EXISTS "Org members can view document analyses" ON public.document_analyses;
CREATE POLICY "Scoped view document analyses"
  ON public.document_analyses FOR SELECT TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

DROP POLICY IF EXISTS "Org members can update document analyses" ON public.document_analyses;
CREATE POLICY "Scoped update document analyses"
  ON public.document_analyses FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

DROP POLICY IF EXISTS "Org members can delete document analyses" ON public.document_analyses;
CREATE POLICY "Scoped delete document analyses"
  ON public.document_analyses FOR DELETE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

-- fichas_visita: restrict UPDATE to owning corretor or admin/gerente
DROP POLICY IF EXISTS "Org members can update fichas" ON public.fichas_visita;
CREATE POLICY "Scoped update fichas"
  ON public.fichas_visita FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      corretor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

-- pricing_strategies: restrict UPDATE to owner or admin/gerente
DROP POLICY IF EXISTS "Org members can update strategies" ON public.pricing_strategies;
CREATE POLICY "Scoped update strategies"
  ON public.pricing_strategies FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      auth.uid() = user_id
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

-- vistorias: restrict UPDATE to owner or admin/gerente
DROP POLICY IF EXISTS "Org members can update vistorias" ON public.vistorias;
CREATE POLICY "Scoped update vistorias"
  ON public.vistorias FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      auth.uid() = user_id
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );
