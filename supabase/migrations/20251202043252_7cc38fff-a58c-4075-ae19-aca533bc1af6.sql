-- Criar tabela condominios_mapeamento
CREATE TABLE public.condominios_mapeamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_condominio TEXT NOT NULL,
  logradouro_padrao TEXT NOT NULL,
  numero_inicio INTEGER,
  numero_fim INTEGER,
  microbairro TEXT,
  padrao_construtivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhorar performance de busca
CREATE INDEX idx_condominios_logradouro ON public.condominios_mapeamento(logradouro_padrao);
CREATE INDEX idx_condominios_microbairro ON public.condominios_mapeamento(microbairro);
CREATE INDEX idx_condominios_nome ON public.condominios_mapeamento(nome_condominio);

-- Enable RLS
ALTER TABLE public.condominios_mapeamento ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem visualizar condomínios
CREATE POLICY "Usuários autenticados podem visualizar condomínios"
ON public.condominios_mapeamento
FOR SELECT
TO authenticated
USING (true);

-- Policy: Apenas admins podem inserir/atualizar condomínios
CREATE POLICY "Apenas admins podem gerenciar condomínios"
ON public.condominios_mapeamento
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Criar tabela ia_valuation_weights
CREATE TABLE public.ia_valuation_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_variavel TEXT NOT NULL,
  parametro TEXT NOT NULL,
  peso_valor NUMERIC NOT NULL,
  tipo_imovel TEXT NOT NULL CHECK (tipo_imovel IN ('Apartamento', 'Casa', 'Ambos')),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para consultas por tipo de imóvel
CREATE INDEX idx_valuation_tipo_imovel ON public.ia_valuation_weights(tipo_imovel);
CREATE INDEX idx_valuation_variavel ON public.ia_valuation_weights(nome_variavel);

-- Enable RLS
ALTER TABLE public.ia_valuation_weights ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem visualizar pesos
CREATE POLICY "Usuários autenticados podem visualizar pesos"
ON public.ia_valuation_weights
FOR SELECT
TO authenticated
USING (true);

-- Policy: Apenas admins podem gerenciar pesos
CREATE POLICY "Apenas admins podem gerenciar pesos"
ON public.ia_valuation_weights
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_ia_valuation_weights_updated_at
BEFORE UPDATE ON public.ia_valuation_weights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();