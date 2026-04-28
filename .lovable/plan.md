## Enforcement de limite de usuários por organização (plano)

Hoje o sistema já tem a infraestrutura parcial: a tabela `organizations` tem `max_users`, existe a função `check_org_limits`, e a tela de Usuários (`src/pages/Usuarios.tsx`) já consulta `limits.users.allowed` antes de enviar convite. **Mas três falhas permitem burlar o limite:**

1. A contagem usada por `check_org_limits` ignora **convites pendentes** — um admin pode disparar 50 convites e todos serão aceitos.
2. **Não há trigger no banco** bloqueando inserts em `organization_invites` ou em `profiles` (qualquer chamada direta à API contorna o frontend).
3. `max_users` não está sincronizado com o plano contratado (a org existente está com 999 manualmente).

### O que será feito

#### 1. Migração SQL — função e trigger de enforcement

- **Atualizar `check_org_limits`**: para `_resource_type = 'users'`, somar `COUNT(profiles WHERE organization_id = _org_id)` + `COUNT(organization_invites WHERE organization_id = _org_id AND accepted_at IS NULL AND expires_at > now())`. Isso reflete o uso real (já contratado + reservado).
- **Nova função `enforce_org_user_limit()`** (trigger function, `SECURITY DEFINER`, `SET search_path = public`):
  - Em `BEFORE INSERT` em `organization_invites`: lê `max_users`, conta profiles + convites pendentes da org, e se `>= max_users`, faz `RAISE EXCEPTION 'Limite de usuários do plano atingido (X/Y). Faça upgrade para adicionar mais corretores.'`.
  - Em `BEFORE INSERT OR UPDATE OF organization_id` em `profiles`: idem (apenas conta profiles, ignora convites para não bloquear o aceite que consome o convite).
- **Triggers**:
  - `trg_enforce_user_limit_invite BEFORE INSERT ON organization_invites`.
  - `trg_enforce_user_limit_profile BEFORE INSERT OR UPDATE OF organization_id ON profiles`.
- **Função helper `get_plan_max_users(plan text)`** retorna: `starter → 3`, `pro → 10`, `enterprise → 999`.
- **Trigger `trg_set_max_users_on_plan_change BEFORE INSERT OR UPDATE OF plan ON organizations`**: define automaticamente `NEW.max_users = get_plan_max_users(NEW.plan)` quando o plano muda (mantém manualmente sobreponível por superadmin se necessário, mas garante consistência por padrão).

#### 2. Backfill de dados (insert tool, após aprovar a migração)

- Atualizar `organizations.max_users` para todas as orgs conforme `get_plan_max_users(plan)`.
- A org "Godoy Prime Realty" (enterprise) ficará com 999 — sem mudança prática.

#### 3. Frontend — `src/pages/Usuarios.tsx` e `src/contexts/OrganizationContext.tsx`

- **Contexto**: `OrganizationContext` continuará lendo `check_org_limits` (que agora já considera convites). Sem mudança de assinatura.
- **Tela Usuários**:
  - Exibir badge no topo: `Usuários: X de Y (plano Pro)` com cor de alerta quando `current >= max - 1`.
  - Desabilitar o botão "Convidar Usuário" quando `!limits.users.allowed`, com tooltip "Limite do plano atingido — faça upgrade".
  - Tratar mensagem de erro do trigger (`error.message` começando com "Limite de usuários") e mostrar toast amigável + CTA "Ver planos".
  - Mostrar contador de convites pendentes consumindo vagas: `2 ativos + 1 convite pendente = 3/3`.

#### 4. Documentação na UI

- Adicionar nota no diálogo de convite: "Convites pendentes contam como vaga ocupada até serem aceitos ou expirarem (7 dias)."

### Detalhes técnicos

- **Bypass admin**: `superadmin` não bypassa o limite por padrão (regra de negócio = cobrança por tier). Se quiser permitir override, a função pode checar `has_role(invited_by, 'superadmin')` — confirmar antes de implementar.
- **Aceite de convite**: quando `organization_invites.accepted_at` é setado e o `profile` é inserido, o profile insert ainda passa pelo trigger; mas como o convite ainda existe (apenas com `accepted_at` preenchido), a fórmula da função filtra `accepted_at IS NULL`, então não conta duas vezes.
- **Compatibilidade**: a função `check_org_limits` mantém a mesma assinatura — nenhum código frontend precisa ser alterado por causa dela.
- **Limites por plano** (centralizados no banco):
  - `starter` → 3 usuários
  - `pro` → 10 usuários
  - `enterprise` → 999 usuários (efetivamente ilimitado)

### Arquivos afetados

- **Nova migração**: `supabase/migrations/<timestamp>_enforce_org_user_limit.sql`
- **Insert (após migração)**: `UPDATE organizations SET max_users = get_plan_max_users(plan)`
- **Editado**: `src/pages/Usuarios.tsx` (badge, disable, mensagens)

### Pergunta antes de implementar

Quer que `superadmin` (você) possa **ultrapassar** o limite manualmente (ex.: cliente VIP), ou o limite vale para todos sem exceção?