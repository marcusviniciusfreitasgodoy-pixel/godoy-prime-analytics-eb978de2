

# Análise dos Módulos Onboarding, Manual e Tour Guiado

## Diagnóstico Completo

### 1. FUNCIONALIDADES AUSENTES NOS TRÊS MÓDULOS

| Funcionalidade existente na plataforma | Onboarding | Manual | Tour (GuidedTour/PageTour) |
|---|---|---|---|
| **Configurar Formulários** (/configurar-formularios) | ❌ Ausente | ❌ Ausente | ❌ Ausente |
| **Admin Panel / Superadmin** (/admin) | ❌ Ausente | ❌ Ausente | ❌ Ausente |
| **Resumos interpretativos** (recém-adicionados nos gráficos) | ❌ Não mencionado | ❌ Não mencionado | N/A |

### 2. INCONSISTÊNCIAS E ERROS ENCONTRADOS

**Onboarding:**
- Step "Mapa de Vendas" (id:9) aponta para "/" mas o mapa foi movido para Inteligência Territorial (conforme memory `dashboard-comprehensive-specification`)
- Step "CRM / Pipeline" (id:22) tem rota `/pipeline-crm` mas a rota real é `/pipeline`
- Step "Avaliação Pública" (id:11) aponta para `/avaliacao-publica` mas a rota pública é `/avaliacao`
- FAQ "mapa de vendas" no Dashboard ainda descreve como se estivesse lá, mas foi removido

**Manual:**
- Seção Dashboard ainda menciona "Mapa de Vendas" e "Exportação de Dados" como se o mapa estivesse no Dashboard
- Seção CRM tem rota `/pipeline-crm` incorreta (deveria ser `/pipeline`)
- Seção Propostas Digitais tem rota `/proposta-publica` — funcionalidade de propostas está vinculada à agenda de visitas
- Falta seção "Configurar Formulários"
- Falta menção aos resumos interpretativos nos gráficos de Evolução

**GuidedTour (Tour do Dashboard):**
- Ainda referencia `[data-tour="transaction-map"]` que não existe mais no Dashboard (mapa removido)
- Referencia `[data-tour="sync-itbi"]` que é admin-only e pode não existir

**PageTour:**
- Não tem configuração para Inteligência Territorial
- Não tem configuração para Pipeline CRM
- Não tem configuração para Configurar Formulários

### 3. DISPONIBILIDADE PARA TODOS OS USUÁRIOS

**Onboarding:** ✅ Disponível — rota `/onboarding` está dentro do ProtectedRoute sem restrição de role. Conteúdo é filtrado por role (corretor vê módulos operacionais, gerente vê gestão, admin vê tudo).

**Manual:** ✅ Disponível — rota `/manual` sem restrição. Seções admin só aparecem para admins (`isAdmin`).

**Tour Guiado:** ✅ Disponível — executado no Dashboard via `useFirstVisitTour`. Disponível para todos os roles.

**Sidebar:** ✅ "Onboarding" e "Manual / Tour" estão no grupo "Início" sem `requiresRole`, acessíveis a todos.

---

## Plano de Correção

### Arquivo 1: `src/pages/Onboarding.tsx`
1. **Remover** step "Mapa de Vendas" (id:9) — redundante com Inteligência Territorial
2. **Corrigir** rota do CRM de `/pipeline-crm` para `/pipeline`
3. **Corrigir** rota da Avaliação Pública de `/avaliacao-publica` para `/avaliacao`
4. **Adicionar** step "Configurar Formulários" nos módulos admin com rota `/configurar-formularios`
5. **Atualizar** FAQ do Dashboard removendo menção ao mapa de vendas
6. **Adicionar** FAQ sobre resumos interpretativos nos gráficos
7. **Atualizar** descrição do Dashboard removendo referência ao mapa

### Arquivo 2: `src/pages/ManualPlataforma.tsx`
1. **Remover** referência ao Mapa de Vendas da seção Dashboard
2. **Corrigir** rota CRM de `/pipeline-crm` para `/pipeline`
3. **Adicionar** seção "Configurar Formulários" nas adminSections
4. **Adicionar** menção aos resumos interpretativos nas seções de Dashboard e Evolução
5. **Corrigir** rota Propostas Digitais

### Arquivo 3: `src/components/GuidedTour.tsx`
1. **Remover** step do `transaction-map` (mapa removido do Dashboard)
2. **Remover** step do `sync-itbi` (não visível para todos)
3. **Atualizar** descrição do step de evolução mencionando os resumos interpretativos

### Arquivo 4: `src/components/PageTour.tsx`
1. **Adicionar** configuração de tour para `inteligencia-territorial`
2. **Adicionar** configuração de tour para `pipeline` (CRM)

### Arquivo 5: `src/hooks/useTourNavigation.ts`
1. **Adicionar** página Inteligência Territorial ao `TOUR_PAGES`

