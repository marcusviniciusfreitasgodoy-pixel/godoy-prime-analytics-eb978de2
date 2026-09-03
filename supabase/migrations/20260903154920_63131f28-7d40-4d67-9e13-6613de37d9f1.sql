-- Alinha a RPC de raio da análise histórica com o restante do motor:
-- só escrituras com percentual_transferido >= 90 (auditoria, seção 13 da
-- especificação da lógica estatística). Mesma assinatura e mesmas colunas;
-- CREATE OR REPLACE, idempotente.

CREATE OR REPLACE FUNCTION public.itbi_transacoes_raio(
  p_lat double precision,
  p_lng double precision,
  p_raio_m double precision DEFAULT 500,
  p_inicio date DEFAULT NULL::date,
  p_fim date DEFAULT NULL::date
)
RETURNS TABLE(logradouro text, bairro text, data_transacao date, valor_m2 numeric, total_transacoes integer, distancia_m double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.logradouro,
         t.bairro,
         t.data_transacao,
         t.valor_m2,
         t.total_transacoes,
         ST_Distance(
           t.geom::geography,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
         ) AS distancia_m
  FROM public.itbi_transactions t
  WHERE t.geom IS NOT NULL
    AND t.uso = 'Residencial'
    AND t.percentual_transferido >= 90
    AND (p_inicio IS NULL OR t.data_transacao >= p_inicio)
    AND (p_fim IS NULL OR t.data_transacao <= p_fim)
    AND ST_DWithin(
      t.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      LEAST(GREATEST(p_raio_m, 50), 2000)
    )
  ORDER BY t.data_transacao;
$function$;