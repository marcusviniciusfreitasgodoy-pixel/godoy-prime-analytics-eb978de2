# Backup ITBI pré-dedupe — Agendamento de limpeza

- **Tabela**: `public.itbi_transactions_backup_pre_dedupe`
- **Criada em**: 21/05/2026 (durante migração de deduplicação)
- **Linhas**: 31.590 (estado pré-dedupe)
- **RLS**: somente admin pode visualizar
- **Data sugerida para remoção**: **28/05/2026** (após 7 dias de validação)

## Comando de limpeza

```sql
DROP TABLE IF EXISTS public.itbi_transactions_backup_pre_dedupe;
```

## Como restaurar (caso necessário antes de 28/05)

```sql
-- Reverter dedupe a partir do backup (apenas em emergência)
TRUNCATE public.itbi_transactions;
INSERT INTO public.itbi_transactions
SELECT * FROM public.itbi_transactions_backup_pre_dedupe;
```

⚠️ Restaurar reintroduz as 2.275 duplicatas e quebra o índice único. Use apenas se houver perda de dado real comprovada.