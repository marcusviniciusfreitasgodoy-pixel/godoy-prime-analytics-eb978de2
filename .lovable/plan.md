
# Confirmação de visita pelo cliente

Habilitar que o visitante **confirme, reagende ou cancele** uma visita agendada através de um link único enviado por email e WhatsApp. O fluxo é totalmente público (sem login), validado por token, e válido até o horário da visita.

## Comportamento

1. Quando um agendamento é criado:
   - Sistema gera `token_confirmacao` único e seta `token_expira_em = data_hora` da visita.
   - Email e WhatsApp passam a incluir CTA **"Confirmar minha presença"** apontando para `/visitas/confirmar/:token`.
2. Lembrete de 24h passa a incluir o mesmo CTA (ainda válido).
3. Página pública `/visitas/confirmar/:token`:
   - Mostra resumo (imóvel, data, corretor).
   - Três botões: **Confirmar** • **Reagendar** • **Cancelar**.
   - **Confirmar** → status → `confirmada`, registra `confirmada_pelo_cliente_at` e IP. Tela de sucesso.
   - **Cancelar** → pede motivo opcional → status → `cancelada` → **abre automaticamente o passo de reagendamento** (escolher nova data/horário disponível com o mesmo corretor). Se o cliente reagendar, cria novo `agendamentos_visita` com novo token e marca o anterior com link no novo (`reagendado_para_id`).
   - **Reagendar** direto → mesmo seletor de nova data, marca atual como `cancelada` + cria novo agendamento.
4. Token inválido/expirado → mensagem clara ("este link já não está mais ativo, entre em contato com o corretor").
5. Notificações resultantes:
   - Corretor recebe notificação interna (e WhatsApp opcional) quando cliente confirma, cancela ou reagenda.
   - Cliente recebe email + WhatsApp de confirmação da ação realizada.

## Detalhes técnicos

### Banco (migration)
Adicionar em `agendamentos_visita`:
- `token_confirmacao` text unique
- `token_expira_em` timestamptz
- `confirmada_pelo_cliente_at` timestamptz
- `confirmada_pelo_cliente_ip` text
- `acao_cliente` text (`confirmou` | `cancelou` | `reagendou` | null)
- `motivo_cancelamento_cliente` text
- `reagendado_para_id` uuid (self-ref ao novo agendamento)

Trigger `BEFORE INSERT` para gerar token automaticamente (`encode(gen_random_bytes(24), 'base64url')`) e setar `token_expira_em = data_hora`.

### Edge functions (públicas, sem JWT)
- `public-visita-info` — `GET ?token=` → retorna dados resumidos do agendamento (sem PII desnecessária).
- `public-visita-confirmar` — `POST` → valida token, valida expiração, atualiza status, dispara notificações ao corretor.
- `public-visita-cancelar` — `POST` → recebe motivo, marca cancelada.
- `public-visita-reagendar` — `POST` → recebe nova data/hora (valida disponibilidade via `disponibilidade_corretor`), cria novo registro com novo token, atualiza o anterior.
- `public-visita-horarios` — `GET ?corretor_id=&data=` → retorna slots disponíveis para o seletor.

Rate limit simples por IP+token (in-memory) para evitar abuso.

### Frontend
- Nova rota pública em `src/App.tsx`: `/visitas/confirmar/:token` (fora do `RequireAuth`, igual às demais rotas públicas de visita).
- Novo arquivo `src/pages/visitas/ConfirmacaoPublica.tsx` com 4 estados:
  1. Resumo + 3 botões
  2. Sucesso (confirmação)
  3. Cancelamento (motivo) → encadeia para seletor de reagendamento
  4. Reagendamento (calendário + horários)
- Componente `SeletorNovaData` reutilizando lógica de `disponibilidade_corretor`.
- Estética alinhada à marca (Navy/Gold, mobile-first — clientes abrirão pelo celular).

### Templates de comunicação
- `src/utils/visitEmailService.ts` → template `agendamento_confirmado` ganha CTA principal `https://analytics.godoyprime.com.br/visitas/confirmar/{token}`.
- `supabase/functions/send-visit-reminder/index.ts` → lembrete de 24h ganha o mesmo CTA.
- `src/utils/whatsappService.ts` → mensagem de confirmação e lembrete incluem `link_confirmacao` (substitui ou complementa `link_reagendamento`).

### Segurança / LGPD
- Token de 192 bits, indexado, único.
- Página pública mostra apenas: nome do imóvel, endereço, data/hora, primeiro nome do corretor. Sem CPF/RG/telefone do visitante.
- Logs em `whatsapp_message_logs` e nova tabela leve `visita_confirmacao_eventos` (tipo, IP, user-agent, timestamp) para auditoria.

## Fora do escopo

- Alterações no fluxo de assinatura pós-visita (`/visitas/assinatura/...`) e feedback — permanecem como hoje.
- Botões interativos nativos do WhatsApp Business (mantemos link clicável, que funciona em qualquer Z-API plan).
- Reconfirmação após reagendamento múltiplo (cada novo agendamento gera seu próprio token de forma automática via trigger, sem UI extra).
