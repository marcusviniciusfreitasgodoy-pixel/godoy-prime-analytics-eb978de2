-- Adicionar campos de identificação do imóvel à tabela valuations
ALTER TABLE public.valuations 
ADD COLUMN IF NOT EXISTS complemento text,
ADD COLUMN IF NOT EXISTS nome_condominio text,
ADD COLUMN IF NOT EXISTS quartos integer,
ADD COLUMN IF NOT EXISTS suites integer,
ADD COLUMN IF NOT EXISTS banheiros integer,
ADD COLUMN IF NOT EXISTS vagas integer,
ADD COLUMN IF NOT EXISTS andar text,
ADD COLUMN IF NOT EXISTS proprietario text,
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS observacoes_imovel text;