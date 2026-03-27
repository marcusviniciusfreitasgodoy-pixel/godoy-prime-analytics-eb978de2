

# Corrigir Cálculo da Variação Anual YoY

## Problema Identificado
O cálculo usa **ano-calendário 2026** (apenas Jan-Fev, 2 meses de pico) como "período atual" e compara contra **12 meses completos** do período anterior — uma comparação desproporcional que infla o resultado de ~13% real para 21,47%.

## Solução
Alterar o cálculo da variação anual para **sempre usar janelas rolling de 12 meses** (últimos 12m vs 12m anteriores), independentemente de usar dados do ano-calendário para o preço médio exibido.

## Mudança no Código

### `src/hooks/useKPIStats.ts`

**Lógica atual:**
- `precoMedio` = média ponderada de `currentTransactions` (que pode ser só 2 meses do ano atual)
- `variacaoAnual` = comparação de `precoMedio` vs `precoMedioAnterior` (12-24 meses atrás)

**Nova lógica:**
- `precoMedio` = mantém como está (YTD ou fallback 12m) — usado para exibir no KPI "Preço Médio"
- Para a **variação anual**, buscar separadamente os **últimos 12 meses** e calcular a média ponderada desse período, comparando contra os 12 meses anteriores
- Isso garante comparação simétrica: 12m vs 12m, sempre

**Mudança concreta:**
1. Após buscar `currentTransactions` e `previousPeriodData`, criar uma query adicional para os últimos 12 meses (quando `currentTransactions` usar apenas o ano atual)
2. Calcular `precoMedioRolling12m` a partir desses dados
3. Usar `precoMedioRolling12m` (em vez de `precoMedio`) para o cálculo de `variacaoAnual`
4. Aplicar o mesmo tratamento para `variacaoAnualApt` e `variacaoAnualCasa`

**Otimização:** Quando o fallback de 12 meses já foi ativado (`usandoDadosHistoricos = true`), os dados já são rolling 12m e não precisam de query extra.

### `src/components/DashboardKPIs.tsx`
- Atualizar o subtitle do KPI "Variação Anual" para deixar claro que é "Últimos 12m vs 12m anteriores" (rolling)

## Resultado Esperado
A variação anual passará de **+21,47%** para **~+13,3%** — refletindo a valorização real sem distorção por amostra assimétrica.

## Detalhes Técnicos
- A query adicional para rolling 12m reutiliza os mesmos filtros (uso, bairro, outlier limit, percentual_transferido)
- Quando `usandoDadosHistoricos` já é true, `currentTransactions` já contém 12 meses — basta reutilizar
- Impacto apenas no cálculo da variação; preço médio YTD e liquidez permanecem inalterados

