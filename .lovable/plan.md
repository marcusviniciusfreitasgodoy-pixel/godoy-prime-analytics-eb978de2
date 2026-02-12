

## Notificacoes em Tempo Real no Pipeline CRM

### Resumo
Adicionar um listener Realtime na tabela `leads` para que, quando qualquer usuario mover um lead de estagio, todos os corretores/admins conectados recebam um toast de notificacao e o board atualize automaticamente -- sem precisar dar refresh.

### O que muda para o usuario
- Ao mover um lead (drag-and-drop ou select no modal), todos os outros usuarios logados veem um toast tipo: "Lead **Joao Silva** movido para **Qualificado** por Marcus"
- O board Kanban atualiza automaticamente para todos os usuarios conectados
- O proprio usuario que fez a acao nao recebe notificacao duplicada (ja ve o toast existente)

### Secao Tecnica

**Passo 1: Migracao SQL -- habilitar Realtime na tabela `leads`**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

**Passo 2 (novo): `src/components/crm/PipelineRealtimeListener.tsx`**
- Componente invisivel (retorna `null`), seguindo o padrao existente de `FeedbackRealtimeListener.tsx`
- Escuta `postgres_changes` com `event: 'UPDATE'` na tabela `leads`, filtrando mudancas no campo `estagio_pipeline`
- Quando detecta mudanca:
  - Busca a atividade mais recente do tipo `status_alterado` para esse lead (para obter o nome do usuario que moveu)
  - Exibe toast com nome do lead, novo estagio e autor da mudanca
  - Invalida a query `pipeline-leads` para atualizar o board
  - Suprime notificacao se o `usuario_id` da atividade === `auth.uid()` (evita duplicata)

**Passo 3 (editar): `src/components/crm/PipelineKanban.tsx`**
- Importar e renderizar `<PipelineRealtimeListener />` dentro do componente, acima do board

### Fluxo

```text
Usuario A move lead para "Qualificado"
  |
  v
UPDATE leads SET estagio_pipeline = 'qualificado' (ja existente)
  |
  v
Supabase Realtime dispara evento UPDATE para todos os subscribers
  |
  v
PipelineRealtimeListener recebe o evento
  |
  +---> Se usuario_id != meu id: exibe toast "Lead X movido para Y por Z"
  +---> Invalida query 'pipeline-leads' -> board atualiza
```
