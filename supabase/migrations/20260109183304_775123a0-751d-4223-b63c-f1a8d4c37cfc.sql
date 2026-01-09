-- Create vistorias table to store digital inspections history
CREATE TABLE public.vistorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Property data
  logradouro TEXT NOT NULL,
  numero TEXT,
  complemento TEXT,
  bairro TEXT NOT NULL DEFAULT 'BARRA DA TIJUCA',
  nome_condominio TEXT,
  tipo_imovel TEXT,
  area_m2 NUMERIC,
  quartos INTEGER,
  suites INTEGER,
  banheiros INTEGER,
  vagas INTEGER,
  proprietario TEXT,
  telefone TEXT,
  vistoriador TEXT,
  data_vistoria DATE,
  observacoes TEXT,
  
  -- Inspection results
  tipo_vistoria TEXT, -- 'casa' or 'apartamento'
  final_score NUMERIC,
  progress NUMERIC,
  critical_count INTEGER DEFAULT 0,
  checklist_data JSONB,
  
  -- Valuation data (if linked)
  valuation_id UUID REFERENCES public.valuations(id),
  valor_avaliacao NUMERIC,
  valor_ajustado NUMERIC,
  ajuste_percentual NUMERIC,
  
  -- PDF
  pdf_generated BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own vistorias" 
ON public.vistorias 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vistorias" 
ON public.vistorias 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vistorias" 
ON public.vistorias 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vistorias" 
ON public.vistorias 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin can view all vistorias
CREATE POLICY "Admins can view all vistorias"
ON public.vistorias
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vistorias_updated_at
BEFORE UPDATE ON public.vistorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();