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

  t := UPPER(TRIM(texto));
  t := TRANSLATE(t, 'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'AAAAAAEEEEIIIIOOOOOUUUUC');

  t := REGEXP_REPLACE(t, '[^A-Z0-9]+', ' ', 'g');
  t := ' ' || TRIM(t) || ' ';

  t := REGEXP_REPLACE(t, ' (AVENIDA|AVN|AVE|AV) ', ' AV ', 'g');
  t := REGEXP_REPLACE(t, ' (RUA|R) ', ' RUA ', 'g');
  t := REGEXP_REPLACE(t, ' (ESTRADA|ESTR|EST) ', ' EST ', 'g');
  t := REGEXP_REPLACE(t, ' (PRACA|PCA|PC) ', ' PRACA ', 'g');
  t := REGEXP_REPLACE(t, ' (TRAVESSA|TRV|TV) ', ' TV ', 'g');
  t := REGEXP_REPLACE(t, ' (ALAMEDA|ALA|AL) ', ' ALA ', 'g');
  t := REGEXP_REPLACE(t, ' (ESTRADA|EST) ', ' EST ', 'g');
  t := REGEXP_REPLACE(t, ' (LARGO|LGO) ', ' LGO ', 'g');
  t := REGEXP_REPLACE(t, ' (ROD|RODOVIA) ', ' ROD ', 'g');

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
  t := REGEXP_REPLACE(t, ' (DESENHISTA|DESEN) ', ' DESENHISTA ', 'g');
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

  t := REGEXP_REPLACE(t, ' (DE|DA|DO|DAS|DOS|E) ', ' ', 'g');
  t := REGEXP_REPLACE(t, ' (DE|DA|DO|DAS|DOS|E) ', ' ', 'g');

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