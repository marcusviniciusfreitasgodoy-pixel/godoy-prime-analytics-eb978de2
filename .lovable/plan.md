# Plano de Teste E2E: Ficha de Visita → Proposta

Objetivo: validar todo o ciclo, do agendamento ao recebimento da proposta, identificando falhas de integração (WhatsApp, e-mail, links públicos, RLS, PDF).

## Escopo do teste

```
Agendamento → Ficha criada → Status "realizada"
   → WhatsApp pós-visita (visitante + corretor)
   → E-mail de feedback
   → Link público da ficha
   → Link de assinatura (visitante e corretor)
   → Link de feedback
   → Link de proposta
   → Submissão pública da proposta
   → Visualização em /propostas e dentro da ficha
   → Geração de PDF da proposta
```

## Etapas do teste

### 1. Pré-checagem de infraestrutura
- `supabase--cloud_status` (backend ativo)
- Verificar secrets: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`, `RESEND_API_KEY`
- `supabase--edge_function_logs` para `send-whatsapp`, `public-submit`, `send-visit-email`, `notify-proposta` (últimos erros)

### 2. Criar ficha de visita de teste
- Inserir ficha via DB com `organization_id` válido (mesma org do usuário logado), telefone real do usuário, status `agendada`
- Verificar visibilidade na lista `/visitas`

### 3. Disparar mudança de status para "realizada"
- Via UI (rota atual `/visitas/ficha/...`) ou simulação do `updateStatus`
- Confirmar nos logs:
  - `send-whatsapp` enviado para visitante (tipo `pos_visita`)
  - `send-whatsapp` enviado para corretor
  - `send-visit-email` (feedback) enviado
  - Registros em `whatsapp_message_logs` com `status_envio = 'enviado'`

### 4. Validar links gerados na mensagem WhatsApp
- `link_ficha`: `/visitas/ficha-publica/:codigo` carrega
- `link_assinatura`: `/visitas/assinatura/:codigo/visitante` carrega
- `link_feedback`: `/visitas/feedback/:codigo` carrega
- Verificar se há link para proposta nos templates (gap conhecido?)

### 5. Submissão pública de proposta
- Acessar `/proposta/novo` com `ficha_visita_id` válido (via querystring/contexto)
- `supabase--curl_edge_functions` em `public-submit` com action `proposta`:
  - payload simplificado válido
  - validar resposta, criação no DB com `organization_id` herdado da ficha
- Testar caso de borda: payload **sem** `ficha_visita_id` → deve ser bloqueado (atual produz órfão invisível)

### 6. Visualização e PDF
- Conferir proposta listada em `/propostas` (visível pela RLS da org)
- Conferir aba "Propostas" dentro da ficha
- Baixar PDF via `exportPropostaPdf` (validar layout)

### 7. Notificação de proposta recebida
- Verificar `notify-proposta` logs (e-mail + WhatsApp ao corretor)

## Critérios de sucesso
- Nenhum erro 4xx/5xx nas edge functions
- `whatsapp_message_logs` com `enviado` para todos os disparos
- Links públicos retornam 200 e exibem dados corretos
- Proposta criada com `organization_id` e `ficha_visita_id` corretos
- Proposta visível em `/propostas` e dentro da ficha
- PDF gerado sem campos vazios críticos

## Entregável
Relatório curto com:
- ✅/❌ por etapa
- IDs/códigos dos registros criados (para limpeza)
- Lista priorizada de bugs encontrados + sugestão de correção (sem aplicar nesta fase)

## Detalhes técnicos
- Tudo será executado via tools MCP (read_query, curl_edge_functions, edge_function_logs); não criarei UI nem alterarei código
- Ficha de teste será marcada com prefixo `TEST-` e listada para limpeza ao final
- Telefone e e-mail usados serão informados pelo usuário antes de disparar (para não enviar para terceiros)
