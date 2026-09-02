-- Amostra ITBI por raio para o motor de avaliação (auditoria, seção 11:
-- fallback rua → raio 100 m → raio 300 m → bairro).
--
-- Diferente de itbi_transacoes_raio (usada pela análise histórica), esta função
-- devolve as colunas que o motor precisa (valor_transacao, tipologia) e aplica
-- os mesmos filtros de fetchMarketRows (uso residencial, percentual_transferido
-- >= 90, piso/teto, tipologia opcional, janela, ordenação e limite), para que a
-- amostra por raio seja comparável à amostra por rua.
--
-- SECURITY INVOKER: respeita a RLS de itbi_transactions (leitura para
-- autenticados). Raio limitado a [50, 2000] m por segurança.

CREATE OR REPLACE FUNCTION public.itbi_amostra_raio(
  p_lat double precision,
  p_lng double precision,
  p_raio_m double precision DEFAULT 100,
  p_inicio date DEFAULT NULL,
  p_fim date DEFAULT NULL,
  p_tipologia text DEFAULT NULL,
  p_piso numeric DEFAULT 0,
  p_teto numeric DEFAULT NULL,
  p_limite integer DEFAULT 5000
)
RETURNS TABLE(
  valor_m2 numeric,
  valor_transacao numeric,
  total_transacoes integer,
  data_transacao date,
  bairro text,
  tipologia text,
  logradouro text,
  distancia_m double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT t.valor_m2,
         t.valor_transacao,
         t.total_transacoes,
         t.data_transacao,
         t.bairro,
         t.tipologia,
         t.logradouro,
         ST_Distance(
           t.geom::geography,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
         ) AS distancia_m
  FROM public.itbi_transactions t
  WHERE t.geom IS NOT NULL
    AND t.uso = 'Residencial'
    AND t.percentual_transferido >= 90
    AND t.valor_m2 IS NOT NULL
    AND t.valor_m2 >= COALESCE(p_piso, 0)
    AND (p_teto IS NULL OR t.valor_m2 <= p_teto)
    AND (p_inicio IS NULL OR t.data_transacao >= p_inicio)
    AND (p_fim IS NULL OR t.data_transacao <= p_fim)
    AND (p_tipologia IS NULL OR t.tipologia = p_tipologia)
    AND ST_DWithin(
      t.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      LEAST(GREATEST(COALESCE(p_raio_m, 100), 50), 2000)
    )
  ORDER BY t.data_transacao DESC, t.logradouro ASC, t.tipologia ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limite, 5000), 1), 5000);
$function$;

COMMENT ON FUNCTION public.itbi_amostra_raio IS
  'Amostra ITBI residencial num raio (m) de um ponto, com os filtros do motor de avaliação. Seção 11 da auditoria.';

GRANT EXECUTE ON FUNCTION public.itbi_amostra_raio(
  double precision, double precision, double precision, date, date, text, numeric, numeric, integer
) TO authenticated, service_role;