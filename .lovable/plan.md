

## Problema

Quando o usuário seleciona "Personalizado" no Step 2 e digita um valor de R$/m², ou seleciona "Mínimo"/"Máximo", a avaliação **ignora essa escolha** e sempre calcula com base nos preços combinados (ITBI 70% + Anúncios 30%).

O fluxo atual:
1. Step2BasicData mostra a seleção e calcula um "Preço Base" visual correto
2. `calculateValuation()` recalcula internamente via `calculateCombinedPrices(itbi, anuncio)` — **sem receber `baseSelected` ou `customBaseM2`**
3. `calculateFinalValues()` usa `combined.med_m2` como valor provável, ignorando a escolha do usuário

## Correção

### 1. `src/utils/valuationCalculations.ts`

Adicionar parâmetros opcionais `baseSelected` e `customBaseM2` à função `calculateValuation()`. Quando o usuário escolhe algo diferente de "med", sobrescrever os preços do `combined` antes de calcular os valores finais:

- **"min"**: usar `combined.min_m2` como mediana (provável = pessimista)
- **"max"**: usar `combined.max_m2` como mediana (provável = otimista)  
- **"custom"**: usar `customBaseM2` como mediana, recalcular min/max proporcionalmente

Concretamente, criar uma função `applyBaseSelection(combined, baseSelected, customBaseM2)` que retorna um `CombinedPrices` ajustado:
- Para "custom": `med_m2 = customBaseM2`, `min_m2 = customBaseM2 * (original_min/original_med)`, `max_m2 = customBaseM2 * (original_max/original_med)` — mantendo a mesma proporção relativa
- Para "min"/"max": similar, recentrando o spread no valor selecionado

### 2. `src/components/valuation/ValuationEngine.tsx`

Passar `state.baseSelected` e `state.customBaseM2` nas chamadas a `calculateValuation()` (linhas ~259 e ~305).

### Arquivos alterados
- `src/utils/valuationCalculations.ts` — nova função + parâmetros extras em `calculateValuation`
- `src/components/valuation/ValuationEngine.tsx` — passar os novos parâmetros

