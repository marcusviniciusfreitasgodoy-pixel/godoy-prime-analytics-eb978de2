

## Plano: Corrigir visibilidade das propostas de compra

### Problema identificado
As propostas existem no banco de dados mas com `organization_id = NULL`. A política de RLS exige `organization_id = get_user_org_id(auth.uid())` para visualizar, então propostas sem `organization_id` ficam invisíveis.

A causa raiz está na Edge Function `public-submit` — ela aceita `organization_id` do payload do cliente (que pode não enviá-lo), em vez de resolver automaticamente a partir da `ficha_visita_id`.

### Alterações

#### 1. `supabase/functions/public-submit/index.ts` — handleProposta
- Quando `ficha_visita_id` estiver presente, buscar o `organization_id` da tabela `fichas_visita` no servidor (service role)
- Ignorar qualquer `organization_id` enviado pelo cliente (segurança)
- Isso garante que toda proposta vinculada a uma ficha herda a organização correta

#### 2. Migration SQL — Corrigir propostas existentes
- Atualizar as 3 propostas existentes com `organization_id = NULL`, preenchendo a partir de `fichas_visita.organization_id` via `ficha_visita_id`

```sql
UPDATE propostas_compra p
SET organization_id = fv.organization_id
FROM fichas_visita fv
WHERE p.ficha_visita_id = fv.id
  AND p.organization_id IS NULL;
```

### Resultado esperado
- Propostas existentes ficarão visíveis imediatamente
- Novas propostas receberão `organization_id` automaticamente no servidor

