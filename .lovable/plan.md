

## Plano: Migração Evolution API → Z-API

### Dados fornecidos
- **Instance ID**: `3F172E6464E6822C9BFA9E648AE68DF9`
- **Token**: `2489C64D3BF41EBEA82BBA81`

### Passo 1 — Configurar Secrets
Adicionar 2 novos secrets e remover os 3 antigos:

| Ação | Secret | Valor |
|------|--------|-------|
| Adicionar | `ZAPI_INSTANCE_ID` | `3F172E6464E6822C9BFA9E648AE68DF9` |
| Adicionar | `ZAPI_TOKEN` | `2489C64D3BF41EBEA82BBA81` |
| Remover | `EVOLUTION_API_URL` | — |
| Remover | `EVOLUTION_API_KEY` | — |
| Remover | `EVOLUTION_INSTANCE_NAME` | — |

### Passo 2 — Atualizar `send-whatsapp/index.ts`
- Substituir leitura de `EVOLUTION_*` por `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN`
- Endpoint: `https://api.z-api.io/instances/{ID}/token/{TOKEN}/send-text`
- Body: `{ phone, message }` (ao invés de `{ number, text }`)
- Remover header `apikey`

### Passo 3 — Atualizar `notify-proposta/index.ts`
- Mesma substituição na seção de WhatsApp (linhas 255-278)
- Endpoint e body no formato Z-API

### Passo 4 — Deploy das 2 funções

### Arquivos alterados
- `supabase/functions/send-whatsapp/index.ts`
- `supabase/functions/notify-proposta/index.ts`

