-- Drop and recreate view with percentual_transferido filter and SUM(total_transacoes)
DROP VIEW IF EXISTS view_ranking_microbairros;

CREATE VIEW view_ranking_microbairros AS
WITH classified_transactions AS (
    SELECT 
        t.id,
        t.logradouro,
        t.valor_m2,
        t.total_transacoes,
        CASE
            WHEN t.logradouro ILIKE '%PENINSULA%' THEN 'Península'
            WHEN t.logradouro ILIKE '%LUCIO COSTA%' OR t.logradouro ILIKE '%PEPE%' OR t.logradouro ILIKE '%SERNAMBETIBA%' THEN 'Orla'
            WHEN t.logradouro ILIKE '%MARIO COVAS%' OR t.logradouro ILIKE '%OLEGARIO%' OR t.logradouro ILIKE '%ERICO VERISSIMO%' OR t.logradouro ILIKE '%GENERAL OLIMPIO%' THEN 'Jardim Oceânico'
            WHEN t.logradouro ILIKE '%DULCIDIO%' OR t.logradouro ILIKE '%BOSQUE MARAPENDI%' THEN 'ABM'
            WHEN t.logradouro ILIKE '%ABELARDO BUENO%' OR t.logradouro ILIKE '%SALVADOR ALLENDE%' OR t.logradouro ILIKE '%RIO 2%' THEN 'Centro Metropolitano'
            WHEN t.logradouro ILIKE '%AYRTON SENNA%' OR t.logradouro ILIKE '%VIA PARQUE%' THEN 'Ayrton Senna'
            WHEN t.logradouro ILIKE '%PARQUE DAS ROSAS%' OR t.logradouro ILIKE '%JARDINS DE SANTA MONICA%' THEN 'Parque das Rosas'
            WHEN t.logradouro ILIKE '%AMERICAS%' THEN 'Eixo Américas'
            ELSE 'Outros'
        END AS microbairro
    FROM itbi_transactions t
    WHERE 
        t.uso = 'Residencial' 
        AND t.bairro = 'BARRA DA TIJUCA' 
        AND t.valor_m2 IS NOT NULL 
        AND t.data_transacao >= '2020-01-01'
        AND t.percentual_transferido >= 90
)
SELECT 
    microbairro,
    -- Média ponderada por total_transacoes
    ROUND(SUM(valor_m2 * total_transacoes) / NULLIF(SUM(total_transacoes), 0), 2) AS preco_medio_m2,
    ROUND(MIN(valor_m2), 2) AS preco_min_m2,
    ROUND(MAX(valor_m2), 2) AS preco_max_m2,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) AS mediana_m2,
    -- Liquidez real: soma de total_transacoes
    SUM(total_transacoes) AS total_transacoes
FROM classified_transactions
GROUP BY microbairro
ORDER BY preco_medio_m2 DESC;