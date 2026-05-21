
# Plano de correção — duplicação ITBI

## Diagnóstico confirmado
Conferindo `(logradouro, bairro, data_transacao, uso, tipologia)` como chave natural:

| Ano | Linhas | Duplicatas | Cargas distintas |
|---|---|---|---|
| 2020 | 2.538 | 24 | 2 |
| 2021 | 3.479 | 37 | 2 |
| 2022 | 3.540 | 43 | 2 |
| 2023 | 5.413 | 42 | **1** |
| 2024 | 4.044 | 69 | 2 |
| 2025 | 6.628 | 48 | 2 |
| **2026** | **5.948** | **2.275** | **3** |

- **2026 está com ~38% de duplicação** (3 cargas sobrepostas em mar/abr/mai sem limpeza).
- **2023 NÃO está duplicado** (1 carga única); o volume alto é real — provavelmente reflete revisão histórica da Prefeitura ou ano de fato aquecido. Mantemos como está.
- Demais anos têm <2% de duplicatas (ruído tolerável, pode ser limpo na mesma operação).

## Etapas

### 1. Migration: deduplicar histórico
Manter apenas a **carga mais recente** (maior `created_at`) por chave natural `(logradouro, bairro, data_transacao, uso, tipologia)`.

```sql
DELETE FROM itbi_transactions a
USING itbi_transactions b
WHERE a.ctid < b.ctid
  AND a.logradouro = b.logradouro
  AND a.bairro IS NOT DISTINCT FROM b.bairro
  AND a.data_transacao = b.data_transacao
  AND a.uso = b.uso
  AND a.tipologia IS NOT DISTINCT FROM b.tipologia;
```
(Heurística com `ctid` mantém o registro inserido por último na ordem física, que corresponde à carga mais recente já que não houve UPDATEs.)

### 2. Migration: constraint única + índice
Garante que a próxima sincronização **não consiga** mais duplicar:

```sql
CREATE UNIQUE INDEX itbi_transactions_chave_natural_uniq
ON itbi_transactions (logradouro, bairro, data_transacao, uso, tipologia);
```

(Usar índice único em vez de constraint para tolerar `NULL` em `tipologia`/`bairro` via `IS NOT DISTINCT FROM` semantics — alternativamente, normalizar nulos com `COALESCE` antes.)

### 3. Edge function `sync-itbi-prefeitura`: trocar INSERT por UPSERT
Substituir:
```ts
await supabase.from('itbi_transactions').insert(batch)
```
por:
```ts
await supabase.from('itbi_transactions').upsert(batch, {
  onConflict: 'logradouro,bairro,data_transacao,uso,tipologia',
  ignoreDuplicates: false, // atualiza com a versão mais recente
})
```
- Remove a necessidade de `clearExisting` (passa a ser idempotente).
- Cada nova sync **atualiza** os meses reprocessados em vez de duplicar.

### 4. Edge function `sync-itbi-daily` (cron): mesma troca
Aplicar o mesmo padrão upsert para a sincronização agendada.

### 5. Validação pós-correção
Rodar query de auditoria e confirmar 0 duplicatas em todos os anos. Recalcular KPIs de 2026 (esperado: ~1.800/mês em jan-mar, alinhado com baseline 2025).

## Detalhes técnicos
- **Reversibilidade**: A dedupe é destrutiva. Antes de executar, posso criar um `backup` materializado (`CREATE TABLE itbi_transactions_backup_pre_dedupe AS SELECT * FROM itbi_transactions`) — recomendado.
- **Impacto em código existente**: nenhum (apenas remove linhas redundantes; a chave natural já era assumida implicitamente nos cálculos).
- **Performance**: o índice único também acelera as queries por logradouro+data que já são comuns no app.

## Ordem de execução
1. Migration: backup + dedupe + índice único (1 migration única)
2. Edit edge functions `sync-itbi-prefeitura` e `sync-itbi-daily` para usar `upsert`
3. Deploy das edge functions
4. Query de validação final

Confirma para eu prosseguir?
