

## Automacoes de Pipeline: Tarefa Automatica de Follow-up

### Resumo
Quando um lead entra no estagio "qualificado" (seja por drag-and-drop no board ou pelo select no modal de detalhes), o sistema cria automaticamente uma tarefa de follow-up com prioridade "alta" e vencimento em 24 horas.

### Secao Tecnica

**Arquivo 1 (novo): `src/utils/pipelineAutomations.ts`**
- Funcao `runStageAutomations(leadId, newStage, userId, userName, organizationId)` que centraliza a logica de automacao
- Quando `newStage === 'qualificado'`: insere tarefa na tabela `tarefas` com titulo "Follow-up: Contatar lead qualificado", prioridade "alta", vencimento = now + 24h
- Registra atividade automatica em `atividades_lead` do tipo "nota" indicando que a tarefa foi criada automaticamente
- Extensivel: estrutura de switch/case para adicionar automacoes futuras em outros estagios (ex: `visita_agendada`, `proposta_enviada`)
- Executa de forma "fire-and-forget" (nao bloqueia o fluxo principal)

**Arquivo 2 (editar): `src/components/crm/PipelineKanban.tsx`**
- Dentro do `mutationFn` do `updateStageMutation` (linha 53-67), apos o insert de atividade, chamar `runStageAutomations()`
- Passar `user?.id`, `userName`, e o `organization_id` do lead

**Arquivo 3 (editar): `src/components/crm/LeadDetailModal.tsx`**
- Dentro do `mutationFn` do `updateStageMutation` (linha 149-162), apos o insert de atividade, chamar `runStageAutomations()`
- Mesma logica

### Automacoes incluidas (v1)

| Estagio destino | Acao automatica |
|---|---|
| `qualificado` | Criar tarefa "Follow-up: Contatar lead qualificado" (prioridade alta, vence em 24h) |
| `visita_agendada` | Criar tarefa "Preparar material para visita" (prioridade media, vence em 48h) |
| `proposta_enviada` | Criar tarefa "Acompanhar resposta da proposta" (prioridade alta, vence em 72h) |

### Fluxo

```text
Lead movido para novo estagio (drag ou select)
  |
  v
UPDATE leads + INSERT atividade (fluxo existente)
  |
  v
runStageAutomations() [fire & forget]
  |
  +---> Se 'qualificado': INSERT tarefa follow-up 24h
  +---> Se 'visita_agendada': INSERT tarefa preparacao 48h
  +---> Se 'proposta_enviada': INSERT tarefa acompanhar 72h
  +---> Registra atividade automatica na timeline
```
