

# Plano: Dashboard Analitico de Feedbacks + Melhorias no Fluxo de Agendamento

## Resumo

Transformar a aba "Feedbacks" de uma simples lista de cards em um dashboard analitico completo com graficos de satisfacao, distribuicao de interesse, tendencias mensais e word cloud dos pontos positivos/negativos. Tambem melhorar o fluxo de agendamento e garantir que a notificacao em tempo real funcione corretamente.

---

## 1. Dashboard Analitico de Feedbacks (novo componente)

Substituir o conteudo da aba "Feedbacks" por um dashboard com:

**KPIs do Feedback (4 cards no topo):**
- Avaliacao Media (estrelas)
- NPS / Taxa de Proposta (% que quer fazer proposta)
- Percepcao de Valor (% "justo")
- Total de Feedbacks recebidos

**Graficos:**

| Grafico | Tipo | Dados |
|---|---|---|
| Distribuicao de Avaliacoes (1-5) | BarChart horizontal | Contagem por nota |
| Nivel de Interesse | PieChart/Donut | baixo/medio/alto/muito_alto |
| Percepcao de Valor | PieChart/Donut | abaixo/justo/acima |
| Evolucao da Satisfacao Mensal | LineChart | Media de avaliacao_geral por mes (ultimos 6 meses) |
| Efeitos UAU mais citados | BarChart horizontal | Contagem por categoria de efeito_uau |
| Conexao Emocional vs Interesse | ScatterChart ou comparativo | conexao_imovel vs nivel_interesse |

**Lista de feedbacks recentes** abaixo dos graficos (manter o componente `FeedbacksList` existente, mas compactado com paginacao).

### Arquivos envolvidos:
- **NOVO**: `src/components/visitas/FeedbackAnalyticsDashboard.tsx` - Dashboard principal com KPIs + graficos
- **NOVO**: `src/hooks/useFeedbackAnalytics.ts` - Hook que busca todos os feedbacks e calcula metricas agregadas
- **Editar**: `src/pages/Visitas.tsx` - Substituir `<FeedbacksList />` pelo novo dashboard na aba "Feedbacks"

---

## 2. Melhorias no Fluxo de Agendamento

**2a. Filtros e ordenacao nos agendamentos:**
- Adicionar filtro por status (agendada/confirmada/realizada/cancelada) na aba "Agendamentos"
- Adicionar ordenacao por data (mais recente/mais antigo)

**2b. Indicador visual de tempo restante:**
- No `VisitCard` de agendamento, mostrar badge "Hoje", "Amanha" ou "Em X dias" para visitas proximas
- Highlight visual para visitas nas proximas 24h

**2c. Contador de badges nas tabs:**
- Mostrar contadores nas abas (ex: "Feedbacks (5)") tambem em desktop, nao apenas mobile

### Arquivos envolvidos:
- **Editar**: `src/pages/Visitas.tsx` - Adicionar filtros na aba agendamentos + contadores nas tabs
- **Editar**: `src/components/visitas/VisitCard.tsx` - Badge de proximidade temporal

---

## 3. Notificacao em Tempo Real (ja implementada - ajustes)

O `FeedbackRealtimeListener` ja esta montado no `ProtectedRoute` e funciona. Melhorias:

- Invalidar query cache de `feedbacks-list` e `visitas-stats` quando novo feedback chegar (para atualizar graficos automaticamente)
- Adicionar som de notificacao (opcional) ao receber feedback

### Arquivos envolvidos:
- **Editar**: `src/components/visitas/FeedbackRealtimeListener.tsx` - Adicionar invalidacao de queries

---

## Secao Tecnica - Detalhamento

### `useFeedbackAnalytics.ts` (novo hook)

Busca todos os feedbacks com join na ficha e calcula:

```text
- distributionByRating: { nota: 1|2|3|4|5, count: number }[]
- interestDistribution: { nivel: string, count: number }[]
- valuePerception: { percepcao: string, count: number }[]
- monthlyTrend: { mes: string, mediaAvaliacao: number, totalFeedbacks: number }[]
- topEfeitosUau: { efeito: string, count: number }[]
- proposalRate: number (%)
- avgRating: number
- avgConexao: number
```

### `FeedbackAnalyticsDashboard.tsx` (novo componente)

Layout em grid responsivo:
- 4 KPI cards no topo (grid-cols-2 md:grid-cols-4)
- 2 graficos lado a lado (PieChart interesse + PieChart valor)
- 1 grafico largo (LineChart evolucao satisfacao)
- 1 grafico largo (BarChart efeitos UAU)
- Lista compacta dos ultimos 10 feedbacks

Usa Recharts (ja instalado) com `StandardChartTooltip` para consistencia visual.

### `FeedbackRealtimeListener.tsx` (ajuste)

Adicionar `queryClient.invalidateQueries` para as keys:
- `feedbacks-list`
- `visitas-stats`
- `feedback-analytics`

Isso faz os graficos atualizarem em tempo real quando novo feedback chega.

### `Visitas.tsx` (ajustes)

- Aba "Feedbacks": renderizar `<FeedbackAnalyticsDashboard />` no lugar de `<FeedbacksList />`
- Aba "Agendamentos": adicionar `<Select>` para filtrar por status + botao de ordenacao
- Todas as tabs: mostrar contadores em desktop tambem

### `VisitCard.tsx` (ajuste)

- Calcular diferenca em dias entre agora e `data_hora`
- Exibir badge: "Hoje" (vermelho), "Amanha" (amarelo), "Em X dias" (cinza)

