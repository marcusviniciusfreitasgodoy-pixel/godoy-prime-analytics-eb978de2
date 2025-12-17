-- Adicionar novos campos na tabela leads para o redesign da página de avaliação
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS objetivo TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS urgencia TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferencia_contato TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS aceita_marketing BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS diferenciais_imovel TEXT;