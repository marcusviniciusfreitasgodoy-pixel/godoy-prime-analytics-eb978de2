-- Criar enum para classificação de uso
CREATE TYPE public.uso_imovel AS ENUM ('Residencial', 'Comercial');

-- Criar tabela principal de transações ITBI
CREATE TABLE public.itbi_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logradouro TEXT NOT NULL,
  numero TEXT,
  complemento TEXT,
  bairro TEXT DEFAULT 'BARRA DA TIJUCA',
  valor_transacao DECIMAL(15,2) NOT NULL,
  area_m2 DECIMAL(10,2) NOT NULL,
  valor_m2 DECIMAL(10,2) GENERATED ALWAYS AS (valor_transacao / NULLIF(area_m2, 0)) STORED,
  data_transacao DATE NOT NULL,
  uso uso_imovel NOT NULL DEFAULT 'Residencial',
  tipologia TEXT, -- Apartamento, Casa, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_itbi_logradouro ON public.itbi_transactions(logradouro);
CREATE INDEX idx_itbi_data ON public.itbi_transactions(data_transacao DESC);
CREATE INDEX idx_itbi_uso ON public.itbi_transactions(uso);
CREATE INDEX idx_itbi_bairro ON public.itbi_transactions(bairro);

-- View de ranking por microbairros (agrupa ruas em sub-regiões)
CREATE OR REPLACE VIEW public.view_ranking_microbairros AS
SELECT 
  CASE 
    WHEN logradouro ILIKE '%peninsula%' OR logradouro ILIKE '%península%' THEN 'Península'
    WHEN logradouro ILIKE '%jardim oceanico%' OR logradouro ILIKE '%jardim oceânico%' THEN 'Jardim Oceânico'
    WHEN logradouro ILIKE '%orla%' OR logradouro ILIKE '%lucio costa%' OR logradouro ILIKE '%lúcio costa%' THEN 'Orla'
    WHEN logradouro ILIKE '%riserva%' THEN 'Riserva Golf'
    WHEN logradouro ILIKE '%villa%' OR logradouro ILIKE '%village%' THEN 'Vilas'
    WHEN logradouro ILIKE '%majestic%' THEN 'Majestic'
    WHEN logradouro ILIKE '%le parc%' THEN 'Le Parc'
    WHEN logradouro ILIKE '%ilha pura%' THEN 'Ilha Pura'
    ELSE 'Outras Regiões'
  END AS microbairro,
  COUNT(*) AS total_transacoes,
  ROUND(AVG(valor_m2)::numeric, 2) AS preco_medio_m2,
  ROUND(MIN(valor_m2)::numeric, 2) AS preco_min_m2,
  ROUND(MAX(valor_m2)::numeric, 2) AS preco_max_m2,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor_m2)::numeric, 2) AS mediana_m2
FROM public.itbi_transactions
WHERE uso = 'Residencial'
  AND data_transacao >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY microbairro
ORDER BY preco_medio_m2 DESC;

-- Habilitar RLS
ALTER TABLE public.itbi_transactions ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todos autenticados podem ler)
CREATE POLICY "Usuários autenticados podem visualizar transações"
ON public.itbi_transactions
FOR SELECT
TO authenticated
USING (true);

-- Policy para inserção (apenas admins - preparando para futuro ETL)
CREATE POLICY "Apenas sistema pode inserir transações"
ON public.itbi_transactions
FOR INSERT
TO authenticated
WITH CHECK (false); -- Por enquanto bloqueado, será ajustado quando implementar roles

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itbi_transactions_updated_at
BEFORE UPDATE ON public.itbi_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();