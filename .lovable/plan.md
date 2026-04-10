

## Plano: Notificar corretor sobre feedback e assinatura recebidos

### Situação atual

| Evento | Toast in-app | Email | WhatsApp |
|---|---|---|---|
| Feedback recebido | Sim (polling 30s) | Sim (email ao corretor) | Não |
| Assinatura recebida | Não | Não | Não |

### Alterações propostas

#### 1. Notificar corretor por WhatsApp ao receber feedback
**Arquivo:** `supabase/functions/public-submit/index.ts` (handler `handleFeedback`)

Após inserir o feedback com sucesso, buscar a ficha vinculada e o perfil do corretor. Se o corretor tiver telefone, invocar a Edge Function `send-whatsapp` com uma mensagem informativa.

#### 2. Notificar corretor por WhatsApp e email ao receber assinatura
**Arquivo:** `supabase/functions/public-submit/index.ts` (handler `handleAssinatura`)

Após salvar a assinatura, buscar a ficha completa e o perfil do corretor. Enviar:
- WhatsApp ao corretor informando que a assinatura (do visitante ou do corretor) foi registrada
- Email ao corretor via `send-visit-email` com tipo adequado

#### 3. Adicionar toast in-app para assinaturas recebidas
**Arquivo:** `src/components/visitas/FeedbackRealtimeListener.tsx`

Expandir o polling para também verificar fichas com `assinatura_visitante` ou `assinatura_corretor` alterados recentemente, exibindo toast ao corretor logado.

### Detalhes técnicos

**No `handleFeedback` (public-submit):** após o insert bem-sucedido, adicionar bloco:
```typescript
// Buscar ficha e corretor para notificar
const { data: fichaData } = await supabase
  .from("fichas_visita")
  .select("codigo, endereco_imovel, nome_visitante, corretor_id, nome_corretor")
  .eq("id", fichaVisitaId)
  .single();

if (fichaData?.corretor_id) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, email, full_name")
    .eq("id", fichaData.corretor_id)
    .single();

  // WhatsApp ao corretor
  if (profile?.phone) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        telefone: profile.phone,
        tipo: "confirmacao",
        dados: {
          nome_visitante: fichaData.nome_visitante,
          endereco_imovel: fichaData.endereco_imovel,
          nome_corretor: profile.full_name,
          mensagem_extra: `O visitante ${fichaData.nome_visitante} enviou um feedback sobre o imóvel ${fichaData.endereco_imovel}.`
        }
      })
    });
  }
}
```

**No `handleAssinatura` (public-submit):** após o update bem-sucedido, adicionar bloco similar notificando o corretor de que a assinatura foi registrada.

### Arquivos afetados
- `supabase/functions/public-submit/index.ts` (2 blocos de notificação)
- `src/components/visitas/FeedbackRealtimeListener.tsx` (polling de assinaturas — opcional)

