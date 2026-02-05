-- Remove evaluation_count from check_lead_exists to prevent information leakage
CREATE OR REPLACE FUNCTION public.check_lead_exists(lead_email text)
 RETURNS TABLE(exists_flag boolean, current_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return existence status, always return 1 for current_count to maintain API compatibility
  -- The actual evaluation_count is now managed internally by lead-operations edge function
  RETURN QUERY
  SELECT 
    TRUE as exists_flag,
    1 as current_count  -- Fixed value to prevent information disclosure
  FROM public.leads 
  WHERE email = lower(trim(lead_email))
  LIMIT 1;
  
  -- If no rows returned, return false with count 0
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE as exists_flag, 0 as current_count;
  END IF;
END;
$function$;