# Acesso completo do Claude ao projeto (código no GitHub + backend no Lovable Cloud)

Objetivo escolhido: trabalhar com o Claude no código, mantendo o backend atual no Lovable Cloud. Nada de banco precisa ser migrado.

## O que será feito

### 1. Conectar o repositório ao GitHub
Ligação bidirecional entre este projeto e um repositório da sua conta. A partir daí, tudo que o Claude commitar no GitHub aparece aqui, e tudo que fizermos aqui vai para lá.

Passos (feitos por você na interface): topo direito → GitHub → Connect to GitHub → autorizar a conta → escolher a organização e criar o repositório.

### 2. Arquivo de contexto para o Claude
Criar/atualizar um `CLAUDE.md` na raiz, derivado do `CONTEXT.md` já existente e das regras do projeto, cobrindo:
- stack (React 18 + Vite + Tailwind + TypeScript, shadcn);
- idioma pt-BR e paleta Navy #0C2340 / Gold #D4AF37;
- regras críticas de dados: ponderação por `total_transacoes`, `.limit(5000)` em todas as queries, PDFs só com jsPDF manual, `inputMode="numeric"` para moeda;
- arquitetura multi-tenant com `organization_id` + RLS (`get_user_org_id`);
- o que o Claude NÃO deve editar: `src/integrations/supabase/client.ts`, `previewAuthStorage.ts`, `types.ts`, `.env`, `supabase/config.toml`.

### 3. Guia de trabalho local
Adicionar uma seção no `README.md` com:
- `npm install` e `npm run dev` (porta 8080);
- as variáveis do `.env` necessárias (URL e chave publicável, que já são públicas);
- como rodar os testes (`vitest`) e o typecheck;
- aviso de que migrations de banco e deploy de edge functions continuam sendo feitos por aqui, não pelo Claude local.

### 4. Acesso do Claude a dados (leitura)
Como o Lovable Cloud não expõe dashboard nem service role key, o Claude não terá conexão SQL direta. Duas alternativas documentadas no `CLAUDE.md`:
- **Recomendada:** o Claude lê o schema completo em `src/integrations/supabase/types.ts` (gerado e sempre atualizado) e as migrations em `supabase/migrations/`. Isso cobre estrutura de tabelas, enums e funções.
- **Consultas de dados reais:** feitas por aqui, no chat da Lovable, e o resultado passado ao Claude.

## Detalhes técnicos

- A conexão GitHub não altera o backend: o app continua apontando para o mesmo projeto Cloud em preview e em produção.
- Edge functions em `supabase/functions/` podem ser editadas pelo Claude no repositório; o deploy acontece automaticamente quando as mudanças chegam aqui.
- Mudanças de schema escritas pelo Claude devem vir como arquivos SQL novos em `supabase/migrations/`; eu as aplico depois via ferramenta de migração (o conteúdo é aplicado byte a byte).
- Secrets (Z-API, Google Maps, Resend, LOVABLE_API_KEY) permanecem apenas no Cloud e não vão para o repositório.

## Fora de escopo

Migração do banco para uma conta Supabase própria. Se quiser isso depois, é um projeto separado (schema, ~57 tabelas incluindo PostGIS/ITBI, buckets, ~60 edge functions, secrets e reset de senha de todos os usuários).
