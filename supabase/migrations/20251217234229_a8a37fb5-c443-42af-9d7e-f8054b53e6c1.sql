-- Fix: Remove overly permissive public UPDATE policy on leads table
-- and replace with a secure function for incrementing evaluation count

-- Drop the insecure public update policy
DROP POLICY IF EXISTS "Permitir atualização pública de leads" ON public.leads;

-- Create a secure function to increment evaluation count with rate limiting
-- This function only allows incrementing evaluation_count by 1, with email validation
CREATE OR REPLACE FUNCTION public.increment_lead_evaluation(lead_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment if lead exists and hasn't been updated in the last minute (rate limit)
  UPDATE public.leads 
  SET evaluation_count = COALESCE(evaluation_count, 0) + 1,
      updated_at = now()
  WHERE email = lead_email
    AND (updated_at < now() - interval '1 minute' OR updated_at IS NULL);
END;
$$;

-- Grant execute to anon and authenticated (for public evaluation page)
GRANT EXECUTE ON FUNCTION public.increment_lead_evaluation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_lead_evaluation(text) TO authenticated;