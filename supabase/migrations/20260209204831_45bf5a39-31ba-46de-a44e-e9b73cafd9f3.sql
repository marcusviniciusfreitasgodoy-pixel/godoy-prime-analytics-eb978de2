
-- Superadmin can see all organizations
CREATE POLICY "superadmin_read_all_orgs" ON public.organizations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
  OR id = get_user_org_id(auth.uid())
);

CREATE POLICY "superadmin_update_all_orgs" ON public.organizations
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

-- Superadmin can read all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles in their org or superadmin" ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR organization_id = get_user_org_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

-- Superadmin can manage all user_roles
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;
CREATE POLICY "Admin or superadmin can manage roles" ON public.user_roles
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Organization invites: allow admins to manage invites for their org
CREATE POLICY "Admins can manage org invites" ON public.organization_invites
FOR ALL USING (
  organization_id = get_user_org_id(auth.uid())
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Public can read invites by token (for accepting)
CREATE POLICY "Public can read invite by token" ON public.organization_invites
FOR SELECT USING (true);
