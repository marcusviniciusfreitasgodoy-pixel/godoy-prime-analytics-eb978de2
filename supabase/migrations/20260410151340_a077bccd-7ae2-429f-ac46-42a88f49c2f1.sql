ALTER TABLE public.fichas_visita 
  ADD COLUMN agendamento_id uuid REFERENCES public.agendamentos_visita(id);