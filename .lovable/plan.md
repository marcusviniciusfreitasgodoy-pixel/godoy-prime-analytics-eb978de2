

# Remover KPIs Territoriais do Dashboard

## Objetivo
Excluir os cards "Condomínios Mapeados" e "Com Histórico de Preços" do Dashboard, pois já estão disponíveis no módulo Mercado & Território.

## Mudança

### `src/components/DashboardKPIs.tsx`
- Remover o import de `useTerritorialKPIs` e os ícones `Building2`, `BarChart3`
- Remover a chamada ao hook `useTerritorialKPIs()`
- Remover o bloco condicional `{territorialKpis && (<>...</>)}` que renderiza os dois cards
- Ajustar o grid de `xl:grid-cols-6` para `xl:grid-cols-4` (voltando a 4 KPIs principais)

### Resultado
Dashboard exibirá apenas os 4 KPIs core: Preço Médio, Liquidez, Variação Anual e Região Mais Valorizada.

