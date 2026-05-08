## Objetivo

Validar end-to-end o fluxo de Autorização de Captação (rascunho → enviar → visualizar → assinar/recusar) sem efeitos colaterais reais (sem disparar email/WhatsApp para destinatário externo) e produzir um relatório de falhas/observações de integração com Resend e Z-API.

## Estratégia de teste

Como o fluxo dispara comunicações externas (Resend/Z-API) e grava no banco produtivo, o teste será feito em **3 camadas**, da mais segura para a mais real:

```text
1. Camada de SMOKE TEST (sem efeitos)
   └─ Valida deploy, CORS, autenticação e shape das respostas
2. Camada de DRY-RUN (DB + edge, comms simuladas)
   └─ Cria rascunho real, força envio com email do operador
3. Camada de OBSERVABILIDADE (logs + DB)
   └─ Lê edge_function_logs, whatsapp_message_logs, email_send_log
```

## Etapa 1 — Smoke test das edge functions

Usando `supabase--curl_edge_functions` (sem efeitos):

| # | Função | Método | Payload | Esperado |
|---|--------|--------|---------|----------|
| 1.1 | `enviar-autorizacao` | OPTIONS | — | 200 + CORS headers |
| 1.2 | `enviar-autorizacao` | POST sem JWT | `{}` | 401 "Não autenticado" |
| 1.3 | `enviar-autorizacao` | POST com JWT, sem id | `{}` | 400 "autorizacao_id obrigatório" |
| 1.4 | `get-autorizacao-publica` | GET sem token | — | 400 "Token inválido" |
| 1.5 | `get-autorizacao-publica` | GET token inexistente | `?token=fake_xxx` | 404 |
| 1.6 | `assinar-autorizacao` | POST sem token | `{}` | 400 |
| 1.7 | `assinar-autorizacao` | POST token inexistente, acao=assinar | — | 404 |

## Etapa 2 — Dry-run do fluxo completo

Pré-requisito: usuário logado no preview (já temos sessão) com `organization_id` válido.

**2.1 Criar rascunho diretamente via insert SQL (bypassa Step5):**
- INSERT em `autorizacoes_captacao` com dados sintéticos
- `proprietario_email` apontando para email seguro (`teste@godoyprime.com.br` ou domínio do operador)
- `proprietario_telefone = NULL` para evitar Z-API real
- Verificar trigger `gerar_codigo_autorizacao` populou `codigo` (`AUT-XXXXXX`)
- Verificar evento "criada" foi registrado

**2.2 Enviar (`enviar-autorizacao`):**
- Chamar edge function com JWT do preview
- Verificar resposta `{ success, link, results: { email, whatsapp } }`
- Verificar no DB: `status='enviada'`, `token_acesso` preenchido (64 chars hex), `data_envio` setado
- Verificar evento "enviada" registrado

**2.3 Visualizar (`get-autorizacao-publica`):**
- Chamar GET com `?token=<token_gerado>`
- Verificar response inclui dados completos SEM `token_acesso`
- Verificar transição `enviada → visualizada`, `data_visualizacao` setado, evento "visualizada" registrado
- Chamar GET segunda vez → status NÃO deve regredir nem duplicar evento "visualizada"

**2.4a Caminho assinar (`assinar-autorizacao`):**
- POST `{ token, acao: "assinar", assinatura: "data:image/png;base64,iVBORw0KGgo..." }` (PNG 1x1 dummy, sem PDF para isolar)
- Verificar `status='assinada'`, `data_assinatura_proprietario`, `data_vencimento` (= now + prazo_dias), `token_acesso=NULL`
- Verificar evento "assinada" + IP capturado
- Reenviar GET com mesmo token → 404 (token invalidado ✓)
- Tentar segunda assinatura → 400 "Já assinada"
- Validar trigger `bloquear_edicao_autorizacao_finalizada`: tentar UPDATE de `valor_venda` via SQL → deve falhar

**2.4b Caminho recusar (em segundo rascunho):**
- Repetir 2.1–2.3 com novo registro
- POST `{ token, acao: "recusar", motivo_recusa: "Valor abaixo do esperado" }`
- Verificar `status='recusada'`, `motivo_recusa`, `data_recusa`, evento "recusada"
- Validar bloqueio de edição idem 2.4a

## Etapa 3 — Validar UI

Browser test (sem disparos externos extras):
- `/autorizacoes-captacao`: KPIs por status batem com DB, drawer abre, timeline lista eventos
- `/autorizacao/<token_valido>` (criar 3º rascunho enviado): renderiza preview, botão Assinar bloqueado sem checkbox LGPD, fluxo de recusa abre textarea
- Rota com token inválido: card "Link inválido ou expirado"
- Rota com token de autorização já assinada: card "Autorização assinada com sucesso"

## Etapa 4 — Auditoria de integrações Resend & Z-API

### 4.1 Resend
- Confirmar via `fetch_secrets` se `RESEND_API_KEY` está configurado
- Ler `supabase--edge_function_logs` para `enviar-autorizacao` filtrando por `Resend`
- Pontos a checar:
  - `from: 'Godoy Prime <noreply@godoyprime.com.br>'` — domínio verificado? (memória menciona "Resend sandbox")
  - Status code retornado pela API
  - Mensagem de erro em caso de domínio não verificado
- Se domínio não verificado: documentar como falha conhecida (sandbox limit a `delivered@resend.dev` ou ao próprio email do dono da conta)

### 4.2 Z-API
- Confirmar `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- Comparar header usado (`Client-Token`) e endpoint (`/send-text`) com a função `send-whatsapp` e padrão `whatsapp-z-api` da memória
- **Gap identificado**: `enviar-autorizacao` não grava em `whatsapp_message_logs` (auditoria manda registrar todos os disparos Z-API). Documentar como falha de integração.
- Verificar formatação do telefone (DDI 55 + DDD + número, sem máscara)

### 4.3 Falhas conhecidas a verificar/registrar
- `LOVABLE_API_KEY` não usada no `enviar-autorizacao` (padrão Resend novo via gateway) — função usa Resend direto, ok mas inconsistente com guia mais novo
- Edge function não tem **rate limiting** (`check_rate_limit` RPC) como `notify-proposta` tem — risco de spam de envio
- Bucket `autorizacoes-captacao` é privado: o painel interno **não exibe link para baixar o PDF assinado** (`pdf_url` salvo mas sem signed URL exposta)
- `get-autorizacao-publica` invocado via `fetch` direto (passando publishable key) em vez de `supabase.functions.invoke` — funciona, mas não segue padrão dos demais módulos
- Se `proprietario_telefone` for nulo (caso de teste): garantir que `results.whatsapp = false` sem erro

## Etapa 5 — Cleanup

- DELETE dos 3 registros sintéticos em `autorizacoes_captacao` (cascateia eventos)
- Remover qualquer arquivo subido em `storage.objects` bucket `autorizacoes-captacao` durante o teste

## Entregáveis

Relatório em chat contendo:
1. Tabela de pass/fail das 7 chamadas do smoke test
2. Tabela de transições de status validadas (rascunho → enviada → visualizada → assinada/recusada)
3. Lista priorizada de falhas/gaps de integração encontrados (Resend, Z-API, auditoria, RLS, UX)
4. Recomendações de correção (com escopo) — para serem implementadas em build mode posterior

## Observações

- Nenhum email/WhatsApp será enviado para terceiros: usaremos email controlado e telefone NULL.
- Nenhuma migration nem mudança de schema será feita no teste.
- Caso o usuário aprove o plano, executarei tudo automaticamente e devolverei o relatório consolidado.
