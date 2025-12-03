-- Drop existing view
DROP VIEW IF EXISTS view_ranking_microbairros;

-- Recreate view with ALL historical data (sem filtro de data para ranking completo)
CREATE VIEW view_ranking_microbairros AS
WITH classified_transactions AS (
  SELECT 
    t.*,
    CASE 
      -- Península: Condomínios da Península
      WHEN t.logradouro ILIKE '%PENINSULA%' 
        THEN 'Península'
      
      -- Orla (Lúcio Costa): Av. Lúcio Costa e Pepê
      WHEN t.logradouro ILIKE '%LUCIO COSTA%' 
        OR t.logradouro ILIKE '%PEPE%'
        OR t.logradouro ILIKE '%SERNAMBETIBA%'
        THEN 'Orla'
      
      -- Jardim Oceânico: Mário Covas, Olegário
      WHEN t.logradouro ILIKE '%MARIO COVAS%'
        OR t.logradouro ILIKE '%OLEGARIO%'
        OR t.logradouro ILIKE '%ERICO VERISSIMO%'
        OR t.logradouro ILIKE '%GENERAL OLIMPIO%'
        THEN 'Jardim Oceânico'
      
      -- ABM: Prefeito Dulcídio Cardoso
      WHEN t.logradouro ILIKE '%DULCIDIO%'
        OR t.logradouro ILIKE '%BOSQUE MARAPENDI%'
        THEN 'ABM'
      
      -- Centro Metropolitano: Abelardo Bueno, Salvador Allende
      WHEN t.logradouro ILIKE '%ABELARDO BUENO%'
        OR t.logradouro ILIKE '%SALVADOR ALLENDE%'
        OR t.logradouro ILIKE '%RIO 2%'
        THEN 'Centro Metropolitano'
      
      -- Ayrton Senna
      WHEN t.logradouro ILIKE '%AYRTON SENNA%'
        OR t.logradouro ILIKE '%VIA PARQUE%'
        THEN 'Ayrton Senna'
      
      -- Parque das Rosas: Próximo ao Barra Shopping
      WHEN t.logradouro ILIKE '%PARQUE DAS ROSAS%'
        OR t.logradouro ILIKE '%JARDINS DE SANTA MONICA%'
        THEN 'Parque das Rosas'
      
      -- Eixo Américas: Av. das Américas (catch-all)
      WHEN t.logradouro ILIKE '%AMERICAS%' 
        THEN 'Eixo Américas'
      
      -- Outros: Todas as outras ruas
      ELSE 'Outros'
    END as microbairro
  FROM itbi_transactions t
  WHERE t.uso = 'Residencial'
    AND t.bairro = 'BARRA DA TIJUCA'
    AND t.valor_m2 IS NOT NULL
    AND t.data_transacao >= '2020-01-01'
)
SELECT 
  microbairro,
  ROUND(AVG(valor_m2)::numeric, 2) as preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) as preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) as preco_max_m2,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) as mediana_m2,
  COUNT(*) as total_transacoes
FROM classified_transactions
GROUP BY microbairro
ORDER BY preco_medio_m2 DESC;