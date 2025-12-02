-- Make columns nullable to match source schema flexibility
ALTER TABLE public.ia_valuation_weights 
ALTER COLUMN nome_variavel DROP NOT NULL,
ALTER COLUMN parametro DROP NOT NULL,
ALTER COLUMN peso_valor DROP NOT NULL,
ALTER COLUMN tipo_imovel DROP NOT NULL;