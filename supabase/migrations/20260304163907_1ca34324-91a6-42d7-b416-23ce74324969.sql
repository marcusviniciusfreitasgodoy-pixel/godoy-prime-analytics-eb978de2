
-- Helper RPC to clean torres linked to algorithm-generated condominios
CREATE OR REPLACE FUNCTION limpar_torres_algoritmo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM torres_condominios
  WHERE condominio_id IN (
    SELECT id FROM condominios_mapeamento
    WHERE fonte_identificacao IN ('algoritmo_pal', 'algoritmo_dbscan')
  );
END;
$$;
