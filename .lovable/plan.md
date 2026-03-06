

## Problemas identificados

Há **3 bugs** que impedem o funcionamento correto:

### 1. Acentos nas ruas internas quebram a busca ILIKE
A coluna `ruas_internas` contém "Rua **Nélson** Rodrigues" (com acento), mas o banco tem "RUA **NELSON** RODRIGUES" (sem acento). O PostgreSQL `ILIKE` **não** normaliza acentos, então `logradouro.ilike.%Nélson Rodrigues%` retorna **0 resultados**. Como não encontra nada, o sistema faz fallback para o bairro inteiro (5581 transações em 2021).

### 2. Ano corrente (2026) excluído da análise
O hook `useHistoricalTransactionAnalysis` usa `endYear = currentYear - 1 = 2025`, excluindo a transação de 2026 na Rua Kuhlmann. A janela deveria incluir o ano corrente quando há dados disponíveis.

### 3. Threshold de fallback ignora contexto de condomínio
O limiar de `< 15 transações` para fazer fallback ao bairro é alto demais para condomínios fechados, onde 5-10 transações são dados válidos e representativos.

## Dados reais no banco

| Logradouro | Ano | Registros |
|---|---|---|
| RUA NELSON RODRIGUES | 2024 | 3 |
| RUA NELSON RODRIGUES | 2025 | 2 |
| RUA JOAO GERALDO KUHLMANN | 2026 | 1 |

Total: **6 transações** — dados suficientes para análise do condomínio, mas o sistema mostra dados do bairro inteiro.

## Plano de correção

### 1. Normalizar acentos no filtro de ruas internas
Em `useHistoricalTransactionAnalysis.ts` e `Step1Location.tsx`, aplicar `normalize('NFD').replace(/[\u0300-\u036f]/g, '')` nas ruas internas antes de montar o filtro `.or()`. Isso garante que "Nélson" vire "Nelson" no filtro ILIKE.

### 2. Incluir ano corrente na janela de análise
Alterar a lógica de `endYear` para incluir o ano corrente quando `ruasInternas` está presente, ou sempre incluir dados do ano corrente como "parcial" na análise. A janela passará a ser 2021-2026 (com 2026 marcado como parcial).

### 3. Reduzir threshold de fallback para condomínios
Quando `ruasInternas` está presente, reduzir o limiar de fallback de 15 para 3 transações, pois dados de condomínio são mais específicos e valiosos que dados genéricos do bairro.

### Arquivos alterados
- `src/hooks/useHistoricalTransactionAnalysis.ts` — normalizar acentos, ajustar janela e threshold
- `src/components/valuation/Step1Location.tsx` — normalizar acentos no auto-fetch ITBI

