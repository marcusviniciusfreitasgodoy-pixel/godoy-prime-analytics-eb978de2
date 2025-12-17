-- Add new fields to leads table for enhanced lead capture
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS endereco_imovel_analise TEXT,
ADD COLUMN IF NOT EXISTS valor_pedido_vendedor NUMERIC;