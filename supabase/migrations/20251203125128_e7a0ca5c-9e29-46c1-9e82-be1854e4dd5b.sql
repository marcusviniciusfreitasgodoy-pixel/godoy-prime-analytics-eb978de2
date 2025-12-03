-- Adicionar coluna total_transacoes para armazenar número real de transações por agregação
ALTER TABLE public.itbi_transactions 
ADD COLUMN IF NOT EXISTS total_transacoes integer NOT NULL DEFAULT 1;

-- Adicionar coluna percentual_transferido para controle
ALTER TABLE public.itbi_transactions 
ADD COLUMN IF NOT EXISTS percentual_transferido numeric DEFAULT 100;

-- Criar índice para melhor performance nas queries de KPI
CREATE INDEX IF NOT EXISTS idx_itbi_bairro_uso_data ON public.itbi_transactions(bairro, uso, data_transacao);

COMMENT ON COLUMN public.itbi_transactions.total_transacoes IS 'Número de transações agregadas neste registro (fonte: Prefeitura)';
COMMENT ON COLUMN public.itbi_transactions.percentual_transferido IS 'Percentual médio transferido nas transações';