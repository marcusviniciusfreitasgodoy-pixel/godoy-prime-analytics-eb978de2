-- Recriar view_ranking_microbairros com filtro de outliers
DROP VIEW IF EXISTS view_ranking_microbairros;

CREATE VIEW view_ranking_microbairros WITH (security_invoker = true) AS
WITH microbairro_data AS (
  SELECT
    CASE
      WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%LÚCIO COSTA%' 
           OR logradouro ILIKE '%SERNAMBETIBA%' OR logradouro ILIKE '%PEPE%' OR logradouro ILIKE '%PEPÊ%' THEN 'Orla'
      WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%PENÍNSULA%' THEN 'Península'
      WHEN logradouro ILIKE '%ABELARDO BUENO%' OR logradouro ILIKE '%EMBAIXADOR%' THEN 'Centro Metropolitano'
      WHEN logradouro ILIKE '%AYRTON SENNA%' OR logradouro ILIKE '%VIA PARQUE%' OR logradouro ILIKE '%ALFA BARRA%' THEN 'Ayrton Senna'
      WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%OLEGÁRIO%' 
           OR logradouro ILIKE '%ERICO%' OR logradouro ILIKE '%ÉRICO%' OR logradouro ILIKE '%VERÍSSIMO%' THEN 'Jardim Oceânico'
      WHEN logradouro ILIKE '%DULCIDIO%' OR logradouro ILIKE '%DULCÍDIO%' OR logradouro ILIKE '%CARDOSO%' THEN 'ABM'
      WHEN logradouro ILIKE '%MARIO COVAS%' OR logradouro ILIKE '%MÁRIO COVAS%'
           OR logradouro ILIKE '%CESAR LATTES%' OR logradouro ILIKE '%CÉSAR LATTES%'
           OR logradouro ILIKE '%HENRIQUE CORDEIRO%' THEN 'Parque das Rosas'
      WHEN logradouro ILIKE '%AMERICAS%' OR logradouro ILIKE '%AMÉRICAS%' THEN 'Eixo Américas'
      ELSE 'Outros'
    END AS microbairro,
    valor_m2,
    total_transacoes
  FROM itbi_transactions
  WHERE bairro ILIKE 'BARRA DA TIJUCA'
    AND uso = 'Residencial'
    AND percentual_transferido >= 90
    AND valor_m2 IS NOT NULL
    AND valor_m2 <= 40000  -- Filtro de outliers: máximo R$ 40.000/m²
    AND data_transacao >= (CURRENT_DATE - INTERVAL '12 months')
)
SELECT 
  microbairro,
  ROUND(AVG(valor_m2)::numeric, 2) AS preco_medio_m2,
  SUM(total_transacoes)::bigint AS total_transacoes,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) AS mediana_m2,
  ROUND(MIN(valor_m2)::numeric, 2) AS preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) AS preco_max_m2
FROM microbairro_data
WHERE microbairro != 'Outros'
GROUP BY microbairro
HAVING SUM(total_transacoes) >= 10
ORDER BY preco_medio_m2 DESC;