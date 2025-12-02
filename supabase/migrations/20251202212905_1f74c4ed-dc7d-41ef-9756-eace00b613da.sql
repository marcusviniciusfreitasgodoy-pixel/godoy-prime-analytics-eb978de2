-- Ajustar view para pegar dados desde 2020
DROP VIEW IF EXISTS public.view_ranking_microbairros;

CREATE VIEW public.view_ranking_microbairros 
WITH (security_invoker = true) AS
SELECT 
  CASE
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
    WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%GASTAO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%EMBAIX%ABELARDO%' OR logradouro ILIKE '%AYRTON SENNA%' OR logradouro ILIKE '%DAS AMERICAS%' THEN 'ABM'
    WHEN logradouro ILIKE '%ARMANDO LOMBARDI%' OR logradouro ILIKE '%RACHEL%QUEIROZ%' OR logradouro ILIKE '%JOAO CABRAL%' THEN 'Península'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' THEN 'Recreio/Vargem Grande'
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
  AND data_transacao >= '2020-01-01'
GROUP BY 
  CASE
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
    WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%GASTAO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%EMBAIX%ABELARDO%' OR logradouro ILIKE '%AYRTON SENNA%' OR logradouro ILIKE '%DAS AMERICAS%' THEN 'ABM'
    WHEN logradouro ILIKE '%ARMANDO LOMBARDI%' OR logradouro ILIKE '%RACHEL%QUEIROZ%' OR logradouro ILIKE '%JOAO CABRAL%' THEN 'Península'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' THEN 'Recreio/Vargem Grande'
    ELSE 'Outros'
  END
HAVING COUNT(*) >= 2
ORDER BY preco_medio_m2 DESC;