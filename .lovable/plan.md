

# Plano: Atualizar Onboarding, Manual e Tour + Corrigir Demo

## Problemas Identificados

### 1. Pagina Demo - Erro 404 (intermitente)
A pagina `/demo` funcionou corretamente nos testes do browser. O 404 que apareceu no screenshot pode ter sido causado por um build anterior. No entanto, ha dois problemas reais que precisam de correcao:

- **ManualPlataforma.tsx** usa `useAuthContext()` (linha 537) que retorna `isAdmin: false` no demo, escondendo secoes administrativas
- **Onboarding.tsx** usa `useAuthContext()` (linha 653) que retorna `role: null` no demo, mostrando apenas modulos de corretor

### 2. Funcionalidades Faltando no Onboarding
O onboarding (`allOnboardingSteps`) nao inclui:
- **Relatorio PDF de Feedbacks Analiticos** na descricao do modulo "Agenda de Visitas" (id: 7)
- **Modo Demonstracao** como modulo proprio

### 3. Funcionalidades Faltando no GuidedTour
O tour interativo (`GuidedTour.tsx`) nao menciona:
- PDF de feedbacks analiticos no step de Agenda de Visitas

### 4. FAQs do Onboarding desatualizadas
A secao de FAQs (`faqCategories`) nao inclui perguntas sobre:
- Modo Demonstracao
- Exportacao PDF de Feedbacks

---

## Arquivos a Editar

### 1. `src/pages/Onboarding.tsx`

**a) Proteger contra auth nulo no demo:**
- Importar `useDemo` de `@/contexts/DemoContext`
- Quando `isDemo`, usar role `'admin'` como default para que o visitante veja TODOS os modulos

**b) Atualizar step "Agenda de Visitas" (id: 7, linha 379):**
- Adicionar feature: "Relatorio PDF de feedbacks analiticos"

**c) Adicionar novo step "Modo Demonstracao" (antes dos modulos de gestao):**
```text
id: 21 (ou proximo disponivel)
title: "Modo Demonstracao"
description: "Apresente a plataforma a clientes com dados ficticios..."
features: [
  "Pagina de apresentacao profissional",
  "Acesso sem login em /demo",
  "Dados ficticios realistas",
  "Todos os modulos disponiveis",
  "Ideal para reunioes comerciais"
]
route: "/apresentacao"
roles: ['admin']
category: 'admin'
```

**d) Adicionar FAQ sobre Demo e PDF de Feedbacks:**
- Na categoria "geral": "O que e o modo demonstracao?" e "Como exportar o relatorio de feedbacks?"

### 2. `src/pages/ManualPlataforma.tsx`

**a) Proteger contra auth nulo no demo:**
- Importar `useDemo` de `@/contexts/DemoContext`
- Quando `isDemo`, forcar `isAdmin = true` para exibir todas as secoes

### 3. `src/components/GuidedTour.tsx`

**a) Atualizar step de Agenda de Visitas (linha 84):**
- Expandir content para mencionar: "Exporte relatorios analiticos de feedbacks em PDF"

---

## Detalhes Tecnicos

### Protecao Auth no Demo (Onboarding)

```text
import { useDemo } from "@/contexts/DemoContext";
// ...
const { isDemo } = useDemo();
const { role: userRole } = useAuthContext();
const effectiveRole: UserRole = isDemo ? 'admin' : (userRole as UserRole) || 'corretor';
```

### Protecao Auth no Demo (ManualPlataforma)

```text
import { useDemo } from "@/contexts/DemoContext";
// ...
const { isDemo } = useDemo();
const { isAdmin: authIsAdmin } = useAuthContext();
const isAdmin = isDemo || authIsAdmin;
```

### Novo Step no Onboarding
Segue o padrao existente da interface `OnboardingStep` com icone `Eye` ou `Rocket` do lucide-react.

### Tour Update
Apenas atualizar o texto do step existente que referencia `[data-tour="nav-visitas"]`.

