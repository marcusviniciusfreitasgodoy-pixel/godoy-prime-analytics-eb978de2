-- Deduplicar itbi_transactions: manter apenas 1 registro por combinação única
-- de logradouro + data_transacao + tipologia + valor_m2 + total_transacoes + uso + bairro + area_m2
DELETE FROM itbi_transactions
WHERE id NOT IN (
  SELECT DISTINCT ON (logradouro, data_transacao, tipologia, valor_m2, total_transacoes, uso, bairro, area_m2)
    id
  FROM itbi_transactions
  ORDER BY logradouro, data_transacao, tipologia, valor_m2, total_transacoes, uso, bairro, area_m2, created_at ASC
);