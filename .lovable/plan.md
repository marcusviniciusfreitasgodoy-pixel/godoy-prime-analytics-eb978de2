

## Dashboard de Metricas do Pipeline CRM

### Resumo
Criar um dashboard analitico com graficos de funil de conversao e tempo medio por estagio, acessivel por uma aba na pagina do Pipeline CRM. O dashboard usara os dados existentes das tabelas `leads` e `atividades_lead` para calcular metricas de conversao e permanencia.

### O que muda para o usuario
- A pagina Pipeline CRM ganha **duas abas**: "Kanban" (board atual) e "Metricas" (novo dashboard)
- Na aba Metricas:
  - **Funil de Conversao**: grafico de barras horizontais mostrando quantos leads passaram por cada estagio (Novo -> Contatado -> ... -> Ganho), com percentual de conversao entre cada etapa
  - **Tempo Medio por Estagio**: grafico de barras verticais mostrando quantos dias em media os leads ficam em cada estagio antes de avancar
  - **KPIs resumidos**: Taxa de conversao geral, Tempo medio total do ciclo (lead novo ate ganho), Leads ativos, Valor total em negociacao
  - **Taxa de Perda por Estagio**: grafico mostrando em qual estagio os leads sao mais perdidos

### Secao Tecnica

**Arquivo 1 (novo): `src/hooks/usePipelineMetrics.ts`**
- Hook que consome os dados de `leads` e `atividades_lead` (tipo `status_alterado`)
- Calcula:
  - **Funil**: conta leads que atingiram cada estagio (usando historico de atividades)
  - **Tempo medio por estagio**: para cada lead, calcula diferenca entre timestamps de atividades consecutivas de `status_alterado`, depois agrega por estagio
  - **Ciclo total**: tempo medio de `created_at` do lead ate atingir `ganho`
  - **Taxa de perda**: agrupa leads perdidos pelo ultimo estagio antes de ir para `perdido`
- Usa `useQuery` com queryKey `['pipeline-metrics']`

**Arquivo 2 (novo): `src/components/crm/PipelineMetricsDashboard.tsx`**
- Componente com layout em grid:
  - Linha 1: 4 KPI cards (Taxa Conversao, Ciclo Medio, Leads Ativos, Valor Pipeline)
  - Linha 2: Grafico de Funil (Recharts `BarChart` horizontal) + Tempo Medio por Estagio (Recharts `BarChart` vertical)
  - Linha 3: Taxa de Perda por Estagio (Recharts `BarChart`)
- Usa `StandardChartTooltip` e cores do `CHART_COLORS` para manter padrao visual
- Responsive: graficos empilham verticalmente em mobile

**Arquivo 3 (editar): `src/pages/PipelineCRM.tsx`**
- Adicionar `Tabs` (Radix) com duas abas: "Kanban" e "Metricas"
- Tab "Kanban" renderiza `<PipelineKanban />`
- Tab "Metricas" renderiza `<PipelineMetricsDashboard />`

### Calculo do Funil

```text
Para cada estagio na ordem [novo, contatado, qualificado, visita_agendada, proposta_enviada, negociacao, ganho]:
  - Contar leads cujo estagio atual == estagio OU que ja passaram por ele (via atividades_lead tipo status_alterado)
  - % conversao = (leads no estagio N+1 / leads no estagio N) * 100
```

### Calculo de Tempo Medio

```text
Para cada lead com historico de mudancas:
  - Ordenar atividades tipo 'status_alterado' por created_at
  - Calcular diff entre cada transicao consecutiva
  - Agrupar por "estagio de origem" e calcular media em dias
```

### Estrutura Visual

```text
+------------------------------------------------------------+
|  [Kanban]  [Metricas]                                       |
+------------------------------------------------------------+
| KPI: Conversao | KPI: Ciclo | KPI: Ativos | KPI: Valor    |
+------------------------------------------------------------+
| Funil de Conversao          | Tempo Medio por Estagio      |
| (barras horizontais)        | (barras verticais)           |
+------------------------------------------------------------+
| Taxa de Perda por Estagio                                  |
| (barras horizontais)                                        |
+------------------------------------------------------------+
```

