
-- Tabela de propostas de compra
CREATE TABLE public.propostas_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_visita_id UUID REFERENCES fichas_visita(id),
  codigo TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL DEFAULT 'simplificado',
  
  numero_proposta TEXT,
  data_hora TIMESTAMPTZ DEFAULT now(),
  cidade_uf TEXT,
  
  nome_completo TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  
  endereco_resumido TEXT NOT NULL,
  unidade TEXT,
  matricula TEXT,
  
  valor_ofertado NUMERIC,
  moeda TEXT DEFAULT 'BRL',
  sinal_entrada TEXT,
  parcelas TEXT,
  financiamento TEXT,
  outras_condicoes TEXT,
  
  validade_proposta TIMESTAMPTZ,
  forma_aceite TEXT DEFAULT 'assinatura',
  
  assinatura_proponente TEXT,
  cnh_url TEXT,
  
  aceite_vendedor_nome TEXT,
  aceite_vendedor_cpf TEXT,
  aceite_vendedor_assinatura TEXT,
  aceite_vendedor_data TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pendente',
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_propostas_compra_updated_at
BEFORE UPDATE ON public.propostas_compra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.propostas_compra ENABLE ROW LEVEL SECURITY;

-- INSERT público (clientes sem auth)
CREATE POLICY "Qualquer pessoa pode criar proposta"
ON public.propostas_compra
FOR INSERT
WITH CHECK (true);

-- SELECT para membros da org
CREATE POLICY "Org members can view propostas"
ON public.propostas_compra
FOR SELECT
USING (organization_id = get_user_org_id(auth.uid()));

-- UPDATE para membros da org
CREATE POLICY "Org members can update propostas"
ON public.propostas_compra
FOR UPDATE
USING (organization_id = get_user_org_id(auth.uid()));

-- Leitura pública por código (para página avulsa)
CREATE POLICY "Public pode ler proposta por codigo"
ON public.propostas_compra
FOR SELECT
USING (auth.uid() IS NULL);

-- Storage bucket para documentos da proposta (CNH)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-proposta', 'documentos-proposta', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: qualquer pessoa pode fazer upload
CREATE POLICY "Anyone can upload documentos proposta"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documentos-proposta');

-- Storage policy: membros da org podem ver
CREATE POLICY "Authenticated can view documentos proposta"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documentos-proposta' AND auth.uid() IS NOT NULL);
