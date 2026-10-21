CREATE OR REPLACE FUNCTION public.enriquecer_condominios_com_itbi(p_offset integer DEFAULT 0, p_limite integer DEFAULT 100)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE atualizados integer;
BEGIN
  UPDATE condominios_mapeamento c
  SET total_transacoes_itbi = sub.total,
      preco_medio_m2 = sub.preco_medio_m2,
      ultima_transacao_itbi = sub.ultima_transacao,
      atualizado_em = now()
  FROM (
    SELECT c2.id,
      SUM(COALESCE(t.total_transacoes,1)) AS total,
      ROUND((SUM(t.valor_m2 * COALESCE(t.total_transacoes,1)) / NULLIF(SUM(COALESCE(t.total_transacoes,1)),0))::numeric, 2) AS preco_medio_m2,
      MAX(t.data_transacao) AS ultima_transacao
    FROM (SELECT id, geom FROM condominios_mapeamento WHERE geom IS NOT NULL ORDER BY id LIMIT p_limite OFFSET p_offset) c2
    JOIN itbi_transactions t ON ST_DWithin(c2.geom::geography, t.geom::geography, 150)
    WHERE t.geom IS NOT NULL AND t.valor_m2 > 0
      AND t.uso = 'Residencial'
      AND t.data_transacao >= CURRENT_DATE - INTERVAL '5 years'
    GROUP BY c2.id
  ) sub
  WHERE c.id = sub.id;
  GET DIAGNOSTICS atualizados = ROW_COUNT;
  RETURN jsonb_build_object('condominios_com_itbi', atualizados, 'offset', p_offset, 'limite', p_limite);
END;
$function$;