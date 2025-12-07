-- Create leads table for prospect clients
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  interesse text DEFAULT 'compra',
  bairro_interesse text,
  area_interesse numeric,
  valor_interesse numeric,
  origem text DEFAULT 'avaliacao_rapida',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  convertido boolean DEFAULT false,
  notas text
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy for public insert (anyone can register as lead)
CREATE POLICY "Qualquer pessoa pode se cadastrar como lead"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Policy for admin to view all leads
CREATE POLICY "Admins podem visualizar todos os leads"
ON public.leads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for admin to manage leads
CREATE POLICY "Admins podem gerenciar leads"
ON public.leads
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();