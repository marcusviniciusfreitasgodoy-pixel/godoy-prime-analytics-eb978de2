

# Adicionar tooltips explicativos nos KPI Cards da Inteligência Territorial

## Problema
Os 4 cards de KPIs (Condomínios, Com histórico, Unidades, R$/m² médio) não explicam o que significam. O usuário precisa entender a lógica por trás de cada métrica.

## Solução
Adicionar um ícone `Info` (ℹ️) em cada card que, ao passar o mouse (ou tocar no mobile), exibe um tooltip com a explicação da métrica.

## Explicações para cada card

| Card | Explicação |
|------|-----------|
| **Condomínios** | Total de condomínios ativos mapeados na base territorial (inclui identificados manualmente e por algoritmo) |
| **Com histórico** | Condomínios que possuem pelo menos 1 transação ITBI registrada, permitindo análise de preço real praticado |
| **Unidades** | Soma estimada de unidades residenciais nos condomínios mapeados (baseado em dados IPTU e levantamento de torres) |
| **R$/m² médio** | Preço médio por m² calculado a partir das transações ITBI residenciais na Barra da Tijuca |

## Implementação

**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`

- Adicionar campo `tooltip` ao array `kpiCards`
- Importar `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` de `@/components/ui/tooltip`
- Importar ícone `Info` do lucide-react
- Envolver cada card com `Tooltip` e adicionar ícone `Info` discreto (h-3 w-3, text-muted-foreground) ao lado do label
- No mobile, o tooltip funciona ao tocar no ícone

