-- Recriar a view view_ranking_microbairros com filtro de últimos 12 meses
DROP VIEW IF EXISTS public.view_ranking_microbairros;

CREATE VIEW public.view_ranking_microbairros 
WITH (security_invoker = true)
AS
SELECT 
  CASE
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%SERNAMBETIBA%' OR logradouro ILIKE '%PEPE%' THEN 'Orla'
    WHEN logradouro ILIKE '%PENINSULA%' THEN 'Península'
    WHEN logradouro ILIKE '%ABELARDO BUENO%' OR logradouro ILIKE '%EMBAIXADOR%' THEN 'Centro Metropolitano'
    WHEN logradouro ILIKE '%VIA PARQUE%' OR logradouro ILIKE '%ALFA BARRA%' OR logradouro ILIKE '%AYRTON SENNA%' THEN 'Ayrton Senna'
    WHEN logradouro ILIKE '%OLEGARIO MACIEL%' OR logradouro ILIKE '%ERICO VERISSIMO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%DULCIDIO CARDOSO%' OR logradouro ILIKE '%CARDOSO%' THEN 'ABM'
    WHEN logradouro ILIKE '%MARIO COVAS%' OR logradouro ILIKE '%CESAR LATTES%' OR logradouro ILIKE '%HENRIQUE CORDEIRO%' THEN 'Parque das Rosas'
    WHEN logradouro ILIKE '%AMERICAS%' THEN 'Eixo Américas'
    ELSE 'Outros'
  END AS microbairro,
  ROUND(AVG(valor_m2)::numeric, 2) AS preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) AS preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) AS preco_max_m2,
  ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2))::numeric, 2) AS mediana_m2,
  SUM(total_transacoes) AS total_transacoes
FROM public.itbi_transactions
WHERE 
  bairro = 'BARRA DA TIJUCA'
  AND uso = 'Residencial'
  AND percentual_transferido >= 90
  AND valor_m2 IS NOT NULL
  AND data_transacao >= (CURRENT_DATE - INTERVAL '12 months')
GROUP BY 
  CASE
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%SERNAMBETIBA%' OR logradouro ILIKE '%PEPE%' THEN 'Orla'
    WHEN logradouro ILIKE '%PENINSULA%' THEN 'Península'
    WHEN logradouro ILIKE '%ABELARDO BUENO%' OR logradouro ILIKE '%EMBAIXADOR%' THEN 'Centro Metropolitano'
    WHEN logradouro ILIKE '%VIA PARQUE%' OR logradouro ILIKE '%ALFA BARRA%' OR logradouro ILIKE '%AYRTON SENNA%' THEN 'Ayrton Senna'
    WHEN logradouro ILIKE '%OLEGARIO MACIEL%' OR logradouro ILIKE '%ERICO VERISSIMO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%DULCIDIO CARDOSO%' OR logradouro ILIKE '%CARDOSO%' THEN 'ABM'
    WHEN logradouro ILIKE '%MARIO COVAS%' OR logradouro ILIKE '%CESAR LATTES%' OR logradouro ILIKE '%HENRIQUE CORDEIRO%' THEN 'Parque das Rosas'
    WHEN logradouro ILIKE '%AMERICAS%' THEN 'Eixo Américas'
    ELSE 'Outros'
  END
ORDER BY preco_medio_m2 DESC;