
-- 1) Helper: limite de usuários por plano
CREATE OR REPLACE FUNCTION public.get_plan_max_users(_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_plan, 'starter'))
    WHEN 'starter' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'enterprise' THEN 999
    ELSE 3
  END;
$$;

-- 2) Atualiza check_org_limits para incluir convites pendentes na contagem de usuários
CREATE OR REPLACE FUNCTION public.check_org_limits(_org_id uuid, _resource_type text)
RETURNS TABLE(allowed boolean, current_count bigint, max_allowed integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_count BIGINT;
  v_invites BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF get_user_org_id(auth.uid()) != _org_id THEN
    RAISE EXCEPTION 'Access denied: not a member of this organization';
  END IF;

  IF _resource_type = 'users' THEN
    SELECT max_users INTO v_max FROM organizations WHERE id = _org_id;
    SELECT COUNT(*) INTO v_count FROM profiles WHERE organization_id = _org_id;
    SELECT COUNT(*) INTO v_invites
      FROM organization_invites
      WHERE organization_id = _org_id
        AND accepted_at IS NULL
        AND expires_at > now();
    v_count := v_count + v_invites;
  ELSIF _resource_type = 'valuations_month' THEN
    SELECT max_valuations_month INTO v_max FROM organizations WHERE id = _org_id;
    SELECT COUNT(*) INTO v_count FROM valuations
      WHERE organization_id = _org_id AND created_at >= date_trunc('month', now());
  ELSE
    v_max := 999999;
    v_count := 0;
  END IF;

  RETURN QUERY SELECT v_count < v_max, v_count, v_max;
END;
$$;

-- 3) Trigger function: bloquear inserts em organization_invites quando limite atingido
CREATE OR REPLACE FUNCTION public.enforce_org_user_limit_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_profiles BIGINT;
  v_invites BIGINT;
  v_total BIGINT;
BEGIN
  SELECT max_users INTO v_max FROM organizations WHERE id = NEW.organization_id;
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_profiles FROM profiles WHERE organization_id = NEW.organization_id;
  SELECT COUNT(*) INTO v_invites
    FROM organization_invites
    WHERE organization_id = NEW.organization_id
      AND accepted_at IS NULL
      AND expires_at > now();

  v_total := v_profiles + v_invites;

  IF v_total >= v_max THEN
    RAISE EXCEPTION 'Limite de usuários do plano atingido (%/%). Faça upgrade para adicionar mais corretores.', v_total, v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_limit_invite ON public.organization_invites;
CREATE TRIGGER trg_enforce_user_limit_invite
BEFORE INSERT ON public.organization_invites
FOR EACH ROW
EXECUTE FUNCTION public.enforce_org_user_limit_invite();

-- 4) Trigger function: bloquear inserts/updates de organization_id em profiles quando exceder
CREATE OR REPLACE FUNCTION public.enforce_org_user_limit_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INTEGER;
  v_profiles BIGINT;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, se a org não mudou, não revalida
  IF TG_OP = 'UPDATE' AND OLD.organization_id IS NOT DISTINCT FROM NEW.organization_id THEN
    RETURN NEW;
  END IF;

  SELECT max_users INTO v_max FROM organizations WHERE id = NEW.organization_id;
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_profiles
    FROM profiles
    WHERE organization_id = NEW.organization_id
      AND id <> NEW.id;

  IF v_profiles + 1 > v_max THEN
    RAISE EXCEPTION 'Limite de usuários do plano atingido (%/%). Faça upgrade para adicionar mais corretores.', v_profiles + 1, v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_limit_profile ON public.profiles;
CREATE TRIGGER trg_enforce_user_limit_profile
BEFORE INSERT OR UPDATE OF organization_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_org_user_limit_profile();

-- 5) Trigger: ajustar max_users automaticamente quando o plano muda
CREATE OR REPLACE FUNCTION public.sync_org_max_users_with_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.plan IS DISTINCT FROM OLD.plan) THEN
    NEW.max_users := public.get_plan_max_users(NEW.plan);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_max_users_with_plan ON public.organizations;
CREATE TRIGGER trg_sync_max_users_with_plan
BEFORE INSERT OR UPDATE OF plan ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.sync_org_max_users_with_plan();

-- 6) Backfill: alinha max_users de todas as organizações com o plano atual
UPDATE public.organizations
SET max_users = public.get_plan_max_users(plan)
WHERE max_users IS DISTINCT FROM public.get_plan_max_users(plan);
