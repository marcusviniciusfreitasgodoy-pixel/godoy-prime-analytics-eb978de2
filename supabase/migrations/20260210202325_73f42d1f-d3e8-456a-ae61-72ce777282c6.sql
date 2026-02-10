ALTER TABLE public.fichas_visita
  ADD COLUMN rg_visitante TEXT,
  ADD COLUMN endereco_visitante TEXT,
  ADD COLUMN acompanhantes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN condominio_edificio TEXT,
  ADD COLUMN unidade_imovel TEXT,
  ADD COLUMN aceita_ofertas_similares BOOLEAN DEFAULT false;