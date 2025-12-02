-- Drop and recreate the view with SECURITY INVOKER (uses querying user's permissions)
DROP VIEW IF EXISTS public.view_ranking_microbairros;

CREATE VIEW public.view_ranking_microbairros
WITH (security_invoker = true)
AS
SELECT 
  CASE 
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%PEPE%' THEN 'Orla'
    WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%GILKA MACHADO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%MUNDO NOVO%' THEN 'Península'
    WHEN logradouro ILIKE '%ABM%' OR logradouro ILIKE '%AMERICAS%' THEN 'ABM'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' THEN 'Recreio/Vargem Grande'
    ELSE 'Condomínios Fechados'
  END AS microbairro,
  COUNT(*) AS total_transacoes,
  ROUND(AVG(valor_m2)::numeric, 2) AS preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) AS preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) AS preco_max_m2,
  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2))::numeric, 2) AS mediana_m2
FROM public.itbi_transactions
WHERE valor_m2 IS NOT NULL
GROUP BY 
  CASE 
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%PEPE%' THEN 'Orla'
    WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%GILKA MACHADO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%MUNDO NOVO%' THEN 'Península'
    WHEN logradouro ILIKE '%ABM%' OR logradouro ILIKE '%AMERICAS%' THEN 'ABM'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' THEN 'Recreio/Vargem Grande'
    ELSE 'Condomínios Fechados'
  END
ORDER BY preco_medio_m2 DESC;