
CREATE OR REPLACE FUNCTION enriquecer_condominios_com_itbi()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
DECLARE
  atualizados integer;
BEGIN
  UPDATE condominios_mapeamento c
  SET
    total_transacoes_itbi = sub.total,
    preco_medio_m2 = sub.preco_medio_m2,
    ultima_transacao_itbi = sub.ultima_transacao,
    atualizado_em = now()
  FROM (
    SELECT
      c2.id,
      COUNT(t.id) as total,
      AVG(
        CASE WHEN t.area_m2 > 0
          THEN t.valor_transacao / t.area_m2
          ELSE NULL
        END
      ) as preco_medio_m2,
      MAX(t.data_transacao)::text as ultima_transacao
    FROM condominios_mapeamento c2
    JOIN itbi_transactions t
      ON UPPER(TRIM(c2.logradouro_padrao)) = UPPER(TRIM(t.logradouro))
    WHERE t.data_transacao >= (CURRENT_DATE - INTERVAL '5 years')::date
    GROUP BY c2.id
  ) sub
  WHERE c.id = sub.id;

  GET DIAGNOSTICS atualizados = ROW_COUNT;

  RETURN jsonb_build_object('condominios_com_itbi', atualizados);
END;
$$;
