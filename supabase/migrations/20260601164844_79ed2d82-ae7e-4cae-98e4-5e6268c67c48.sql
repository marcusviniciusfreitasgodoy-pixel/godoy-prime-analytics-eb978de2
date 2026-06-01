
-- 1) bairros_cache: drop fake service_role policy; restrict writes to admins
DROP POLICY IF EXISTS "Service role pode gerenciar cache" ON public.bairros_cache;
CREATE POLICY "Admins can manage bairros cache"
  ON public.bairros_cache FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) proprietarios_multiplos: scope to authenticated
DROP POLICY IF EXISTS "Admins veem proprietarios" ON public.proprietarios_multiplos;
CREATE POLICY "Admins veem proprietarios"
  ON public.proprietarios_multiplos FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) valuations: corretores only see their own; admins/gerentes see all org
DROP POLICY IF EXISTS "Org members can view valuations" ON public.valuations;
CREATE POLICY "Org members can view valuations"
  ON public.valuations FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR user_id = auth.uid()
    )
  );

-- 4) fichas_visita: corretores only see their own; admins/gerentes see all org
DROP POLICY IF EXISTS "Org members can view fichas" ON public.fichas_visita;
CREATE POLICY "Org members can view fichas"
  ON public.fichas_visita FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR corretor_id = auth.uid()
    )
  );

-- 5) autorizacoes_captacao: corretores only see their own; admins/gerentes see all
DROP POLICY IF EXISTS "Org members can view autorizacoes" ON public.autorizacoes_captacao;
CREATE POLICY "Org members can view autorizacoes"
  ON public.autorizacoes_captacao FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR created_by = auth.uid()
    )
  );

-- 6) propostas_compra: restrict SELECT to admin/gerente, or corretor who owns the linked ficha.
--    Also add explicit INSERT/DELETE policies for org admins (proposals are normally created via service-role edge function).
DROP POLICY IF EXISTS "Org members can view propostas" ON public.propostas_compra;
CREATE POLICY "Org members can view propostas"
  ON public.propostas_compra FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.fichas_visita fv
        WHERE fv.id = propostas_compra.ficha_visita_id
          AND fv.corretor_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Org members can update propostas" ON public.propostas_compra;
CREATE POLICY "Admins can update propostas"
  ON public.propostas_compra FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  )
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Admins can insert propostas"
  ON public.propostas_compra FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

CREATE POLICY "Admins can delete propostas"
  ON public.propostas_compra FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

-- 7) whatsapp_message_logs: restrict SELECT to admin/gerente
DROP POLICY IF EXISTS "Org members can view whatsapp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Admins can view whatsapp logs"
  ON public.whatsapp_message_logs FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
  );

-- 8) feedbacks_visita: add INSERT/UPDATE/DELETE policies scoped to org via parent ficha
CREATE POLICY "Org members can insert feedbacks"
  ON public.feedbacks_visita FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fichas_visita fv
      WHERE fv.id = feedbacks_visita.ficha_visita_id
        AND fv.organization_id = get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Org members can update feedbacks"
  ON public.feedbacks_visita FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fichas_visita fv
      WHERE fv.id = feedbacks_visita.ficha_visita_id
        AND fv.organization_id = get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Admins can delete feedbacks"
  ON public.feedbacks_visita FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fichas_visita fv
      WHERE fv.id = feedbacks_visita.ficha_visita_id
        AND fv.organization_id = get_user_org_id(auth.uid())
        AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente'::app_role))
    )
  );
