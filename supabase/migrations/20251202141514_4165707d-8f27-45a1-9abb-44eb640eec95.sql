-- Add missing column to match source schema
ALTER TABLE public.ia_valuation_weights 
ADD COLUMN IF NOT EXISTS factor_key text;