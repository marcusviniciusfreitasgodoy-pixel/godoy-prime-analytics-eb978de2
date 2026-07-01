# Corrigir erro "Falha ao gerar parecer" no Analista Imobiliário

## Causa raiz (confirmada nos logs)

A edge function `parecer-nucleo` tenta assinar um JWT curto para assumir o role Postgres `parecer_nucleo_ro`, mas depende de `SUPABASE_JWT_SECRET`. **Na Lovable Cloud esse segredo não é acessível às edge functions** (mesma restrição do `SUPABASE_SERVICE_ROLE_KEY`). Resultado: toda chamada morre com 500 em `mintParecerJwt`, e o `analista-imobiliario` retorna "non-2xx status code" para a UI.

Log relevante:
```
[parecer-nucleo] jwt mint fail Error: SUPABASE_JWT_SECRET indisponível
```

## Estratégia da correção

Manter o princípio de segurança do Passo 2 (leitura restrita a um conjunto allow-list de tabelas oficiais, sem service_role), mas trocar o mecanismo: em vez de assumir um role Postgres via JWT assinado, **usar o próprio JWT do usuário autenticado** e garantir que as tabelas necessárias tenham SELECT liberado para `authenticated`. As tabelas em questão (`itbi_transactions`, `iptu_logradouro_resumo`, `condominios_mapeamento`, `microbairros_geo`) já são bases oficiais/agregadas e a maioria já é legível por autenticados — vou confirmar e ajustar via migração o que faltar.

## Mudanças

### 1. `supabase/functions/parecer-nucleo/index.ts`
- Remover `mintParecerJwt`, `SignJWT`, dependência de `jose`, uso de `JWT_SECRET`.
- Remover o segundo cliente `supaAsParecer`; passar a executar todas as queries com `supaAsUser` (JWT do usuário logado, respeitando RLS).
- Manter tudo o resto: validação de JWT com `getClaims`, rate-limit por `user_id` (30/min), input Zod, cálculo ponderado com IQR, montagem do bloco `nucleo`/`lacunas`/`meta`.
- Atualizar `meta.role_execucao` para `authenticated` e ajustar o texto de política.

### 2. Migração de RLS (apenas o que faltar)
Verificar e, se necessário, adicionar policies `FOR SELECT TO authenticated USING (true)` nas tabelas de leitura oficial usadas pelo parecer:
- `itbi_transactions`
- `iptu_logradouro_resumo`
- `condominios_mapeamento`
- `microbairros_geo`

Também garantir GRANT SELECT ... TO authenticated nessas tabelas. Nenhuma delas contém PII — são dados oficiais agregados da Prefeitura ou dados de mapeamento territorial já usados em outros módulos autenticados.

Como o role `parecer_nucleo_ro` deixa de ser usado no runtime, ele pode permanecer no banco sem impacto (é inofensivo). Não vou removê-lo nesta correção para manter o escopo mínimo.

### 3. Validação
- Rechamar `analista-imobiliario` a partir da UI (botão "Rodar QA do laudo") em um endereço com dados conhecidos (Av. Olof Palme / Rua Escritor Rodrigo Melo Franco).
- Conferir nos logs de `parecer-nucleo` que não há mais erro de JWT e que o bloco NÚCLEO retorna número de transações > 0.
- Conferir `ai_gateway_logs` para ver a chamada ao Gemini 2.5 Pro concluir com sucesso.

## Escopo

Alteração pontual em 1 edge function + 1 migração de RLS/GRANT (se necessário). Sem mudanças de UI, sem mudanças no `analista-imobiliario`, sem tocar no motor de avaliação.
