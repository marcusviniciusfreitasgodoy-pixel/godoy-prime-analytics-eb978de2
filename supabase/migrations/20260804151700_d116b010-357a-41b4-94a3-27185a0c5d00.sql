CREATE OR REPLACE FUNCTION public.normalizar_logradouro_busca(texto text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  t text;
BEGIN
  IF texto IS NULL THEN RETURN NULL; END IF;

  -- base: upper + sem acentos
  t := UPPER(TRIM(texto));
  t := TRANSLATE(t, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAAEEEEIIIIOOOOOUUUUC');

  -- pontuacao vira espaco
  t := REGEXP_REPLACE(t, '[^A-Z0-9]+', ' ', 'g');
  t := ' ' || TRIM(t) || ' ';

  -- tipos de logradouro -> token unico
  t := REGEXP_REPLACE(t, ' (AVENIDA|AVN|AVE|AV) ', ' AV ', 'g');
  t := REGEXP_REPLACE(t, ' (RUA|R) ', ' RUA ', 'g');
  t := REGEXP_REPLACE(t, ' (ESTRADA|ESTR|EST) ', ' EST ', 'g');
  t := REGEXP_REPLACE(t, ' (PRACA|PCA|PC) ', ' PRACA ', 'g');
  t := REGEXP_REPLACE(t, ' (TRAVESSA|TRV|TV) ', ' TV ', 'g');
  t := REGEXP_REPLACE(t, ' (ALAMEDA|ALA|AL) ', ' ALA ', 'g');
  t := REGEXP_REPLACE(t, ' (ESTRADA|EST) ', ' EST ', 'g');
  t := REGEXP_REPLACE(t, ' (LARGO|LGO) ', ' LGO ', 'g');
  t := REGEXP_REPLACE(t, ' (ROD|RODOVIA) ', ' ROD ', 'g');

  -- titulos / patentes -> forma canonica
  t := REGEXP_REPLACE(t, ' (GENERAL|GAL|GEN) ', ' GENERAL ', 'g');
  t := REGEXP_REPLACE(t, ' (CORONEL|CEL) ', ' CORONEL ', 'g');
  t := REGEXP_REPLACE(t, ' (TENENTE|TEN) ', ' TENENTE ', 'g');
  t := REGEXP_REPLACE(t, ' (CAPITAO|CAP) ', ' CAPITAO ', 'g');
  t := REGEXP_REPLACE(t, ' (MAJOR|MAJ) ', ' MAJOR ', 'g');
  t := REGEXP_REPLACE(t, ' (MARECHAL|MAL|MARE) ', ' MARECHAL ', 'g');
  t := REGEXP_REPLACE(t, ' (ALMIRANTE|ALM|ALMTE) ', ' ALMIRANTE ', 'g');
  t := REGEXP_REPLACE(t, ' (BRIGADEIRO|BRIG) ', ' BRIGADEIRO ', 'g');
  t := REGEXP_REPLACE(t, ' (COMANDANTE|CMTE|CMT|COM) ', ' COMANDANTE ', 'g');
  t := REGEXP_REPLACE(t, ' (DOUTOR|DOUTORA|DR|DRA) ', ' DOUTOR ', 'g');
  t := REGEXP_REPLACE(t, ' (PROFESSOR|PROFESSORA|PROF|PROFA) ', ' PROFESSOR ', 'g');
  t := REGEXP_REPLACE(t, ' (ENGENHEIRO|ENG|ENGO) ', ' ENGENHEIRO ', 'g');
  t := REGEXP_REPLACE(t, ' (PADRE|PE) ', ' PADRE ', 'g');
  t := REGEXP_REPLACE(t, ' (MONSENHOR|MONS) ', ' MONSENHOR ', 'g');
  t := REGEXP_REPLACE(t, ' (PRESIDENTE|PRES) ', ' PRESIDENTE ', 'g');
  t := REGEXP_REPLACE(t, ' (GOVERNADOR|GOV) ', ' GOVERNADOR ', 'g');
  t := REGEXP_REPLACE(t, ' (PREFEITO|PREF) ', ' PREFEITO ', 'g');
  t := REGEXP_REPLACE(t, ' (SENADOR|SEN) ', ' SENADOR ', 'g');
  t := REGEXP_REPLACE(t, ' (DEPUTADO|DEP) ', ' DEPUTADO ', 'g');
  t := REGEXP_REPLACE(t, ' (MINISTRO|MIN) ', ' MINISTRO ', 'g');
  t := REGEXP_REPLACE(t, ' (DESEMBARGADOR|DES|DESEMB) ', ' DESEMBARGADOR ', 'g');
  t := REGEXP_REPLACE(t, ' (VISCONDE|VISC) ', ' VISCONDE ', 'g');
  t := REGEXP_REPLACE(t, ' (BARAO|BAO) ', ' BARAO ', 'g');
  t := REGEXP_REPLACE(t, ' (SAO|S|STO|SANTO) ', ' SANTO ', 'g');
  t := REGEXP_REPLACE(t, ' (STA|SANTA) ', ' SANTA ', 'g');

  -- conectivos irrelevantes
  t := REGEXP_REPLACE(t, ' (DE|DA|DO|DAS|DOS|E) ', ' ', 'g');
  t := REGEXP_REPLACE(t, ' (DE|DA|DO|DAS|DOS|E) ', ' ', 'g');

  -- variacoes de grafia
  t := REPLACE(t, 'PH', 'F');
  t := REPLACE(t, 'LL', 'L');
  t := REPLACE(t, 'SS', 'S');
  t := REPLACE(t, 'TH', 'T');
  t := REPLACE(t, 'CH', 'X');
  t := REPLACE(t, 'Y', 'I');
  t := REPLACE(t, 'W', 'V');
  t := REPLACE(t, 'Z', 'S');
  t := REGEXP_REPLACE(t, '([A-Z])\1', '\1', 'g');

  RETURN TRIM(REGEXP_REPLACE(t, '\s+', ' ', 'g'));
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_itbi_logradouro_norm_busca
  ON public.itbi_transactions (public.normalizar_logradouro_busca(logradouro));

CREATE INDEX IF NOT EXISTS idx_logradouros_geo_norm_busca
  ON public.logradouros_geo (public.normalizar_logradouro_busca(logradouro));

CREATE OR REPLACE FUNCTION public.itbi_ponto_logradouro(p_logradouro text, p_bairro text DEFAULT NULL::text)
RETURNS TABLE(lat double precision, lng double precision, fonte text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH alvo AS (
    SELECT public.normalizar_logradouro_busca(p_logradouro) AS n
  ),
  itbi AS (
    SELECT avg(t.lat)::double precision AS lat,
           avg(t.lng)::double precision AS lng,
           'itbi'::text AS fonte,
           count(*) AS qtd
    FROM public.itbi_transactions t, alvo a
    WHERE t.lat IS NOT NULL
      AND public.normalizar_logradouro_busca(t.logradouro) = a.n
      AND (p_bairro IS NULL OR upper(t.bairro) = upper(p_bairro))
  ),
  geo AS (
    SELECT avg(g.latitude)::double precision AS lat,
           avg(g.longitude)::double precision AS lng,
           'logradouros_geo'::text AS fonte,
           count(*) AS qtd
    FROM public.logradouros_geo g, alvo a
    WHERE g.latitude IS NOT NULL
      AND public.normalizar_logradouro_busca(g.logradouro) = a.n
      AND (p_bairro IS NULL OR upper(g.bairro) = upper(p_bairro))
  )
  SELECT lat, lng, fonte FROM (
    SELECT * FROM itbi WHERE qtd > 0
    UNION ALL
    SELECT * FROM geo WHERE qtd > 0
  ) s
  LIMIT 1;
$function$;