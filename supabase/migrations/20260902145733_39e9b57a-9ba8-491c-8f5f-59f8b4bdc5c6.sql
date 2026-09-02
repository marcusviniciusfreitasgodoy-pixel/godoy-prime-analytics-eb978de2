-- Índice de preços próprio (Fase 3 da auditoria, item 14).
--
-- Mediana trimestral de ln(valor_m2), ponderada por escrituras (cada linha
-- agregada é expandida por total_transacoes), sobre toda a base residencial.
-- O motor corrige cada linha da amostra para o trimestre de referência
-- (fator = exp(ln_mediana_ref - ln_mediana_trimestre)) antes de calcular a
-- estatística, para não misturar 2021 com 2026 como se fossem a mesma
-- população. Sem dependência de índice externo.
--
-- Materializada para não recalcular a base inteira a cada avaliação;
-- atualizada pela função abaixo, chamada ao fim de sync-itbi-daily.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.itbi_price_index AS
WITH expandido AS (
  SELECT
    date_trunc('quarter', t.data_transacao)::date AS trimestre,
    ln(t.valor_m2) AS ln_valor_m2
  FROM public.itbi_transactions t
  CROSS JOIN LATERAL generate_series(1, GREATEST(1, COALESCE(t.total_transacoes, 1))) AS g
  WHERE t.uso = 'Residencial'
    AND COALESCE(t.percentual_transferido, 100) >= 90
    AND t.valor_m2 > 0
)
SELECT
  trimestre,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY ln_valor_m2) AS ln_mediana,
  count(*)::integer AS escrituras
FROM expandido
GROUP BY trimestre
ORDER BY trimestre;

CREATE UNIQUE INDEX IF NOT EXISTS itbi_price_index_trimestre_idx
  ON public.itbi_price_index (trimestre);

COMMENT ON MATERIALIZED VIEW public.itbi_price_index IS
  'Índice de preços ITBI: mediana trimestral de ln(valor_m2) ponderada por escrituras. Usado pelo motor de avaliação para corrigir a amostra ao trimestre de referência.';

GRANT SELECT ON public.itbi_price_index TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_itbi_price_index()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.itbi_price_index;
$$;

REVOKE ALL ON FUNCTION public.refresh_itbi_price_index() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_itbi_price_index() TO service_role;