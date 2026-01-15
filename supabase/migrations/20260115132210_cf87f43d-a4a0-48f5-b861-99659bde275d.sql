-- Create fuzzy search function for bairros
CREATE OR REPLACE FUNCTION search_bairros_fuzzy(
  search_term TEXT,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  bairro TEXT,
  total_transacoes INTEGER,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.bairro,
    bc.total_transacoes::INTEGER,
    similarity(bc.bairro, search_term) AS similarity_score
  FROM bairros_cache bc
  WHERE similarity(bc.bairro, search_term) > 0.2
     OR bc.bairro ILIKE '%' || search_term || '%'
  ORDER BY 
    -- Prioritize exact substring matches
    CASE WHEN bc.bairro ILIKE '%' || search_term || '%' THEN 0 ELSE 1 END,
    -- Then by similarity score
    similarity(bc.bairro, search_term) DESC,
    -- Finally by transaction count
    bc.total_transacoes DESC
  LIMIT result_limit;
END;
$$;