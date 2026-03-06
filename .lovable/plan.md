

## Diagnóstico

A rua **"RUA JOAO GERALDO KUHLMANN"** possui **apenas 1 registro** na base ITBI, datado de **2026-02-15**. 

O hook `useHistoricalTransactionAnalysis` usa uma janela de **5 anos fechados** (2021–2025), excluindo o ano corrente (2026). Como o único registro é de 2026, a busca por logradouro retorna 0 resultados, cai no fallback do bairro, e o componente exibe a mensagem de "sem transações desde 2021".

Isso é **comportamento correto do sistema** — a rua realmente não teve transações registradas entre 2021 e 2025. A transação de fevereiro/2026 existe mas é excluída da análise histórica por design (anos fechados evitam distorção por ano parcial).

## O que pode ser melhorado

A mensagem ao usuário poderia ser mais transparente, indicando que **há dados recentes (2026) mas fora da janela histórica de 5 anos**. Atualmente, a mensagem sugere que não há nenhum dado, o que não é totalmente preciso.

### Alterações propostas

1. **`useHistoricalTransactionAnalysis.ts`**: Após a busca principal (2021–2025), fazer uma consulta adicional leve para verificar se existem transações do logradouro no **ano corrente** (2026). Se existirem, incluir essa informação no objeto `HistoricalAnalysis` retornado (ex: campo `hasCurrentYearData`, `currentYearTransactions`, `currentYearAvgM2`).

2. **`HistoricalAnalysisChart.tsx`**: Se `dataSource === 'bairro'` mas `hasCurrentYearData === true`, exibir um alerta informativo tipo: *"Este logradouro possui X transações em 2026 (R$ Y/m²), mas ainda não há volume suficiente no período histórico 2021–2025 para análise individual. Os dados do bairro são exibidos como referência."*

3. **Tipo `HistoricalAnalysis`**: Adicionar campos opcionais `hasCurrentYearData?: boolean`, `currentYearCount?: number`, `currentYearAvgM2?: number`.

Nenhuma alteração de schema ou migração necessária.

