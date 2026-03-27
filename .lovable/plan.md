

# Mover Mapa de Transações do Dashboard para Mercado & Território

## Objetivo
Simplificar o Dashboard removendo a seção "Mapa de Transações" e reposicionando-a na página "Pesquisas de Mercado" (que já faz parte do grupo "Mercado & Território" no menu lateral).

## O que muda

### 1. Dashboard (`src/pages/Dashboard.tsx`)
- **Remover** o bloco do Mapa de Transações (Card com `TransactionMap`, linhas 568-590)
- **Remover** imports não mais utilizados: `TransactionMap`, `useTransactionMapData`, `Map`
- **Remover** estado e lógica do mapa: `mapFilters`, `setMapFilters`, `mapData`, `isMapLoading`, `refetchMapData`, e o `useEffect` de refetch
- **Remover** invalidação de `transaction-map-data` no cache

### 2. Pesquisas de Mercado (`src/pages/PesquisasMercado.tsx`)
- **Adicionar** uma nova aba "Mapa" nas tabs existentes (ao lado de "Localização" e "Transações"), transformando o grid de 2 colunas em 3
- Dentro da aba "Mapa", renderizar o `TransactionMap` com filtros próprios de período, usando o mesmo padrão que estava no Dashboard (card com header explicativo + mapa em altura 400-500px)
- O mapa usará o `selectedBairro` do contexto já disponível na página

### Resultado
O Dashboard fica mais enxuto (KPIs + Gráficos de Evolução + Ranking + Assistente IA), e o Mapa de Transações ganha contexto junto às demais ferramentas de pesquisa de mercado.

