-- Habilitar extensões necessárias para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Adicionar constraint única para evitar duplicatas (necessário para upsert)
ALTER TABLE public.itbi_transactions 
ADD CONSTRAINT itbi_unique_transaction 
UNIQUE (logradouro, numero, data_transacao, valor_transacao);