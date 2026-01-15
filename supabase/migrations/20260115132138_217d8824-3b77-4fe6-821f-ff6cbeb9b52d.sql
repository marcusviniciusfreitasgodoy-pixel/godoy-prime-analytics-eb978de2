-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index for faster fuzzy search on bairros_cache
CREATE INDEX IF NOT EXISTS idx_bairros_cache_bairro_trgm 
ON bairros_cache USING gin (bairro gin_trgm_ops);