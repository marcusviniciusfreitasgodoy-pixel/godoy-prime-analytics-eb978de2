

## Modulo CRM Pipeline Kanban

### Resumo
Adicionar um board Kanban de pipeline de leads ao projeto, permitindo arrastar leads entre estagios (Novo, Contatado, Qualificado, Visita Agendada, Proposta Enviada, Negociacao, Ganho, Perdido). Inclui modal de detalhes com abas de atividades, tarefas e notas por lead.

### Adaptacoes necessarias ao projeto atual
A documentacao original foi feita para um projeto com `construtoras` e `imobiliarias` separadas. Este projeto usa `organizations` com `get_user_org_id()` e roles (`admin`, `corretor`, `gerente`). Todas as tabelas e RLS serao adaptadas para esse modelo.

A tabela `leads` ja existe no projeto com campos diferentes (sem `estagio_pipeline`, `score_qualificacao`, `tags`, `responsavel_id`, etc). Sera necessario adicionar essas colunas via migracao.

### Secao Tecnica

**Migracao SQL - Alterar tabela leads + criar 3 tabelas novas:**

1. **ALTER TABLE leads** - Adicionar colunas:
   - `estagio_pipeline VARCHAR DEFAULT 'novo'`
   - `score_qualificacao INTEGER DEFAULT 0`
   - `tags JSONB DEFAULT '[]'`
   - `responsavel_id UUID`
   - `responsavel_nome VARCHAR`
   - `ultimo_contato TIMESTAMPTZ`
   - `prazo_compra VARCHAR`

2. **CREATE TABLE atividades_lead** - Timeline de acoes por lead
   - `id`, `lead_id` (FK leads), `tipo`, `titulo`, `descricao`, `metadata`, `usuario_id`, `usuario_nome`, `created_at`
   - RLS: org members podem ver/criar atividades de leads da sua org

3. **CREATE TABLE tarefas** - To-dos por lead
   - `id`, `lead_id` (FK leads nullable), `organization_id` (FK organizations), `titulo`, `descricao`, `responsavel_id`, `responsavel_nome`, `data_vencimento`, `data_conclusao`, `prioridade`, `status`, `created_at`, `updated_at`
   - RLS: org members podem gerenciar tarefas da sua org

4. **CREATE TABLE notas_lead** - Anotacoes por lead
   - `id`, `lead_id` (FK leads), `conteudo`, `autor_id`, `autor_nome`, `privada`, `created_at`, `updated_at`
   - RLS: org members podem ver/criar notas (privadas so visíveis pelo autor)

**Arquivos novos a criar:**

| Arquivo | Descricao |
|---|---|
| `src/types/crm.ts` | Tipos, constantes de colunas, helpers de formatacao |
| `src/components/crm/PipelineKanban.tsx` | Board principal com DnD, filtros, KPIs |
| `src/components/crm/PipelineColumn.tsx` | Coluna droppable do Kanban |
| `src/components/crm/LeadCard.tsx` | Card draggable de cada lead |
| `src/components/crm/LeadDetailModal.tsx` | Modal com tabs (Info, Atividades, Tarefas, Notas) |
| `src/pages/PipelineCRM.tsx` | Pagina wrapper acessivel via sidebar |

**Arquivos a editar:**

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Adicionar rota `/pipeline` dentro das rotas protegidas (requireAdminOrGerente) |
| `src/components/AppSidebar.tsx` | Adicionar item "Pipeline CRM" no menu de gerente com icone `Kanban` |

**Dependencias npm a instalar:**
- `@dnd-kit/core` - Drag and drop core
- `@dnd-kit/sortable` - Sortable containers
- `@dnd-kit/utilities` - CSS transform helpers

**Fluxo de dados:**
- O PipelineKanban consulta `leads` com `organization_id = get_user_org_id(auth.uid())`
- Drag-and-drop atualiza `estagio_pipeline` e registra atividade automatica em `atividades_lead`
- O modal de detalhe carrega atividades, tarefas e notas por `lead_id`
- Acoes rapidas (WhatsApp, email, telefone) abrem links externos
- KPIs calculados em tempo real: total, taxa de conversao, valor em negociacao

**RLS simplificada para este projeto:**
- Todas as novas tabelas usam `organization_id = get_user_org_id(auth.uid())` para SELECT/INSERT
- Atividades e notas verificam via JOIN com leads que o lead pertence a org do usuario
- Tarefas tem `organization_id` direto
- Admins e gerentes podem ver/gerenciar; corretores veem apenas seus proprios leads (via `responsavel_id`)

