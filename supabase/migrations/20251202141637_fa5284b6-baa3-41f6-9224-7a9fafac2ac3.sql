-- Add all potentially missing columns to match source schema
ALTER TABLE public.ia_valuation_weights 
ADD COLUMN IF NOT EXISTS multiplier numeric,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS order_index integer,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;