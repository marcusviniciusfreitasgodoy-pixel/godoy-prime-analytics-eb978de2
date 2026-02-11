ALTER TABLE public.feedbacks_visita 
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS sinal_entrada numeric,
  ADD COLUMN IF NOT EXISTS valor_financiado numeric;