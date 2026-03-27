

# Adicionar Resumo Interpretativo abaixo de cada aba do gráfico Evolução Histórica

## Objetivo
Inserir, na base de cada gráfico (Geral, Tipologia, Variação), um bloco de texto curto e dinâmico que interpreta automaticamente os dados visíveis, usando linguagem simples para corretores.

## Como funciona

Para cada aba, um `useMemo` analisa os dados do `chartData` e gera uma frase-resumo contextual:

### Aba Geral
- Calcula variação entre primeiro e último período
- Identifica o período com maior preço e o com menor
- Exemplo: *"O preço médio saiu de R$ 9.200/m² para R$ 12.100/m² — valorização de +31% no período. Pico em S1/26 (R$ 12.100/m²)."*

### Aba Tipologia
- Compara o preço atual de apartamento vs casa
- Calcula o spread percentual entre as tipologias
- Exemplo: *"Apartamentos (R$ 12.500/m²) estão 18% acima de Casas (R$ 10.600/m²). Ambas as tipologias em tendência de alta."*

### Aba Variação
- Conta quantos períodos tiveram variação positiva vs negativa
- Identifica o último período e sua direção
- Exemplo: *"7 de 10 períodos com valorização. Último semestre (S1/26): +8,8%. Mercado predominantemente em alta."*

## Mudança no Código

### `src/components/EvolutionChart.tsx`
1. Criar 3 funções `useMemo` que recebem `chartData` e `granularity` e retornam a string interpretativa
2. Abaixo de cada `</ResponsiveContainer>`, adicionar um `<p>` com estilo `text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2` contendo o texto gerado
3. Usar `formatCurrencyBR` para valores monetários e linguagem direta ("valorização", "queda", "estável")

## Regras de Texto
- Máximo 2 frases por aba
- Linguagem de impacto comercial (não técnica)
- Cores semânticas: verde para alta, vermelho para queda, cinza para estável (via classes do Tailwind)

