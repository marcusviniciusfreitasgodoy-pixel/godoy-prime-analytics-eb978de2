-- Adicionar coluna para armazenar as fontes dos anúncios de referência
ALTER TABLE public.valuations
ADD COLUMN anuncio_fontes jsonb DEFAULT NULL;

COMMENT ON COLUMN public.valuations.anuncio_fontes IS 'Array de objetos com valor, area e fonte (link) dos anúncios de referência';