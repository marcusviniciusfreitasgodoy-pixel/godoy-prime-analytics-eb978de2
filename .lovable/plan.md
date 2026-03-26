

## Diagnóstico: Por que o R$/m² da Av. Lucio Costa está baixo

### O que os dados mostram

Consultei diretamente a tabela `itbi_transactions` para a AVN LUCIO COSTA. Eis o que encontrei:

```text
DATA        | TIPOLOGIA    | TRANSAÇÕES | R$/m²
------------|--------------|------------|--------
2026-02     | Apartamento  | 37         | 14.994
2026-02     | Casa         | 2          | 9.511
2026-01     | Apartamento  | 20         | 16.891
2025-12     | Apartamento  | 36         | 16.992
2025-12     | Casa         | 2          | 8.246
2025-11     | Apartamento  | 37         | 13.257
2025-11     | Casa         | 2          | 4.900  ← outlier
2025-10     | Apartamento  | 33         | 14.676
2025-10     | Casa         | 2          | 8.985
2025-09     | Apartamento  | 26         | 15.078
2025-09     | Casa         | 2          | 9.540
...
```

### Problema 1: Linhas duplicadas no banco

Cada registro aparece **2 vezes** na tabela. Ex: "2026-02, Apartamento, 37 trans, R$ 14.994" existe em dobro. Isso dobra artificialmente o peso dos registros de baixo valor.

### Problema 2: Cálculo sem ponderação por volume

O código atual em `calculateITBIData` (Step1Location.tsx, linha 286):
- Busca apenas `valor_m2` e `valor_transacao` — **não busca `total_transacoes`**
- Trata cada linha do banco com peso igual
- Uma linha de Casa com **2 escrituras** (R$ 4.900/m²) tem o mesmo peso que uma de Apartamento com **37 escrituras** (R$ 14.994/m²)

**Resultado**: as linhas de Casa (sempre 2 transações, valores R$ 4.900–9.500) puxam a mediana para baixo, mesmo representando menos de 10% do volume real de escrituras.

Se ponderássemos por `total_transacoes`, o valor mediano ponderado ficaria entre **R$ 14.500–16.000/m²**, consistente com o mercado da Lucio Costa.

### Plano de Correção

#### 1. Remover duplicatas no banco
- Executar query de deduplicação na tabela `itbi_transactions` para eliminar linhas idênticas (mesmo logradouro + data + tipologia + valor_m2 + total_transacoes)

#### 2. Adicionar `total_transacoes` à query do motor de avaliação
- Em `fetchMarketRows()` (Step1Location.tsx, linha 99): adicionar `total_transacoes` ao `.select()`
- Atualizar o tipo do retorno para incluir `total_transacoes`

#### 3. Implementar mediana ponderada em `calculateITBIData`
- Expandir cada linha pelo seu `total_transacoes` antes de calcular min/med/max
- Ou seja: uma linha com `total_transacoes=37` e `valor_m2=14.994` contribui 37x no cálculo, enquanto uma com `total_transacoes=2` contribui apenas 2x
- `transaction_count` passa a ser `SUM(total_transacoes)` em vez de `rows.length`

#### 4. Propagar a mesma correção para outros módulos que usam lógica similar
- `useEvolutionData.ts` — já busca `total_transacoes` mas **não usa como peso** na média
- `useHistoricalTransactionAnalysis.ts` — verificar se pondera corretamente
- `EmbeddedAdvancedSearch.tsx` — verificar contagem

### Arquivos a alterar
- **Migration SQL** — deduplicação da tabela
- `src/components/valuation/Step1Location.tsx` — query + cálculo ponderado
- `src/hooks/useEvolutionData.ts` — média ponderada por total_transacoes
- `src/hooks/useHistoricalTransactionAnalysis.ts` — verificar/corrigir ponderação

### Impacto esperado
Após a correção, o R$/m² sugerido para a Av. Lucio Costa deve subir de ~R$ 12.000–13.000 para ~R$ 14.500–16.000/m², refletindo o peso real das 300+ escrituras de apartamentos vs as ~20 escrituras de casas.

