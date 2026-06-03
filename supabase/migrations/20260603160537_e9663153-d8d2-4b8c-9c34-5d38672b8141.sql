CREATE OR REPLACE FUNCTION public.gerar_token_confirmacao_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.token_confirmacao IS NULL THEN
    NEW.token_confirmacao := encode(extensions.gen_random_bytes(24), 'base64');
    NEW.token_confirmacao := replace(replace(replace(NEW.token_confirmacao, '+', '-'), '/', '_'), '=', '');
  END IF;
  IF NEW.token_expira_em IS NULL THEN
    NEW.token_expira_em := NEW.data_hora;
  END IF;
  RETURN NEW;
END;
$function$;