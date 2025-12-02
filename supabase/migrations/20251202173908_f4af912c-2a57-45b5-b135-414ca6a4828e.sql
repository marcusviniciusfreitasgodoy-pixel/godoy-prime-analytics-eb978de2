-- Drop and recreate view with expanded microbairro mappings
DROP VIEW IF EXISTS view_ranking_microbairros;

CREATE VIEW view_ranking_microbairros AS
SELECT 
  CASE 
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%PEPE%' OR logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
    WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%GILKA MACHADO%' OR logradouro ILIKE '%ALFREDO BALTHAZAR%' OR logradouro ILIKE '%PROF DULCIDIO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%MUNDO NOVO%' OR logradouro ILIKE '%LAGOA DE MARAPENDI%' THEN 'Península'
    WHEN logradouro ILIKE '%PARQUE DAS ROSAS%' OR logradouro ILIKE '%MARIO COVAS%' OR logradouro ILIKE '%GEREMARIO%' THEN 'Parque das Rosas'
    WHEN logradouro ILIKE '%ABM%' OR logradouro ILIKE '%AMERICAS%' OR logradouro ILIKE '%ABELARDO BUENO%' OR logradouro ILIKE '%AYRTON SENNA%' THEN 'ABM'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' OR logradouro ILIKE '%PONTAL%' THEN 'Recreio/Vargem Grande'
    ELSE 'Condomínios Fechados'
  END AS microbairro,
  COUNT(*) AS total_transacoes,
  ROUND(AVG(valor_m2), 2) AS preco_medio_m2,
  ROUND(MIN(valor_m2), 2) AS preco_min_m2,
  ROUND(MAX(valor_m2), 2) AS preco_max_m2,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) AS mediana_m2
FROM itbi_transactions
WHERE valor_m2 IS NOT NULL
GROUP BY 
  CASE 
    WHEN logradouro ILIKE '%LUCIO COSTA%' OR logradouro ILIKE '%PEPE%' OR logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
    WHEN logradouro ILIKE '%OLEGARIO%' OR logradouro ILIKE '%GILKA MACHADO%' OR logradouro ILIKE '%ALFREDO BALTHAZAR%' OR logradouro ILIKE '%PROF DULCIDIO%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%PENINSULA%' OR logradouro ILIKE '%MUNDO NOVO%' OR logradouro ILIKE '%LAGOA DE MARAPENDI%' THEN 'Península'
    WHEN logradouro ILIKE '%PARQUE DAS ROSAS%' OR logradouro ILIKE '%MARIO COVAS%' OR logradouro ILIKE '%GEREMARIO%' THEN 'Parque das Rosas'
    WHEN logradouro ILIKE '%ABM%' OR logradouro ILIKE '%AMERICAS%' OR logradouro ILIKE '%ABELARDO BUENO%' OR logradouro ILIKE '%AYRTON SENNA%' THEN 'ABM'
    WHEN logradouro ILIKE '%RECREIO%' OR logradouro ILIKE '%VARGEM%' OR logradouro ILIKE '%PONTAL%' THEN 'Recreio/Vargem Grande'
    ELSE 'Condomínios Fechados'
  END
ORDER BY preco_medio_m2 DESC;