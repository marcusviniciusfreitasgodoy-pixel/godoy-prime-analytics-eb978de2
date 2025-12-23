-- Add column to track if reminder was sent
ALTER TABLE public.agendamentos_visita 
ADD COLUMN lembrete_enviado boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_agendamentos_lembrete ON public.agendamentos_visita(lembrete_enviado, data_hora, status);