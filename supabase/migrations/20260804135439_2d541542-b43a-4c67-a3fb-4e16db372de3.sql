CREATE OR REPLACE FUNCTION public.itbi_transacoes_raio(
  p_lat double precision,
  p_lng double precision,
  p_raio_m double precision DEFAULT 500,
  p_inicio date DEFAULT NULL,
  p_fim date DEFAULT NULL
)
RETURNS TABLE(
  logradouro text,
  bairro text,
  data_transacao date,
  valor_m2 numeric,
  total_transacoes integer,
  distancia_m double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND (p_inicio IS NULL OR t.data_transacao >= p_inicio)
    AND (p_fim IS NULL OR t.data_transacao <= p_fim)
    AND ST_DWithin(
      t.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      LEAST(GREATEST(p_raio_m, 50), 2000)
    )
  ORDER BY t.data_transacao;
$$;

CREATE OR REPLACE FUNCTION public.itbi_ponto_logradouro(
  p_logradouro text,
  p_bairro text DEFAULT NULL
)
RETURNS TABLE(lat double precision, lng double precision, fonte text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT avg(t.lat)::double precision,
         avg(t.lng)::double precision,
         'itbi'::text
  FROM public.itbi_transactions t
  WHERE t.lat IS NOT NULL
    AND t.logradouro_norm = public.normalizar_logradouro(p_logradouro)
    AND (p_bairro IS NULL OR upper(t.bairro) = upper(p_bairro))
  HAVING count(*) > 0
  UNION ALL
  SELECT avg(g.latitude)::double precision,
         avg(g.longitude)::double precision,
         'logradouros_geo'::text
  FROM public.logradouros_geo g
  WHERE g.latitude IS NOT NULL
    AND public.normalizar_logradouro(g.logradouro) = public.normalizar_logradouro(p_logradouro)
    AND (p_bairro IS NULL OR upper(g.bairro) = upper(p_bairro))
  HAVING count(*) > 0
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.itbi_transacoes_raio(double precision, double precision, double precision, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.itbi_ponto_logradouro(text, text) TO authenticated, service_role;