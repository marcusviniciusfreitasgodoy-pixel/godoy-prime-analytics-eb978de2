-- Add evaluation count column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS evaluation_count integer DEFAULT 1;

-- Update existing leads to have count of 1
UPDATE public.leads SET evaluation_count = 1 WHERE evaluation_count IS NULL;