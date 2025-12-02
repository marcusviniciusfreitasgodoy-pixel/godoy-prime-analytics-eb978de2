-- Dropar trigger antes da função
DROP TRIGGER IF EXISTS update_itbi_transactions_updated_at ON public.itbi_transactions;

-- Dropar e recriar função com search_path seguro
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER update_itbi_transactions_updated_at
BEFORE UPDATE ON public.itbi_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recriar view sem SECURITY DEFINER (usar padrão SECURITY INVOKER)
DROP VIEW IF EXISTS public.view_ranking_microbairros;

CREATE VIEW public.view_ranking_microbairros 
WITH (security_invoker = true) AS
SELECT 
  CASE 
    WHEN logradouro ILIKE '%peninsula%' OR logradouro ILIKE '%península%' THEN 'Península'
    WHEN logradouro ILIKE '%jardim oceanico%' OR logradouro ILIKE '%jardim oceânico%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%orla%' OR logradouro ILIKE '%lucio costa%' OR logradouro ILIKE '%lúcio costa%' THEN 'Orla'
    WHEN logradouro ILIKE '%riserva%' THEN 'Riserva Golf'
    WHEN logradouro ILIKE '%villa%' OR logradouro ILIKE '%village%' THEN 'Vilas'
    WHEN logradouro ILIKE '%majestic%' THEN 'Majestic'
    WHEN logradouro ILIKE '%le parc%' THEN 'Le Parc'
    WHEN logradouro ILIKE '%ilha pura%' THEN 'Ilha Pura'
    ELSE 'Outras Regiões'
  END AS microbairro,
  COUNT(*) AS total_transacoes,
  ROUND(AVG(valor_m2)::numeric, 2) AS preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) AS preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) AS preco_max_m2,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) AS mediana_m2
FROM public.itbi_transactions
WHERE uso = 'Residencial'
  AND data_transacao >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY microbairro
ORDER BY preco_medio_m2 DESC;