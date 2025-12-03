-- Drop existing view
DROP VIEW IF EXISTS view_ranking_microbairros;

-- Recreate view with complete microbairro classification
CREATE VIEW view_ranking_microbairros AS
WITH classified_transactions AS (
  SELECT 
    t.*,
    CASE 
      -- Jardim Oceânico: Ruas próximas ao Metrô, Olegário Maciel, Érico Veríssimo
      WHEN t.logradouro ILIKE '%Olegário%' 
        OR t.logradouro ILIKE '%Érico Veríssimo%' 
        OR t.logradouro ILIKE '%Erico Verissimo%'
        OR t.logradouro ILIKE '%Jardim Oceânico%'
        OR t.logradouro ILIKE '%General Olímpio%'
        OR t.logradouro ILIKE '%Mário Covas%'
        OR t.logradouro ILIKE '%Mario Covas%'
        THEN 'Jardim Oceânico'
      
      -- Península: Condomínios da Península
      WHEN t.logradouro ILIKE '%Península%' 
        OR t.logradouro ILIKE '%Peninsula%'
        THEN 'Península'
      
      -- Orla (Lúcio Costa): Av. Lúcio Costa/Sernambetiba e Pepê
      WHEN t.logradouro ILIKE '%Lúcio Costa%' 
        OR t.logradouro ILIKE '%Lucio Costa%'
        OR t.logradouro ILIKE '%Sernambetiba%'
        OR t.logradouro ILIKE '%Pepê%'
        OR t.logradouro ILIKE '%Pepe%'
        THEN 'Orla'
      
      -- ABM: Condomínios tradicionais no km 1 da Av. Américas
      WHEN t.logradouro ILIKE '%Prefeito Dulcídio%'
        OR t.logradouro ILIKE '%Prefeito Dulcidio%'
        OR t.logradouro ILIKE '%Bosque Marapendi%'
        OR t.logradouro ILIKE '%ABM%'
        THEN 'ABM'
      
      -- Parque das Rosas: Condomínios próximos ao Barra Shopping
      WHEN t.logradouro ILIKE '%Parque das Rosas%'
        OR t.logradouro ILIKE '%Barra Shopping%'
        OR t.logradouro ILIKE '%Embaixador Abelardo%'
        THEN 'Parque das Rosas'
      
      -- Centro Metropolitano: Região Abelardo Bueno, Villas da Barra, Rio 2
      WHEN t.logradouro ILIKE '%Abelardo Bueno%'
        OR t.logradouro ILIKE '%Rio 2%'
        OR t.logradouro ILIKE '%Villas da Barra%'
        OR t.logradouro ILIKE '%Centro Metropolitano%'
        OR t.logradouro ILIKE '%Salvador Allende%'
        THEN 'Centro Metropolitano'
      
      -- Ayrton Senna: Via Parque, Alfa Barra
      WHEN t.logradouro ILIKE '%Ayrton Senna%'
        OR t.logradouro ILIKE '%Via Parque%'
        OR t.logradouro ILIKE '%Alfa Barra%'
        THEN 'Ayrton Senna'
      
      -- Eixo Américas: Condomínios ao longo da Av. das Américas (catch-all para Américas)
      WHEN t.logradouro ILIKE '%Américas%' 
        OR t.logradouro ILIKE '%Americas%'
        THEN 'Eixo Américas'
      
      -- Outros: Todas as outras ruas
      ELSE 'Outros'
    END as microbairro
  FROM itbi_transactions t
  WHERE t.uso = 'Residencial'
    AND t.bairro = 'BARRA DA TIJUCA'
    AND t.valor_m2 IS NOT NULL
    AND t.data_transacao >= (CURRENT_DATE - INTERVAL '24 months')
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