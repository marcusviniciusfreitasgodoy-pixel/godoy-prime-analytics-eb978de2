

## Auditoria: Queries sem `.limit()` que podem ser truncadas pelo limite de 1000 linhas

### Resultado da análise

Analisei todas as queries ao `itbi_transactions` no projeto. Alguns hooks já usam paginação (`.range()`) ou `.limit()` adequado. Identifiquei **5 queries vulneráveis** ao truncamento:

### Queries com risco de truncamento

| # | Arquivo | Linha | Contexto | Risco |
|---|---------|-------|----------|-------|
| 1 | `useTransactionMapData.ts` | ~63-86 | Query do mapa de transações — busca por bairro sem `.limit()` | **Alto** — Barra da Tijuca tem ~1000+ registros por ano |
| 2 | `useStreetComparison.ts` | ~63-71 | Query de dados atuais por logradouro (período atual) | **Baixo** — filtrado por logradouro individual, dificilmente >1000 |
| 3 | `useStreetComparison.ts` | ~97-106 | Query de dados anteriores por logradouro (período anterior) | **Baixo** — mesmo filtro estreito |
| 4 | `EmbeddedAdvancedSearch.tsx` | ~223-226 | "totalQuery" sem limit para calcular totais agregados | **Alto** — busca ampla por bairro pode retornar >1000 |
| 5 | `useHistoricalTransactionAnalysis.ts` | ~440-448 | Query de dados do ano corrente por logradouro | **Baixo** — filtrado por logradouro+ano |
| 6 | `SyncITBIButton.tsx` | ~99-103 | Contagem de meses existentes por ano | **Médio** — um ano inteiro de bairro grande pode ter >1000 |

### Queries que já estão protegidas
- `useKPIStats.ts` — todas com `.limit(10000)` ✅
- `useITBITransactions.ts` — todas com `.limit(10000)` ✅
- `useHistoricalTransactionAnalysis.ts` — queries principais com `.limit(5000)` ✅
- `useEvolutionData.ts` — paginação via `.range()` ✅
- `useMicrobairroEvolutionData.ts` — paginação via `.range()` ✅
- `useTransactionSearch.ts` — com `.limit(5000)` ✅

### Plano de correção

#### 1. `src/hooks/useTransactionMapData.ts` (linha ~86)
Adicionar `.limit(5000)` antes de executar a query. Este é o caso mais crítico — o mapa pode estar mostrando dados incompletos para bairros grandes.

#### 2. `src/components/EmbeddedAdvancedSearch.tsx` (linha ~226)
A "totalQuery" deliberadamente não tem limit para calcular totais corretos, mas será truncada silenciosamente em 1000. Adicionar `.limit(5000)` para cobrir cenários amplos.

#### 3. `src/hooks/useStreetComparison.ts` (linhas ~63 e ~97)
Adicionar `.limit(2000)` por segurança, embora o risco seja baixo.

#### 4. `src/components/SyncITBIButton.tsx` (linha ~99)
Adicionar `.limit(5000)` para garantir contagem correta de meses.

#### 5. `src/hooks/useHistoricalTransactionAnalysis.ts` (linha ~441)
Adicionar `.limit(2000)` por segurança.

### Arquivos alterados
- `src/hooks/useTransactionMapData.ts`
- `src/components/EmbeddedAdvancedSearch.tsx`
- `src/hooks/useStreetComparison.ts`
- `src/components/SyncITBIButton.tsx`
- `src/hooks/useHistoricalTransactionAnalysis.ts`

