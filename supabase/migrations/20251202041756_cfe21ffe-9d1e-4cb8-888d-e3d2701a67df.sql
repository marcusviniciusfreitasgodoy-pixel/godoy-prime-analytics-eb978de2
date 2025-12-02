-- Drop the existing view
DROP VIEW IF EXISTS view_ranking_microbairros;

-- Create refined view with specific microbairros
CREATE VIEW view_ranking_microbairros AS
SELECT 
  CASE
    -- Orla (Avenida Lúcio Costa e Armando Lombardi)
    WHEN logradouro ILIKE '%lucio costa%' OR logradouro ILIKE '%armando lombardi%' THEN 'Orla'
    
    -- Jardim Oceânico (ruas características da região)
    WHEN logradouro ILIKE '%embaixador abelardo bueno%' 
      OR logradouro ILIKE '%aroazes%'
      OR logradouro ILIKE '%caititu%'
      OR logradouro ILIKE '%desembargador burle%'
      OR logradouro ILIKE '%genaro de carvalho%'
      OR logradouro ILIKE '%grauna%'
      OR logradouro ILIKE '%guapui%'
      OR logradouro ILIKE '%jardim botanico%'
      OR logradouro ILIKE '%chui%'
      OR logradouro ILIKE '%silvia pozzana%'
      OR logradouro ILIKE '%tindiquera%'
      OR logradouro ILIKE '%bom pastor%'
      OR logradouro ILIKE '%francisco dutra%'
      OR logradouro ILIKE '%odilon martins%'
      OR logradouro ILIKE '%celia%'
      THEN 'Jardim Oceânico'
    
    -- Península (Ayrton Senna, Salvador Allende, parte da Av. das Américas, ruas próximas)
    WHEN (logradouro ILIKE '%americas%' AND (numero::int BETWEEN 5000 AND 9999 OR numero IS NULL))
      OR logradouro ILIKE '%ayrton senna%'
      OR logradouro ILIKE '%abelardo bueno%' AND logradouro NOT ILIKE '%embaixador%'
      OR logradouro ILIKE '%salvador allende%'
      OR logradouro ILIKE '%retiro dos artistas%'
      OR logradouro ILIKE '%geraldo nascimento%'
      OR logradouro ILIKE '%mario claudio%'
      OR logradouro ILIKE '%gilka machado%'
      OR logradouro ILIKE '%rubem fonseca%'
      OR logradouro ILIKE '%aliomar baleeiro%'
      OR logradouro ILIKE '%araguaia%'
      OR logradouro ILIKE '%euclides da cunha%'
      OR logradouro ILIKE '%jose carlos pace%'
      OR logradouro ILIKE '%litoranea%'
      OR logradouro ILIKE '%oliveira castro%'
      OR logradouro ILIKE '%capitao menezes%'
      THEN 'Península'
    
    -- ABM - Avenida das Américas centro (número alto) e ruas comerciais
    WHEN (logradouro ILIKE '%americas%' AND numero::int >= 10000)
      OR logradouro ILIKE '%tenente marques%'
      OR logradouro ILIKE '%mara rubia%'
      OR logradouro ILIKE '%aldo bonadei%'
      OR logradouro ILIKE '%professor castilho%'
      OR logradouro ILIKE '%glaucio gil%'
      OR logradouro ILIKE '%marques de sao vicente%'
      OR logradouro ILIKE '%soldado hermenegildo%'
      THEN 'ABM'
    
    -- Recreio/Vargem Grande (limites com Barra)
    WHEN logradouro ILIKE '%pontal%'
      OR logradouro ILIKE '%benvindo de novaes%'
      OR logradouro ILIKE '%catonho%'
      THEN 'Recreio/Vargem Grande'
    
    -- Casas de condomínio (quando não se enquadram nas categorias acima)
    WHEN logradouro ILIKE '%atlantico%'
      OR logradouro ILIKE '%alfredo baltazar%'
      OR logradouro ILIKE '%sergio fadel%'
      OR logradouro ILIKE '%yvone silveira%'
      OR logradouro ILIKE '%alexandre stockler%'
      OR logradouro ILIKE '%henrique cordeiro%'
      OR logradouro ILIKE '%rocha ribeiro%'
      OR logradouro ILIKE '%vieira ramos%'
      OR logradouro ILIKE '%dulcidio cardoso%'
      THEN 'Condomínios Fechados'
    
    ELSE 'Outras Regiões'
  END AS microbairro,
  COUNT(*) AS total_transacoes,
  ROUND(AVG(valor_m2)::numeric, 2) AS preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) AS preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) AS preco_max_m2,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) AS mediana_m2
FROM itbi_transactions
WHERE uso = 'Residencial'
  AND valor_m2 IS NOT NULL
  AND bairro = 'BARRA DA TIJUCA'
GROUP BY microbairro
HAVING COUNT(*) >= 3
ORDER BY preco_medio_m2 DESC;