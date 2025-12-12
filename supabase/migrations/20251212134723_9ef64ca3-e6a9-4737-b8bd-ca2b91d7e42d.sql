-- Tabela de base de conhecimento para RAG
CREATE TABLE public.sofia_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  source VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para busca por categoria
CREATE INDEX idx_sofia_knowledge_category ON public.sofia_knowledge_base(category);

-- Índice GIN para busca por keywords
CREATE INDEX idx_sofia_knowledge_keywords ON public.sofia_knowledge_base USING GIN(keywords);

-- Índice para busca full-text
CREATE INDEX idx_sofia_knowledge_content ON public.sofia_knowledge_base USING GIN(to_tsvector('portuguese', content));

-- Enable RLS
ALTER TABLE public.sofia_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Acesso público para leitura" 
ON public.sofia_knowledge_base 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Apenas admins podem gerenciar conhecimento" 
ON public.sofia_knowledge_base 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_sofia_knowledge_updated_at
BEFORE UPDATE ON public.sofia_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir conhecimento inicial sobre documentação imobiliária
INSERT INTO public.sofia_knowledge_base (category, title, content, keywords) VALUES
('documentacao', 'Certidão de Ônus Reais', 
'A Certidão de Ônus Reais é emitida pelo Registro de Imóveis e informa se existem gravames sobre o imóvel como hipotecas, penhoras, usufruto, alienação fiduciária, entre outros. É fundamental para verificar se o imóvel está livre de dívidas ou impedimentos. Validade: geralmente 30 dias. Onde obter: Cartório de Registro de Imóveis da circunscrição do imóvel. Custo: varia por estado, média R$ 50-150.', 
ARRAY['ônus', 'certidão', 'hipoteca', 'penhora', 'gravame', 'registro']),

('documentacao', 'Certidão Negativa de IPTU', 
'A Certidão Negativa de IPTU comprova que não existem débitos de IPTU (Imposto Predial e Territorial Urbano) sobre o imóvel. É essencial para transferência de propriedade, pois débitos de IPTU são vinculados ao imóvel e não ao proprietário anterior. Onde obter: Prefeitura Municipal ou secretaria de fazenda. Prazo de emissão: 1-5 dias úteis. Observação: débitos de IPTU podem impedir o registro da escritura.', 
ARRAY['iptu', 'imposto', 'débito', 'prefeitura', 'tributo']),

('documentacao', 'Declaração de Quitação Condominial', 
'A Declaração de Quitação Condominial é emitida pelo síndico ou administradora do condomínio, atestando que não há débitos de taxas condominiais. É obrigatória para venda de unidades em condomínios. Importante: débitos condominiais são obrigação propter rem (seguem o imóvel). Prazo de validade: recomenda-se obter próximo à data da escritura. Responsável: síndico ou administradora.', 
ARRAY['condomínio', 'taxa', 'síndico', 'administradora', 'quitação']),

('documentacao', 'HABITE-SE e Averbação', 
'O HABITE-SE (Auto de Conclusão de Obra) é documento emitido pela Prefeitura atestando que a construção foi concluída conforme projeto aprovado. A Averbação da Construção no Registro de Imóveis oficializa a existência da edificação. Imóveis sem HABITE-SE ou sem averbação podem ter valor reduzido em 15-25% e dificuldade para financiamento bancário.', 
ARRAY['habite-se', 'averbação', 'construção', 'obra', 'prefeitura', 'certidão']),

('legislacao', 'Lei do Inquilinato - Aspectos Essenciais', 
'A Lei 8.245/91 (Lei do Inquilinato) regula locações de imóveis urbanos. Pontos-chave: prazo mínimo residencial 30 meses para denúncia vazia, garantias permitidas (caução, fiança, seguro fiança), reajuste anual pelo índice contratual (geralmente IGP-M ou IPCA), multa por rescisão antecipada proporcional ao tempo restante. Ação de despejo: prazo médio 6-12 meses no Rio de Janeiro.', 
ARRAY['inquilinato', 'locação', 'aluguel', 'despejo', 'fiança', 'caução']),

('legislacao', 'ITBI - Imposto de Transmissão', 
'O ITBI (Imposto sobre Transmissão de Bens Imóveis) incide sobre transferências de propriedade imobiliária. No Rio de Janeiro: alíquota de 3% sobre o valor venal ou de transação (o maior). Isenções: transmissão por herança ou doação (paga ITCMD estadual), primeira aquisição de imóvel até determinado valor (verificar legislação municipal atualizada). Pagamento: antes do registro da escritura.', 
ARRAY['itbi', 'imposto', 'transmissão', 'escritura', 'alíquota']),

('avaliacao', 'Metodologia de Avaliação Imobiliária', 
'A avaliação imobiliária profissional segue a NBR 14653 (Avaliação de Bens). Métodos principais: 1) Comparativo Direto de Dados de Mercado (mais usado para imóveis urbanos), 2) Método da Renda (para imóveis comerciais/investimento), 3) Método Evolutivo (terreno + custo de construção depreciada). Fatores de valorização: localização, padrão construtivo, estado de conservação, vista, insolação, vagas, lazer.', 
ARRAY['avaliação', 'nbr', 'metodologia', 'comparativo', 'valor', 'laudo']),

('avaliacao', 'Fatores de Valorização e Depreciação', 
'Fatores que valorizam: vista mar/parque (+5-15%), andar alto (+2-5% por andar), sol da manhã (+1-3%), reformado (+5-10%), lazer completo (+3-8%), vaga extra (+3-5%). Fatores que depreciam: térreo (-3-8%), fundos (-2-5%), sem vista (-3-7%), necessidade de reforma (-10-20%), sem portaria 24h (-5-10%). A localização pode representar até 40% do valor total.', 
ARRAY['valorização', 'depreciação', 'vista', 'andar', 'reforma', 'lazer']),

('mercado', 'Indicadores de Mercado Imobiliário', 
'Principais indicadores: 1) Preço médio por m² - varia por bairro e microrregião, 2) Liquidez - tempo médio de venda (mercado aquecido: 30-60 dias, normal: 90-180 dias), 3) Variação YoY - valorização anual, 4) Spread - diferença entre preço pedido e fechado (normalmente 5-15%), 5) Taxa de vacância - imóveis disponíveis vs ocupados. ITBI é o melhor indicador de preços reais pois reflete transações efetivas.', 
ARRAY['indicador', 'mercado', 'liquidez', 'valorização', 'spread']),

('mercado', 'Ciclos do Mercado Imobiliário', 
'O mercado imobiliário opera em ciclos de 7-10 anos: 1) Recuperação - preços baixos, início de alta, 2) Expansão - demanda crescente, lançamentos, 3) Pico - preços máximos, superoferta, 4) Contração - queda de vendas e preços. Fatores de influência: taxa Selic (custo de financiamento), emprego/renda, confiança do consumidor, oferta de crédito, lançamentos imobiliários.', 
ARRAY['ciclo', 'selic', 'financiamento', 'crédito', 'expansão', 'contração']);