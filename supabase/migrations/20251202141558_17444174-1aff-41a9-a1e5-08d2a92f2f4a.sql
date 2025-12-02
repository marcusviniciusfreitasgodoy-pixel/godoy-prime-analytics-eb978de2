-- Add missing label column to match source schema
ALTER TABLE public.ia_valuation_weights 
ADD COLUMN IF NOT EXISTS label text;