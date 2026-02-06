

# Plano: Separar Onboarding/Manual/Tour do Demo

## Problema

Atualmente, o menu do Demo (`/demo`) inclui os links "Onboarding" e "Manual / Tour". Esses itens sao ferramentas de treinamento para **novos usuarios reais apos o cadastro**, e nao fazem sentido para visitantes externos do modo demonstracao.

O fluxo correto e:
- **Demo** (`/demo`): Visitante externo explora a plataforma com dados ficticios. Nao precisa de onboarding nem tour.
- **Primeiro acesso real** (`/onboarding`): Usuario autenticado recebe o onboarding, manual e tour no menu lateral para aprender a usar a plataforma.

## O Que Sera Feito

### 1. Remover Onboarding e Manual do DemoSidebar e DemoHeader

Remover os itens "Onboarding" e "Manual / Tour" das listas de navegacao em:
- `src/components/DemoSidebar.tsx` (linhas 18-19)
- `src/components/DemoHeader.tsx` (linhas 11-12)

### 2. Remover rota `/onboarding` do DemoLayout

Em `src/pages/DemoLayout.tsx`, remover:
- A rota `<Route path="/onboarding" ...>` (linha 49)
- O import de `Onboarding` (linha 21)
- Opcionalmente remover tambem a rota `/manual` se o manual tambem nao deve estar no demo (manter se quiser que visitantes vejam o manual)

### 3. Garantir que o menu principal (AppSidebar + Header) mantem os links

Os arquivos `AppSidebar.tsx` e `Header.tsx` ja possuem "Onboarding" e "Manual / Tour" nos `baseItems`/`navItems`. Eles continuam disponiveis para **todos os usuarios autenticados**, incluindo no primeiro acesso.

### 4. Manter o redirect automatico no primeiro login

O hook `useOnboardingRedirect.ts` ja redireciona novos usuarios para `/onboarding` no primeiro login. Nenhuma alteracao necessaria.

---

## Arquivos a Editar

| Arquivo | Acao |
|---|---|
| `src/components/DemoSidebar.tsx` | Remover "Onboarding" e "Manual / Tour" da lista `items` |
| `src/components/DemoHeader.tsx` | Remover "Onboarding" e "Manual / Tour" da lista `navItems` |
| `src/pages/DemoLayout.tsx` | Remover rota `/onboarding` e import de `Onboarding` |

## Arquivos que NAO mudam

| Arquivo | Motivo |
|---|---|
| `src/components/AppSidebar.tsx` | Ja tem os links para usuarios reais |
| `src/components/Header.tsx` | Ja tem os links para usuarios reais |
| `src/hooks/useOnboardingRedirect.ts` | Ja funciona corretamente no primeiro login |
| `src/pages/Onboarding.tsx` | Nenhuma alteracao necessaria |

---

## Resultado Esperado

- Visitante em `/demo`: ve apenas os modulos funcionais (Dashboard, Pesquisas, Avaliacao, etc.) sem Onboarding/Manual
- Novo usuario apos cadastro: e redirecionado automaticamente para `/onboarding` e tem "Onboarding" e "Manual / Tour" no menu lateral
