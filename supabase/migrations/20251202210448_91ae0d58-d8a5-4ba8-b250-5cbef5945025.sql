-- Corrigir SECURITY DEFINER na view
DROP VIEW IF EXISTS public.view_ranking_microbairros;

CREATE VIEW public.view_ranking_microbairros 
WITH (security_invoker = true) AS
SELECT 
  CASE
    WHEN logradouro ILIKE '%ORLA%' OR logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
    WHEN logradouro ILIKE '%JARDIM OCEANICO%' OR logradouro ILIKE '%OCEANICO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%PENIN%' THEN 'Península'
    WHEN logradouro ILIKE '%ABM%' OR logradouro ILIKE '%ABELARDO%' OR logradouro ILIKE '%AYRTON SENNA%' THEN 'ABM'
    WHEN logradouro ILIKE '%PARQUE DAS ROSAS%' OR logradouro ILIKE '%ROSAS%' THEN 'Parque das Rosas'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' OR logradouro ILIKE '%PONTAL%' THEN 'Recreio/Vargem Grande'
    ELSE 'Outros'
  END as microbairro,
  ROUND(AVG(valor_m2)::numeric, 2) as preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) as preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) as preco_max_m2,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) as mediana_m2,
  COUNT(*) as total_transacoes
FROM public.itbi_transactions
WHERE 
  uso = 'Residencial' 
  AND valor_m2 IS NOT NULL
  AND bairro = 'BARRA DA TIJUCA'
  AND data_transacao >= (CURRENT_DATE - INTERVAL '24 months')
GROUP BY 
  CASE
    WHEN logradouro ILIKE '%ORLA%' OR logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
    WHEN logradouro ILIKE '%JARDIM OCEANICO%' OR logradouro ILIKE '%OCEANICO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%PENIN%' THEN 'Península'
    WHEN logradouro ILIKE '%ABM%' OR logradouro ILIKE '%ABELARDO%' OR logradouro ILIKE '%AYRTON SENNA%' THEN 'ABM'
    WHEN logradouro ILIKE '%PARQUE DAS ROSAS%' OR logradouro ILIKE '%ROSAS%' THEN 'Parque das Rosas'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' OR logradouro ILIKE '%PONTAL%' THEN 'Recreio/Vargem Grande'
    ELSE 'Outros'
  END
HAVING COUNT(*) >= 3
ORDER BY preco_medio_m2 DESC;