

## Analise: Filtro de Outliers no Modulo de Pesquisa por Localizacao

### Problema Identificado

O componente `EmbeddedAdvancedSearch.tsx` **NAO aplica filtro de outliers** no `valor_m2`. A funcao `buildBaseQuery()` (linhas 125-149) filtra apenas:
- `percentual_transferido >= 90`
- `valor_m2 not null`
- filtros do usuario (valor, area, tipologia, bairro, periodo)

**Mas NAO tem** `.lte('valor_m2', outlierLimit)` — que e o filtro presente em TODOS os outros hooks do sistema:
- `useTransactionSearch.ts` — aplica `outlierLimit` por bairro
- `useITBITransactions.ts` — aplica `outlierLimit` por bairro
- `useKPIStats.ts` — aplica `outlierLimit` por bairro
- `useHistoricalTransactionAnalysis.ts` — aplica `outlierLimit` por bairro
- `useTransactionMapData.ts` — aplica `outlierLimit` por bairro
- `useStreetComparison.ts` — aplica `outlierLimit` por bairro
- `useMicrobairroEvolutionData.ts` — aplica `outlierLimit` por bairro

### Impacto

Sem esse filtro, transacoes com `valor_m2` absurdamente altos (ex: R$ 200.000/m2) entram nos calculos, distorcendo:
- A media R$/m2 (ja calculada errada, como identificado antes)
- O volume financeiro estimado
- E distorcera os novos cards de valorizacao (CAGR e valorização total)

### Plano de Correcao

**Arquivo:** `src/components/EmbeddedAdvancedSearch.tsx`

1. Importar/replicar o mapa `OUTLIER_LIMITS` e a funcao `getOutlierLimit(bairro)` (mesmo padrao dos outros hooks)
2. Na funcao `buildBaseQuery()`, adicionar `.lte('valor_m2', outlierLimit)` usando o bairro selecionado (ou o DEFAULT de 60000 se nenhum bairro for informado)
3. Aplicar o mesmo filtro na query de historico do dialog (`transactionHistory`)

Isso garante consistencia com todos os outros modulos antes de implementar os cards de analise.

### Ordem de implementacao

Corrigir o filtro de outliers **primeiro**, e so depois implementar as melhorias (reordenar bairro + cards de analise), garantindo que os calculos de valorizacao e CAGR sejam feitos sobre dados limpos.

