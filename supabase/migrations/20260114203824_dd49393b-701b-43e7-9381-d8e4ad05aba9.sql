-- Cache de bairros únicos para busca rápida
CREATE TABLE IF NOT EXISTS public.bairros_cache (
  bairro TEXT PRIMARY KEY,
  total_transacoes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice simples para ordenação
CREATE INDEX idx_bairros_cache_bairro ON public.bairros_cache (bairro);

-- RLS: leitura pública, escrita via service_role
ALTER TABLE public.bairros_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode visualizar bairros cache"
  ON public.bairros_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role pode gerenciar cache"
  ON public.bairros_cache FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Popular cache inicial a partir de itbi_transactions
INSERT INTO public.bairros_cache (bairro, total_transacoes, updated_at)
SELECT 
  bairro,
  SUM(total_transacoes)::INTEGER as total_transacoes,
  now()
FROM public.itbi_transactions
WHERE bairro IS NOT NULL
GROUP BY bairro
ON CONFLICT (bairro) DO UPDATE SET
  total_transacoes = EXCLUDED.total_transacoes,
  updated_at = now();