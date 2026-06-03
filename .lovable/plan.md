## Contexto

A visita `VIS-MPVG67G9` foi marcada como "realizada" intencionalmente, o que disparou corretamente o WhatsApp `pos_visita`. Dois problemas reais identificados:

1. **Tom**: "Sua visita foi concluída com sucesso" + pedido imediato de assinatura/feedback soa como encerramento de negócio para um lead ainda em fase de interesse.
2. **Links em domínio de preview**: `window.location.origin` capturou a URL de preview da Lovable em vez do domínio publicado. Cliente final não deve receber links `id-preview--*.lovable.app`.

## Mudanças

### 1. Centralizar a URL pública (`src/utils/publicUrl.ts` — novo)

Criar helper `getPublicAppUrl()` que retorna sempre `https://analytics.godoyprime.com.br` em produção e `window.location.origin` apenas em ambiente local de desenvolvimento (`localhost`/`127.0.0.1`). Constante única, fácil de ajustar.

### 2. Trocar `window.location.origin` por `getPublicAppUrl()` nos pontos que geram links enviados a clientes

- `src/utils/whatsappService.ts` (todas as funções: `enviarConfirmacaoAgendamento`, `enviarLembreteVisita`, `enviarCancelamentoVisita`, `enviarReagendamentoVisita`, `enviarSolicitacaoFeedback`, `enviarFichaCompletaPosVisita`).
- `src/hooks/useVisitas.ts` (construção de `signatureVisitanteUrl` / `signatureCorretorUrl` no `updateStatus`).
- Demais call sites que montam links públicos de visita/feedback/assinatura/ficha pública (varrer rapidamente `useAgendamentos.ts`, `visitEmailService.ts`, `pdfEmailService.ts`, `valuationShareLink.ts`, `autorizacaoMapper.ts`, `propostaPdfExport.ts` e ajustar somente onde a URL é enviada externamente ao cliente — links internos do painel ficam como estão).

Escopo deliberadamente limitado a links que vão para terceiros via WhatsApp/email/PDF.

### 3. Suavizar o template `pos_visita` em `supabase/functions/send-whatsapp/index.ts`

Substituir o bloco atual por algo como:

```
👋 Olá *{nome}*!

Obrigado pela visita ao imóvel:

📍 *Endereço:* ...
🏢 *Condomínio:* ... (se houver)
🔑 *Código:* ... (se houver)
📅 *Data:* ...
👔 *Corretor:* ...

Para registrarmos formalmente a visita e ouvirmos sua impressão, sempre que possível:

📝 Confirme sua presença (assinatura): {link}
⭐ Compartilhe sua opinião sobre o imóvel: {link}
📋 Veja a ficha completa da visita: {link}

Qualquer dúvida, estou à disposição.

_Godoy Prime Analytics_ · (21) 96407-5124
```

Remover "concluída com sucesso", remover o aviso em caixa-alta ("Importante: analise os dados…") e deixar as ações como opcionais/convidativas. Não mexer nos outros tipos (`confirmacao`, `lembrete`, `cancelamento`, `reagendamento`).

### 4. Deploy

Após editar a edge function, fazer deploy de `send-whatsapp`.

## Fora do escopo

- Alterar lógica de quando o WhatsApp é disparado (continua sendo no `status = realizada`).
- Refatorar emails (`send-visit-email`, `send-visit-reminder`) — apenas trocar `window.location.origin` quando aplicável.
- Adicionar opção para o corretor desativar o envio caso-a-caso (pode virar pedido futuro).

## Critérios de aceitação

- Marcar uma nova visita como "realizada" envia WhatsApp com o texto suavizado.
- Todos os links recebidos pelo cliente apontam para `https://analytics.godoyprime.com.br/...`, mesmo quando o corretor está logado no preview.
- Logs de `whatsapp_message_logs` continuam sendo gravados normalmente.

## Resposta ao cliente Guilherme

Sugestão de mensagem que você pode enviar (não faz parte da implementação):

> Olá Guilherme! Tudo bem? Desculpe a confusão — a mensagem é um registro automático do nosso sistema só para formalizar o agendamento da visita e facilitar a sua avaliação do imóvel. Não significa encerramento de nada do nosso lado, estamos só no começo. Qualquer dúvida sobre o imóvel da Av. Lúcio Costa 3650, conte comigo!
