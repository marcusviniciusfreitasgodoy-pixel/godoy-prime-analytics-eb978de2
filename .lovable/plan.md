
## Auditoria de Consistencia: Manual, Tour, Apresentacao e PDF

Apos analisar todos os arquivos, encontrei as seguintes inconsistencias:

---

### Discrepancias Encontradas

#### 1. FunctionalityMapSection.tsx (Pagina de Apresentacao)
- Ainda usa **"Vistoria Digital 3.1"** (deveria ser "Vistoria Digital")
- Ainda inclui **"Parecer Godoy Prime"** (removido do OnePager e PDF)
- Faltam as 5 funcionalidades novas adicionadas ao OnePager: **Pesquisa de Mercado**, **Agendamento de Visitas**, **Analise de Documentacao IA**, **Documentacao Comprador e Vendedor**, **Gestao de Leads e CRM**

#### 2. GuidedTour.tsx (Tour Principal do Dashboard)
- Nao menciona **CRM/Pipeline** (nav-crm ou equivalente)
- Nao menciona **Estrategia de Precificacao** (integrada na avaliacao, mas sem passo no tour)
- Nao menciona **Propostas Digitais**
- O tour diz "26 caracteristicas" na avaliacao, mas o Onboarding diz "35 caracteristicas" -- inconsistencia interna

#### 3. ManualPlataforma.tsx
- Falta secao sobre **CRM/Pipeline** (existe rota /pipeline-crm mas nao tem secao no manual)
- Falta secao sobre **Propostas Digitais** (existe rota /proposta-publica)
- Falta secao sobre **Avaliacao Publica** (existe rota /avaliacao-publica)
- A secao de Avaliacao diz "26 caracteristicas" mas o Onboarding diz "35"

#### 4. Onboarding.tsx
- Nao inclui modulo de **CRM/Pipeline** como step
- Nao inclui **Propostas Digitais** como step
- Diz "35 caracteristicas" na avaliacao vs "26" no manual e tour

#### 5. PageTour.tsx
- Nao tem tour para pagina de **CRM/Pipeline**
- Nao tem tour para pagina de **Propostas**

#### 6. manualPdfExport.ts (Manual PDF)
- Nao inclui modulo de **CRM/Pipeline**
- Nao inclui **Propostas Digitais**
- Nao inclui **Avaliacao Publica**
- Base de conhecimento da Sofia referencia "Barra da Tijuca" em vez de "Rio de Janeiro"

---

### Plano de Correcoes

#### Arquivo 1: `src/components/apresentacao/FunctionalityMapSection.tsx`
- Renomear "Vistoria Digital 3.1" para "Vistoria Digital"
- Remover "Parecer Godoy Prime"
- Adicionar 5 novos cards: Pesquisa de Mercado, Agendamento de Visitas, Analise de Documentacao IA, Documentacao Comprador/Vendedor, Gestao de Leads e CRM

#### Arquivo 2: `src/components/GuidedTour.tsx`
- Corrigir "26 caracteristicas" para "35 caracteristicas" no passo da avaliacao
- Adicionar passos para nav-crm e nav-propostas (se existirem data-tour targets no sidebar)

#### Arquivo 3: `src/pages/ManualPlataforma.tsx`
- Adicionar secao "CRM / Pipeline" com descricao do quadro kanban 8 estagios
- Adicionar secao "Propostas Digitais"
- Adicionar secao "Avaliacao Publica" (captacao de leads)
- Corrigir "26 caracteristicas" para "35 caracteristicas" na secao de Avaliacao

#### Arquivo 4: `src/pages/Onboarding.tsx`
- Adicionar step para CRM/Pipeline
- Adicionar step para Propostas Digitais

#### Arquivo 5: `src/components/PageTour.tsx`
- Adicionar config de tour para pagina de CRM/Pipeline (se data-tour targets existirem)

#### Arquivo 6: `src/utils/manualPdfExport.ts`
- Adicionar modulo CRM/Pipeline na lista de modulos
- Adicionar modulo Propostas Digitais
- Atualizar referencia "Barra da Tijuca" para "Rio de Janeiro" na descricao da Sofia

---

### Sobre o numero de caracteristicas (26 vs 35)
Preciso verificar o numero real no motor de avaliacao antes de padronizar. O tour e manual dizem 26, o onboarding diz 35. Sera verificado no codigo do Step3Questionnaire para definir o valor correto.

### Resumo de Arquivos Alterados
6 arquivos no total:
1. `src/components/apresentacao/FunctionalityMapSection.tsx`
2. `src/components/GuidedTour.tsx`
3. `src/pages/ManualPlataforma.tsx`
4. `src/pages/Onboarding.tsx`
5. `src/components/PageTour.tsx`
6. `src/utils/manualPdfExport.ts`
