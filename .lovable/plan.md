

## Melhorar Responsividade dos KPIs no Dashboard (Mobile)

### Problema
Os cards de KPI estão em grid 2 colunas no celular (`grid-cols-2`), ficando apertados na tela de 390px.

### Solução
Alterar o grid para 1 coluna no mobile, mantendo 2+ colunas em telas maiores.

### Alteração

**`src/components/DashboardKPIs.tsx`** (linha 47):
- De: `grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`
- Para: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`

Também ajustar o skeleton loader (linha 27) com a mesma classe:
- De: `grid grid-cols-2 lg:grid-cols-4`
- Para: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

São apenas 2 linhas alteradas em 1 arquivo.

