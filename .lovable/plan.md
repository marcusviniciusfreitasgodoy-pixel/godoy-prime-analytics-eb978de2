

## Plano: Fluxo Automático Completo de Visitas

### Contexto
Hoje o fluxo requer ações manuais: criar ficha a partir do agendamento, disparar assinatura e feedback manualmente. O objetivo é automatizar todo o ciclo de vida.

### Alterações no Banco de Dados

**Migração SQL** -- Adicionar coluna `agendamento_id` na tabela `fichas_visita` para vincular ficha ao agendamento:

```sql
ALTER TABLE public.fichas_visita 
  ADD COLUMN agendamento_id uuid REFERENCES public.agendamentos_visita(id);
```

### Alterações no Código

**1. Criação automática da ficha ao agendar** (`src/hooks/useAgendamentos.ts`)

No `onSuccess` do `createAgendamento`, após as notificações existentes, inserir automaticamente um registro em `fichas_visita` com:
- Dados do agendamento (nome, telefone, email, endereço, código imóvel, corretor, data)
- `cpf_visitante: "A preencher"`, `nome_proprietario: "A preencher"` (campos obrigatórios com placeholder)
- `status: "agendada"`
- `agendamento_id` vinculado ao agendamento recém-criado
- Código gerado automaticamente (`VIS-...`)
- Invalidar query `fichas-visita`

**2. Disparo automático ao marcar "realizada"** (`src/hooks/useVisitas.ts`)

No `onSuccess` do `updateStatus`, quando o status muda para `"realizada"`, além do feedback que já é disparado, adicionar:
- Envio do link de assinatura do visitante via Email e WhatsApp (URL: `/visitas/assinatura/{codigo}/visitante`)
- Envio do link de assinatura do corretor via Email (URL: `/visitas/assinatura/{codigo}/corretor`)
- Manter os disparos de feedback já existentes

**3. Cancelamento automático da ficha vinculada** (`src/hooks/useAgendamentos.ts`)

No `onSuccess` do `updateStatus` do agendamento, quando `novoStatus === 'cancelada'`:
- Buscar ficha vinculada pelo `agendamento_id`
- Atualizar status da ficha para `"cancelada"`
- Invalidar query `fichas-visita`

Mesma lógica no `handleCancelAgendamento` do `VisitCard.tsx`.

**4. Remover botão manual "Criar Ficha"** (`src/components/visitas/VisitCard.tsx`, `src/pages/Visitas.tsx`)

- Remover o botão `<FilePlus>` do card de agendamento (a ficha já é criada automaticamente)
- Remover a função `handleCreateFichaFromAgendamento` da página Visitas
- Adicionar botão "Ver Ficha" no card de agendamento que navega para a ficha vinculada

**5. Possibilitar edição de dados faltantes na ficha** (`src/pages/FichaVisitaPage.tsx`)

A página de detalhes da ficha já possui modo de edição. Melhorias:
- Destacar visualmente campos com valor "A preencher" (borda amarela/aviso)
- Adicionar banner informativo quando a ficha tem campos pendentes: "Preencha os dados faltantes antes da visita"
- Garantir que CPF, nome do proprietário e outros campos placeholder sejam editáveis no formulário existente

**6. Atualizar tipos** (`src/types/visitas.ts`)

- Adicionar `agendamento_id?: string | null` ao `FichaVisita` e `FichaVisitaInsert`

### Fluxo Resultante

```text
Agendamento criado
  ├── Notificações (email/whatsapp) [já existe]
  └── Ficha de visita criada automaticamente (status: agendada)
       └── Campos "A preencher" destacados para edição

Status → "realizada"
  ├── Link de assinatura visitante (email + whatsapp)
  ├── Link de assinatura corretor (email)
  └── Link de feedback (email + whatsapp) [já existe]

Status → "cancelada" (agendamento)
  └── Ficha vinculada cancelada automaticamente
```

### Arquivos Modificados
- `supabase/migrations/` -- nova migração (coluna `agendamento_id`)
- `src/types/visitas.ts` -- adicionar `agendamento_id`
- `src/hooks/useAgendamentos.ts` -- auto-criar ficha + auto-cancelar
- `src/hooks/useVisitas.ts` -- disparar assinatura ao marcar realizada
- `src/components/visitas/VisitCard.tsx` -- remover botão manual, adicionar "Ver Ficha"
- `src/pages/Visitas.tsx` -- remover `handleCreateFichaFromAgendamento`
- `src/pages/FichaVisitaPage.tsx` -- destacar campos pendentes
- `src/utils/visitEmailService.ts` -- adicionar função de envio de link de assinatura
- `src/utils/whatsappService.ts` -- adicionar função de envio de link de assinatura via WhatsApp

