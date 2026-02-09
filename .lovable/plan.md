

# Plano de Migracao para Arquitetura Multi-Tenant Escalavel

## Objetivo
Transformar a aplicacao single-tenant (1 empresa, N usuarios) em uma plataforma multi-tenant (N empresas, cada uma com N usuarios), permitindo escalar a venda do produto como SaaS.

---

## Diagnostico Atual

A aplicacao hoje opera como **single-tenant**:
- Todos os usuarios compartilham as mesmas configuracoes da empresa (`company_settings`)
- Calibradores de avaliacao e vistoria sao globais
- Dados ITBI sao compartilhados (correto -- dados publicos)
- Nao existe conceito de "organizacao" ou "tenant"
- O cadastro e aberto, qualquer pessoa pode criar conta

---

## Fase 1: Fundacao Multi-Tenant (Banco de Dados)

**Objetivo:** Criar a estrutura de organizacoes e vincular dados a cada tenant.

### 1.1 Criar tabela `organizations`
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,        -- URL amigavel (ex: "godoy-prime")
  cnpj TEXT,
  phone TEXT,
  address TEXT,
  creci TEXT,
  website TEXT,
  person_type TEXT DEFAULT 'pj',
  logo_url TEXT,
  plan TEXT DEFAULT 'starter',      -- starter, professional, enterprise
  plan_status TEXT DEFAULT 'active', -- active, trial, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,
  max_users INTEGER DEFAULT 5,
  max_valuations_month INTEGER DEFAULT 50,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Vincular `profiles` a organizacoes
```sql
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
```

### 1.3 Adicionar `organization_id` nas tabelas operacionais
Tabelas que precisam de isolamento por tenant:
- `valuations`
- `valuation_responses` (via join com valuations)
- `vistorias`
- `pricing_strategies`
- `fichas_visita`
- `agendamentos_visita`
- `feedbacks_visita` (via join com fichas_visita)
- `disponibilidade_corretor`
- `leads`
- `user_activity_logs`
- `notification_settings`

Tabelas que permanecem globais (dados publicos/compartilhados):
- `itbi_transactions` (dados publicos ITBI)
- `condominios_mapeamento`
- `logradouros_geo` / `logradouros_normalizacao`
- `microbairros_geo`
- `bairros_cache`
- `rate_limit_log`

Tabelas que precisam ser clonadas por organizacao:
- `valuation_characteristics` -- cada org pode calibrar seus pesos
- `valuation_documentation_factors`
- `vistoria_checklist_categories` / `vistoria_checklist_items`
- `sofia_knowledge_base`
- `company_settings` -- migrar de key-value para colunas na `organizations`

### 1.4 Criar funcao helper para isolamento
```sql
CREATE OR REPLACE FUNCTION get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = _user_id
$$;
```

### 1.5 Atualizar todas as politicas RLS
Exemplo para `valuations`:
```sql
-- Antes: user_id = auth.uid()
-- Depois: organization_id = get_user_org_id(auth.uid())

CREATE POLICY "Usuarios podem ver avaliacoes da sua organizacao"
ON valuations FOR SELECT
USING (organization_id = get_user_org_id(auth.uid()));
```

---

## Fase 2: Sistema de Convites e Onboarding

**Objetivo:** Permitir que o admin de cada organizacao gerencie seus proprios usuarios.

### 2.1 Criar tabela `organization_invites`
```sql
CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  email TEXT NOT NULL,
  role app_role DEFAULT 'corretor',
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Fluxo de cadastro
1. Admin cria organizacao no primeiro acesso
2. Admin convida corretores por email
3. Corretor recebe link, cria conta, e automaticamente vinculado a organizacao
4. Cadastro aberto desabilitado -- so entra via convite

### 2.3 Adaptar pagina `/auth`
- Manter login como esta
- Remover aba "Cadastrar" aberta
- Adicionar rota `/convite/:token` para aceitar convites

### 2.4 Adaptar pagina `/usuarios`
- Trocar gestao global de roles por gestao dentro da organizacao
- Adicionar funcao de convidar usuarios
- Mostrar convites pendentes

---

## Fase 3: Integracao Stripe para Billing

**Objetivo:** Monetizar com planos recorrentes.

### 3.1 Definir planos
| Plano | Usuarios | Avaliacoes/mes | Preco sugerido |
|-------|----------|----------------|----------------|
| Starter | 3 | 20 | R$ 197/mes |
| Professional | 10 | 100 | R$ 497/mes |
| Enterprise | Ilimitado | Ilimitado | R$ 997/mes |

### 3.2 Implementacao tecnica
- Habilitar integracao Stripe no Lovable
- Criar edge function `create-checkout-session`
- Criar edge function `stripe-webhook` para processar eventos
- Webhook atualiza `organizations.plan_status` e `organizations.plan`

### 3.3 Limites e enforcement
- Criar funcao DB `check_org_limits(org_id, resource_type)` que valida:
  - Numero de usuarios ativos vs `max_users`
  - Avaliacoes no mes corrente vs `max_valuations_month`
- Frontend mostra barra de uso e bloqueia criacao quando atingir limite

---

## Fase 4: Superadmin (voce, dono da plataforma)

**Objetivo:** Painel para gerenciar todas as organizacoes.

### 4.1 Criar role `superadmin`
```sql
ALTER TYPE app_role ADD VALUE 'superadmin';
```

### 4.2 Criar pagina `/admin` (superadmin only)
- Lista todas as organizacoes
- MRR (Monthly Recurring Revenue)
- Usuarios ativos por org
- Capacidade de impersonar organizacoes para suporte
- Gestao de dados globais (ITBI, condominios, microbairros)

---

## Fase 5: Adaptacoes no Frontend

### 5.1 Contexto de organizacao
Criar `OrganizationContext` que expoe:
- `organization` (dados da org atual)
- `plan` (plano ativo)
- `limits` (limites do plano)
- `usage` (uso atual)

### 5.2 Adaptar `useAuth`
- Incluir `organization_id` no estado
- Carregar dados da organizacao junto com o role

### 5.3 Adaptar `Configuracoes`
- Migrar dados de `company_settings` para campos da `organizations`
- Admin da org edita dados da sua propria organizacao

### 5.4 Adaptar calibradores
- `valuation_characteristics` filtrada por `organization_id`
- Seed inicial copiado dos valores padrao ao criar organizacao

### 5.5 Adaptar sidebar e header
- Mostrar nome/logo da organizacao
- Indicar plano ativo (badge)

---

## Fase 6: Migracao de Dados Existentes

### 6.1 Script de migracao
1. Criar organizacao "Godoy Prime" como org padrao
2. Vincular todos os `profiles` existentes a essa org
3. Copiar `company_settings` para colunas da org
4. Duplicar calibradores globais para a org
5. Adicionar `organization_id` em todos os registros existentes

### 6.2 Validacao
- Verificar que todos os dados existentes continuam acessiveis
- Testar RLS com usuario da org Godoy Prime
- Testar que nova org nao ve dados da Godoy Prime

---

## Ordem de Execucao Recomendada

```text
Fase 1 (Banco)     ████████████░░░░░░░░  Semana 1-2
Fase 6 (Migracao)  ░░░░████████░░░░░░░░  Semana 2
Fase 5 (Frontend)  ░░░░░░████████░░░░░░  Semana 2-3
Fase 2 (Convites)  ░░░░░░░░░░████████░░  Semana 3-4
Fase 3 (Stripe)    ░░░░░░░░░░░░░░██████  Semana 4-5
Fase 4 (Superadm)  ░░░░░░░░░░░░░░░░████  Semana 5
```

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| Quebrar acesso dos usuarios atuais | Fase 6 garante migracao transparente |
| RLS incorreto expondo dados entre orgs | Testes automatizados com 2 orgs fictcias |
| Performance com muitas orgs | Indices em `organization_id` em todas as tabelas |
| Limites do Lovable Cloud | Monitorar uso; considerar migracao para Supabase Pro se necessario |

---

## Secao Tecnica: Resumo de Alteracoes

**Novas tabelas:** `organizations`, `organization_invites`
**Tabelas alteradas:** `profiles` + todas as 11 tabelas operacionais (add `organization_id`)
**Novas funcoes DB:** `get_user_org_id()`, `check_org_limits()`
**RLS reescritas:** ~30 politicas
**Novos componentes:** `OrganizationContext`, pagina de convites, painel superadmin, checkout Stripe
**Edge functions novas:** `create-checkout-session`, `stripe-webhook`, `send-invite-email`
**Componentes adaptados:** `useAuth`, `AuthContext`, `ProtectedRoute`, `Configuracoes`, `AppSidebar`, `Header`, calibradores

