# CLAUDE.md — Godoy Prime Analytics

Guia para agentes de código (Claude Code e similares) trabalhando neste repositório.
A constituição completa do projeto está em `CONTEXT.md` — leia antes de qualquer mudança relevante. Este arquivo é o resumo operacional.

---

## 1. Stack e comandos

- React 18 + Vite 5 + Tailwind v3 + TypeScript 5 + shadcn/ui. Sem Next/Vue/Angular.
- Gerenciador de pacotes: **Bun** (`bun.lock` é o único lockfile). Nunca commitar `package-lock.json` ou `yarn.lock`.

```sh
bun install --frozen-lockfile
bun run dev        # http://localhost:8080
bun run typecheck  # tsc --noEmit -p tsconfig.app.json
bun run lint
bun run test       # bun test (vitest-compatible specs em src/**/__tests__)
bun run build
```

Rode os quatro últimos antes de abrir PR — é exatamente o que `.github/workflows/ci.yml` executa.

## 2. Idioma e marca

- Toda UI, e-mail, PDF, WhatsApp e mensagem de erro em **pt-BR**.
- Vocabulário: "Corretor Autônomo", "Imobiliária", "Painel Analítico", "Parecer Godoy Prime".
- Paleta Navy `#0C2340` + Gold `#D4AF37`, estilo minimalista premium.
- Cores sempre via tokens semânticos em `src/index.css` + variantes shadcn. **Nunca** `text-white`, `bg-black`, `bg-[#...]` em componentes. Exceção: exports em jsPDF, que usam hex direto por limitação técnica.

## 3. Regras duras de dados (quebrar isso gera número errado no produto)

- **ITBI é base agregada**: cada linha soma várias escrituras. Toda média/mediana precisa ser **ponderada por `total_transacoes`**. Contar linhas subestima o mercado em ~4x.
- **Sempre** encerrar queries com `.limit(5000)` — o PostgREST trunca em 1000 linhas silenciosamente.
- Janela histórica padrão: 5 anos, excluindo o ano corrente salvo expansão explícita.
- Busca por logradouro passa por `src/lib/logradouroSearch.ts` (variantes de grafia: GENERAL/GAL, OLYNTHO/OLINTO, PILLAR/PILAR, AVN/AV). Não reimplementar normalização ad hoc.
- Consultas territoriais filtram `.eq("ativo", true)`; vias públicas nunca entram em `ruas_internas`.
- Preferir "Dados insuficientes" a exibir número enganoso.

## 4. Padrões de implementação

- **PDFs**: só `jsPDF` com render manual. **Nunca** `html2canvas`.
- **Campos monetários**: `inputMode="numeric"` + regex. **Nunca** `<input type="number">`.
- **Mapas**: Google Maps JS API + Places API (New). Sem Leaflet.
- **IA**: Lovable AI Gateway (`LOVABLE_API_KEY`, server-side em edge functions). Sofia usa apenas STT, nunca TTS.
- **Multi-tenancy**: isolamento por `organization_id`; toda RLS usa `get_user_org_id(auth.uid())`. Papéis vivem em `user_roles` (nunca em `profiles`).

## 5. Arquivos que o agente NÃO deve editar

Gerados/gerenciados pela plataforma — mudanças serão sobrescritas:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/previewAuthStorage.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- `supabase/config.toml` (configurações de projeto)

## 6. Backend: como trabalhar sem acesso direto ao banco

O backend roda em Lovable Cloud (Supabase gerenciado). Não há dashboard, service role key nem conexão SQL direta a partir do repositório.

- **Ler o schema**: `src/integrations/supabase/types.ts` (sempre atualizado, cobre tabelas, colunas, enums e funções) e o histórico em `supabase/migrations/`.
- **Mudar o schema**: escrever um arquivo SQL novo em `supabase/migrations/` com nome ordenado por timestamp. A aplicação acontece pelo chat da Lovable, com o conteúdo aplicado byte a byte — não edite migrations já existentes.
  - Todo `CREATE TABLE` em `public` precisa de `GRANT` na mesma migration, seguido de `ENABLE ROW LEVEL SECURITY` e das policies.
- **Edge functions**: código em `supabase/functions/<nome>/index.ts` pode ser editado normalmente; o deploy ocorre quando as mudanças chegam à Lovable.
- **Consultar dados reais**: peça a query no chat da Lovable e traga o resultado para cá.
- **Secrets** (Z-API, Google Maps, Resend, `LOVABLE_API_KEY`) vivem apenas no backend e nunca entram no repositório.

## 7. Tipos ainda não gerados

Quando uma migration ainda não foi aplicada, `types.ts` não conhece a coluna/view nova. Nesses casos use um cast localizado (`as never` no update, ou um cast tipado do client para a view) e trate o erro em runtime com `console.warn`, para que o fluxo principal continue funcionando. Veja `src/utils/priceIndex.ts` como referência.

## 8. Metodologia estatística: onde está e como mudar

- Referência do que o produto calcula: `docs/especificacao-metodologia-godoy-prime.md` (v3.0) e o resumo para terceiros em `docs/relatorio-final-desenvolvedor-2026-09-04.md`. Estado e pendências na última nota de passagem em `docs/handoff-*.md`.
- Motor único em `supabase/functions/_shared/itbiMarketStats.ts` (`ENGINE_VERSION`); regras de carga em `_shared/itbiIngestion.ts`; bairros oficiais em `_shared/bairrosRio.ts`.
- **Cinto de outliers (`_shared/outlierLimits.ts`) é gerado, nunca editado à mão:** consulta 7.4 de `docs/calibracao-consultas.sql` → CSV em `docs/calibracao/` → `bun run cinto <csv>` → `bun run test` → Apêndice B da especificação.
- Toda mudança de metodologia vem com: constante ou regra no código, consulta de calibração que a sustenta, CSV versionado, teste, e a linha correspondente na especificação (seção 15 registra pendências e decisões).
