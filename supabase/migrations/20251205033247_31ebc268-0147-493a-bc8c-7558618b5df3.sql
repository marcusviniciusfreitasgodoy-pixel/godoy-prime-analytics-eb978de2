-- Create a secure function to retrieve vault secrets
-- Only accessible by service_role (Edge Functions with SUPABASE_SERVICE_ROLE_KEY)
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value text;
BEGIN
  -- Only allow service_role to access this function
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: requires service_role';
  END IF;
  
  -- Retrieve the decrypted secret from vault
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name;
  
  RETURN secret_value;
END;
$$;

-- Grant execute permission only to service_role
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM authenticated;

-- Insert secrets into Vault (these values will be encrypted at rest)
-- Note: The service_role key should be rotated after this migration
SELECT vault.create_secret(
  'https://wlnwspjobfdjftyffqne.supabase.co',
  'source_project_url',
  'URL do projeto fonte para sincronização de dados'
);

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbndzcGpvYmZkamZ0eWZmcW5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2NzIwMCwiZXhwIjoyMDc5ODQzMjAwfQ.AoFvK9z_pFlBMUp33NZ9C3J6UWsIOt6t504k7gVzWEA',
  'source_project_service_key',
  'Service role key do projeto fonte para sincronização de dados'
);