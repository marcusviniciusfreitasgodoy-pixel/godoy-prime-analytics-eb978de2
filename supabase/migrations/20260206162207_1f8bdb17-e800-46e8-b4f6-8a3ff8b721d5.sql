
-- 1. Adicionar colunas ao perfil do corretor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS creci TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Habilitar Realtime na tabela feedbacks_visita
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks_visita;
