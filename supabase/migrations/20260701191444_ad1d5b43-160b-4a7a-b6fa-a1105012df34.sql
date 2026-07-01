
-- Add org-scoped INSERT and UPDATE policies for leads
CREATE POLICY "Org members can create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));
