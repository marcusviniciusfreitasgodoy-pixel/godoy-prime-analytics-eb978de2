
# Plano: Melhorias no Fluxo de Agendamento de Visitas

## Problemas Identificados

1. **Corretor responsavel sem cadastro de contato**: O campo `corretor_id` existe nas tabelas `agendamentos_visita` e `fichas_visita`, mas nao ha um seletor de corretor no formulario de agendamento. O nome do corretor e preenchido manualmente como texto livre (ou extraido do email do usuario logado). A tabela `profiles` tem apenas `full_name` e `phone` -- falta email e CRECI do corretor.
2. **Cliente nao aparece no fluxo**: O visitante/cliente que criou o agendamento nao recebe notificacoes de acompanhamento alem da confirmacao inicial. Nao ha visibilidade do status para ele.
3. **Feedback nao e disparado automaticamente**: A solicitacao de feedback e manual (botao na FichaVisitaPage). Deveria ser automatica ao marcar como "realizada".
4. **Sem notificacao em tempo real para feedback recebido**: Nao ha Realtime subscription para alertar corretores quando um feedback chega.
5. **Notificacoes incompletas**: Nem todos os envolvidos (visitante, corretor, agencia) recebem email + WhatsApp em todos os eventos.

---

## Mudancas Planejadas

### 1. Enriquecer perfil do Corretor (dados de contato)

**Migracao SQL:**
- Adicionar colunas `email`, `creci` e `avatar_url` na tabela `profiles`
- Isso permite que cada corretor tenha seus dados de contato registrados

**UI (Configuracoes):**
- Adicionar secao "Meu Perfil de Corretor" na pagina de Configuracoes com campos: Nome, Telefone, Email, CRECI

### 2. Seletor de Corretor no formulario de agendamento

**ScheduleForm.tsx:**
- Adicionar campo `Select` com lista de corretores (buscando de `profiles` + `user_roles`)
- Ao selecionar, preencher `corretor_id` e associar automaticamente o nome e contato
- Isso substitui o preenchimento manual de `nome_corretor`

### 3. Disparo automatico de feedback ao marcar "realizada"

**useVisitas.ts (updateStatus):**
- Quando `status` mudar para `realizada`, disparar automaticamente:
  - Email de solicitacao de feedback (via `sendFeedbackRequestEmail`)
  - WhatsApp para o visitante com link de feedback
- Remover necessidade de clique manual no botao "Enviar Link por Email"

### 4. Notificacao em tempo real quando feedback e recebido

**Migracao SQL:**
- Habilitar Realtime na tabela `feedbacks_visita`: `ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks_visita`

**Novo componente `FeedbackRealtimeListener.tsx`:**
- Subscribir a `postgres_changes` na tabela `feedbacks_visita` (evento `INSERT`)
- Ao receber novo feedback, exibir toast com link para visualizar
- Buscar dados da ficha associada para contexto (endereco, visitante)

**Integracao no layout:**
- Montar o listener no layout principal (dentro do `ProtectedRoute` ou `AppSidebar`)
- Apenas usuarios autenticados (corretores/gerentes/admins) recebem a notificacao

### 5. Notificacoes completas para todos os envolvidos

**Atualizar `useAgendamentos.ts` e `useVisitas.ts`:**

Para cada evento, garantir que TODOS recebam por email E WhatsApp:

| Evento | Visitante (Email) | Visitante (WhatsApp) | Corretor (Email) | Agencia (Email) |
|---|---|---|---|---|
| Agendamento criado | Sim (ja existe) | Sim (ja existe) | **NOVO** | Sim (ja existe) |
| Agendamento cancelado | Sim (ja existe) | Sim (ja existe) | **NOVO** | Sim (ja existe) |
| Visita realizada | **NOVO** (feedback link) | **NOVO** (feedback link) | **NOVO** | **NOVO** |
| Feedback recebido | - | - | **NOVO** (email + realtime) | **NOVO** (email) |

**Implementacao:**
- Criar funcao `notifyCorretor` que busca email/telefone do corretor via `corretor_id` na tabela `profiles`
- Na edge function `send-visit-email`, adicionar template `feedback_recebido` para notificar corretor
- Ao submeter feedback (hook `useFeedbackVisita`), invocar edge function para notificar corretor e agencia

### 6. Incluir o cliente/visitante no fluxo

**VisitCard.tsx (agendamento):**
- Mostrar email do visitante quando disponivel
- Adicionar botao para reenviar confirmacao

---

## Secao Tecnica - Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Adicionar `email`, `creci` em `profiles`; habilitar Realtime em `feedbacks_visita` |
| `src/hooks/useVisitas.ts` | Auto-disparar feedback email+WhatsApp ao marcar "realizada" |
| `src/hooks/useAgendamentos.ts` | Notificar corretor por email ao criar/cancelar agendamento |
| `src/hooks/useFeedbackVisita.ts` | Apos inserir feedback, notificar corretor e agencia |
| `src/components/visitas/ScheduleForm.tsx` | Adicionar seletor de corretor com dados de `profiles` |
| `src/components/visitas/FeedbackRealtimeListener.tsx` | **NOVO** - Realtime toast para feedback recebido |
| `src/pages/Configuracoes.tsx` | Adicionar secao "Perfil do Corretor" (email, CRECI) |
| `src/pages/FichaVisitaPage.tsx` | Exibir dados do corretor responsavel; ajustar botao feedback |
| `src/components/visitas/VisitCard.tsx` | Mostrar email do visitante e dados do corretor |
| `src/utils/visitEmailService.ts` | Adicionar funcao `sendFeedbackReceivedEmail` |
| `src/utils/whatsappService.ts` | Adicionar funcao `enviarSolicitacaoFeedback` |
| `supabase/functions/send-visit-email/index.ts` | Adicionar template `feedback_recebido` |
