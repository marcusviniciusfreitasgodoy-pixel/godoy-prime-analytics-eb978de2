-- 1. Backup de segurança
CREATE TABLE IF NOT EXISTS public.itbi_transactions_backup_pre_dedupe AS
SELECT * FROM public.itbi_transactions;

-- 2. Deduplicação: manter o registro mais recente (maior created_at) por chave natural
DELETE FROM public.itbi_transactions a
USING public.itbi_transactions b
WHERE a.created_at < b.created_at
  AND a.logradouro = b.logradouro
  AND a.bairro IS NOT DISTINCT FROM b.bairro
  AND a.data_transacao = b.data_transacao
  AND a.uso = b.uso
  AND a.tipologia IS NOT DISTINCT FROM b.tipologia;

-- 3. Remover empates remanescentes (mesmo created_at) usando ctid como desempate
DELETE FROM public.itbi_transactions a
USING public.itbi_transactions b
WHERE a.ctid < b.ctid
  AND a.logradouro = b.logradouro
  AND a.bairro IS NOT DISTINCT FROM b.bairro
  AND a.data_transacao = b.data_transacao
  AND a.uso = b.uso
  AND a.tipologia IS NOT DISTINCT FROM b.tipologia;

-- 4. Índice único para prevenir futuras duplicações (suporta upsert via onConflict)
CREATE UNIQUE INDEX IF NOT EXISTS itbi_transactions_chave_natural_uniq
ON public.itbi_transactions (logradouro, bairro, data_transacao, uso, tipologia);