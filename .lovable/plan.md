

# Adicionar Resumo Interpretativo ao Gráfico de Evolução por Microbairro

## Objetivo
Inserir abaixo do gráfico um bloco de texto dinâmico que interpreta os dados visíveis, adaptando-se à métrica selecionada (R$/m² ou Transações) e às linhas visíveis (não ocultas pelo usuário).

## Lógica por Métrica

### Métrica Valorização (R$/m²)
- Identifica o microbairro com maior preço atual e o com menor (entre os visíveis)
- Calcula o spread percentual entre eles
- Exemplo: *"Orla (R$ 18.200/m²) lidera com 42% acima de ABM (R$ 12.800/m²). Maior valorização no período: Jardim Oceânico (+35%)."*

### Métrica Liquidez (Transações)
- Identifica o microbairro com mais transações acumuladas e o com menos (entre os visíveis)
- Calcula variação do último período
- Exemplo: *"Orla lidera com 892 transações acumuladas. Eixo Américas teve o maior crescimento recente (+18% no último semestre)."*

## Mudança no Código

### `src/components/MicrobairroEvolutionChart.tsx`
1. Adicionar `useMemo` que analisa `data`, `microbairros`, `hiddenLines` e `metric`
2. Para valorização: compara último período dos microbairros visíveis, calcula spread e identifica maior valorização primeiro→último
3. Para liquidez: compara totais acumulados dos microbairros visíveis, identifica maior crescimento recente
4. Abaixo do `</ResponsiveContainer>`, renderizar `<p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">` com o texto gerado
5. Usar `formatCurrencyBR` para valores monetários e cores semânticas (verde/vermelho)

## Regras
- Máximo 2 frases
- Respeita as linhas ocultas pelo usuário (hiddenLines)
- Linguagem comercial direta

