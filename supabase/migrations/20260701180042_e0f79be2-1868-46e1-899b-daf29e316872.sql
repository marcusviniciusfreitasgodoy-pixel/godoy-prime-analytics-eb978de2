
-- ============================================================
-- Passo 2: Camada de acesso isolada do Analista Imobiliário
-- Role: parecer_nucleo_ro (allow-list, sem service_role)
-- ============================================================

-- 1) Cria o role de leitura restrito (sem login direto; PostgREST fará SET ROLE via claim do JWT)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parecer_nucleo_ro') THEN
    CREATE ROLE parecer_nucleo_ro NOLOGIN NOINHERIT;
  END IF;
END $$;

-- Permite que o authenticator (usado pelo PostgREST) assuma esse role via SET ROLE
GRANT parecer_nucleo_ro TO authenticator;

-- 2) USAGE no schema public (necessário para enxergar objetos), sem default privileges
GRANT USAGE ON SCHEMA public TO parecer_nucleo_ro;

-- 3) SELECT nominal APENAS nas 7 tabelas oficiais (allow-list)
GRANT SELECT ON public.itbi_transactions       TO parecer_nucleo_ro;
GRANT SELECT ON public.iptu_logradouro_resumo  TO parecer_nucleo_ro;
GRANT SELECT ON public.iptu_2025_logradouro    TO parecer_nucleo_ro;
GRANT SELECT ON public.condominios_mapeamento  TO parecer_nucleo_ro;
GRANT SELECT ON public.lotes_pal               TO parecer_nucleo_ro;
GRANT SELECT ON public.edificacoes_geo         TO parecer_nucleo_ro;
GRANT SELECT ON public.microbairros_geo        TO parecer_nucleo_ro;

-- 4) EXECUTE na função oficial de normalização de logradouro
GRANT EXECUTE ON FUNCTION public.normalizar_logradouro(text) TO parecer_nucleo_ro;

-- 5) RLS policies espelho para o novo role (RLS já está ativo nas 7 tabelas;
--    as policies existentes de authenticated/admin/gerente/corretor NÃO são tocadas)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'itbi_transactions',
    'iptu_logradouro_resumo',
    'iptu_2025_logradouro',
    'condominios_mapeamento',
    'lotes_pal',
    'edificacoes_geo',
    'microbairros_geo'
  ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "parecer_nucleo_ro_select_all" ON public.%I', t
    );
    EXECUTE format(
      'CREATE POLICY "parecer_nucleo_ro_select_all" ON public.%I
         FOR SELECT TO parecer_nucleo_ro USING (true)', t
    );
  END LOOP;
END $$;

-- 6) Tabela de rate-limit / audit log da edge function.
--    NÃO é acessada pelo role parecer_nucleo_ro (firewall).
CREATE TABLE IF NOT EXISTS public.parecer_nucleo_rate_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  ip_hash TEXT,
  status INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parecer_nucleo_rate_log_user_time_idx
  ON public.parecer_nucleo_rate_log (user_id, created_at DESC);

-- Grants: authenticated pode inserir seus próprios logs; leitura só do próprio.
-- parecer_nucleo_ro NÃO recebe grant aqui — firewall respeitado.
GRANT SELECT, INSERT ON public.parecer_nucleo_rate_log TO authenticated;

ALTER TABLE public.parecer_nucleo_rate_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_rate_log_select" ON public.parecer_nucleo_rate_log;
CREATE POLICY "own_rate_log_select" ON public.parecer_nucleo_rate_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_rate_log_insert" ON public.parecer_nucleo_rate_log;
CREATE POLICY "own_rate_log_insert" ON public.parecer_nucleo_rate_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
