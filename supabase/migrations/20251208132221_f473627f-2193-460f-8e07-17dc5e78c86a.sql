-- Adicionar colunas de características do imóvel à tabela leads
ALTER TABLE public.leads
ADD COLUMN quartos integer,
ADD COLUMN banheiros integer,
ADD COLUMN suites integer,
ADD COLUMN vagas integer;