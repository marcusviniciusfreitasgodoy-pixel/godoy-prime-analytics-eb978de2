
-- =====================================================
-- SECURITY FIX 1: Profiles - restrict SELECT to authenticated
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- =====================================================
-- SECURITY FIX 2: Agendamentos - fix broken INSERT policies
-- =====================================================
DROP POLICY IF EXISTS "Public can create agendamentos" ON public.agendamentos_visita;
DROP POLICY IF EXISTS "Org members can create agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Org members can create agendamentos" ON public.agendamentos_visita
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- =====================================================
-- SECURITY FIX 3: Storage - remove anonymous upload
-- =====================================================
DROP POLICY IF EXISTS "Anyone can upload documentos proposta" ON storage.objects;

-- =====================================================
-- SECURITY FIX 5: feedbacks_visita - remove public INSERT bypass
-- =====================================================
DROP POLICY IF EXISTS "Anon pode criar feedback" ON public.feedbacks_visita;
DROP POLICY IF EXISTS "Autenticado pode criar feedback" ON public.feedbacks_visita;

-- =====================================================
-- SECURITY FIX 6: leads - remove public INSERT bypass
-- =====================================================
DROP POLICY IF EXISTS "Qualquer pessoa pode se cadastrar como lead" ON public.leads;
