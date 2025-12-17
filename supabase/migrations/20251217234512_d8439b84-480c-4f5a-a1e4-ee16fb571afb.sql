-- Fix: Remove public SELECT policies on leads table that expose customer PII
-- Only admins should be able to view all leads

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Permitir leitura pública de leads por email" ON public.leads;

-- Create a secure function to check if a lead exists by email (for public form validation)
-- Returns only existence status, not the actual lead data
CREATE OR REPLACE FUNCTION public.check_lead_exists(lead_email text)
RETURNS TABLE(exists_flag boolean, current_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as exists_flag,
    COALESCE(evaluation_count, 1) as current_count
  FROM public.leads 
  WHERE email = lower(trim(lead_email))
  LIMIT 1;
  
  -- If no rows returned, return false with count 0
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE as exists_flag, 0 as current_count;
  END IF;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_lead_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_lead_exists(text) TO authenticated;