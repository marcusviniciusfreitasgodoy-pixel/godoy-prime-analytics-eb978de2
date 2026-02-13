
## Aplicar `check_rate_limit()` persistente nos endpoints publicos

### Contexto

Os tres fluxos publicos (feedback, proposta, assinatura) atualmente fazem INSERT/UPDATE direto no banco via SDK do Supabase com a anon key e politicas RLS publicas de INSERT. Nao ha rate limiting persistente nesses fluxos -- apenas o feedback tem verificacao de duplicata (`checkFeedbackExists`).

### Estrategia

Criar uma **unica Edge Function** chamada `public-submit` que centraliza os tres fluxos publicos com rate limiting persistente via `check_rate_limit()`. Os componentes front-end passam a chamar essa funcao ao inves de escrever diretamente no banco.

### Limites propostos

| Fluxo | Identificador | Janela | Max |
|---|---|---|---|
| Feedback | `ficha_visita_id` | 300s (5 min) | 2 |
| Proposta | `ficha_visita_id` | 300s (5 min) | 3 |
| Assinatura | `codigo + tipo` | 300s (5 min) | 3 |

### Alteracoes

**1. Nova Edge Function: `supabase/functions/public-submit/index.ts`**

- Recebe JSON com campo `action` (`feedback`, `proposta`, `assinatura`)
- Valida payload com Zod
- Chama `check_rate_limit()` via RPC com `service_role`
- Se permitido, executa o INSERT/UPDATE correspondente usando `service_role`
- Retorna sucesso ou erro 429

Estrutura:

```text
POST /functions/v1/public-submit
{
  "action": "feedback",
  "payload": { ficha_visita_id, nota_geral, ... }
}

POST /functions/v1/public-submit
{
  "action": "proposta",
  "payload": { ficha_visita_id, nome_completo, valor_ofertado, ... }
}

POST /functions/v1/public-submit
{
  "action": "assinatura",
  "payload": { codigo, tipo, signatureData }
}
```

**2. Atualizar `supabase/config.toml`**

Adicionar:
```toml
[functions.public-submit]
verify_jwt = false
```

**3. Atualizar `src/hooks/useFeedbackVisita.ts`**

Na mutation `createFeedback`, substituir o INSERT direto por chamada a edge function:

```typescript
// ANTES
await supabase.from("feedbacks_visita").insert(feedback);

// DEPOIS
const res = await supabase.functions.invoke("public-submit", {
  body: { action: "feedback", payload: feedback }
});
if (res.error) throw res.error;
```

**4. Atualizar `src/hooks/usePropostas.ts`**

Na mutation `createProposta`, substituir o INSERT direto por chamada a edge function:

```typescript
// ANTES
await supabase.from("propostas_compra").insert(proposta).select().single();

// DEPOIS
const res = await supabase.functions.invoke("public-submit", {
  body: { action: "proposta", payload: proposta }
});
```

**5. Atualizar `src/pages/AssinaturaVisita.tsx`**

Na funcao `handleSaveSignature`, substituir o UPDATE direto por chamada a edge function:

```typescript
// ANTES
await supabase.from("fichas_visita").update({ [field]: signatureData }).eq("id", ficha.id);

// DEPOIS
const res = await supabase.functions.invoke("public-submit", {
  body: { action: "assinatura", payload: { codigo, tipo: signatureType, signatureData } }
});
```

**6. Remover politicas RLS publicas de INSERT (opcional, recomendado)**

Apos migrar os tres fluxos para a edge function (que usa `service_role`), as politicas publicas de INSERT em `feedbacks_visita` e `propostas_compra` podem ser removidas, reduzindo a superficie de ataque. A politica publica de UPDATE em `fichas_visita` para assinaturas tambem pode ser removida.

### Secao tecnica

A Edge Function `public-submit`:
- Usa `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` para criar o client com permissoes elevadas
- Chama `supabase.rpc('check_rate_limit', { p_identifier, p_function_name: 'public-submit-{action}', p_window_seconds, p_max_requests })` antes de cada operacao
- Retorna HTTP 429 com `Retry-After` header quando o limite e excedido
- Valida os payloads com Zod antes de executar qualquer operacao no banco
- A notificacao de proposta (`notify-proposta`) continua sendo chamada separadamente apos sucesso (ou pode ser integrada na mesma funcao)
