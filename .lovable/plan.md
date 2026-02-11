

## Notificacao por Email e WhatsApp ao Corretor Quando Proposta e Enviada

### Contexto
A proposta de compra e enviada pelo cliente em uma pagina publica (`/visitas/feedback/:codigo`), sem autenticacao. As edge functions atuais de email e WhatsApp exigem JWT. Sera necessario criar uma nova edge function dedicada que busca os dados do corretor internamente usando `service_role`.

### O que muda
- Ao enviar uma proposta de compra com sucesso, o sistema notifica automaticamente o corretor responsavel pela visita por **email** e **WhatsApp**
- A notificacao inclui: nome do proponente, imovel, valor ofertado, telefone de contato e link para ver a proposta
- Funciona sem autenticacao do lado do cliente (pagina publica)

### Secao Tecnica

**Arquivo 1 (novo): `supabase/functions/notify-proposta/index.ts`**
- Edge function sem verificacao de JWT (pagina publica)
- Recebe: `ficha_visita_id`, `nome_proponente`, `telefone_proponente`, `email_proponente`, `endereco_imovel`, `valor_ofertado`, `codigo_proposta`
- Usa `SUPABASE_SERVICE_ROLE_KEY` para buscar na tabela `fichas_visita` o `corretor_id` e depois em `profiles` o email e telefone do corretor
- Envia email via Resend com template HTML (estilo Godoy Prime) contendo dados da proposta
- Envia WhatsApp via Evolution API para o telefone do corretor com mensagem formatada
- Tambem envia copia para o email da agencia (`contato@godoyprime.com.br`)
- Inclui rate limiting basico (verifica se nao esta sendo spammado)

**Arquivo 2 (editar): `supabase/config.toml`**
- Adicionar `[functions.notify-proposta]` com `verify_jwt = false`

**Arquivo 3 (editar): `src/components/visitas/ProposalForm.tsx`**
- Apos `createProposta.mutateAsync` com sucesso (linha 112), chamar `supabase.functions.invoke("notify-proposta")` passando os dados relevantes
- Chamar de forma "fire-and-forget" (nao bloquear o fluxo se falhar)
- Usar os dados do form + preFill para montar o payload

**Arquivo 4 (editar): `src/pages/FeedbackVisita.tsx`**
- Passar `nome_corretor` e `ficha.id` no preFill para que o ProposalForm tenha acesso ao ID da ficha para a notificacao

### Template de Email para o Corretor
- Header: "Nova Proposta de Compra Recebida!"
- Dados: nome do proponente, telefone, email, endereco do imovel, valor ofertado, condicoes de pagamento
- CTA: botao para acessar o painel de propostas
- Footer: padrao Godoy Prime

### Template de WhatsApp para o Corretor
```text
📋 *Nova Proposta de Compra!*

Voce recebeu uma proposta para o imovel:

📍 *Imovel:* [endereco]
💰 *Valor Ofertado:* R$ [valor]
👤 *Proponente:* [nome]
📞 *Telefone:* [telefone]

Acesse o painel para mais detalhes.

_Godoy Prime Analytics_
```

### Fluxo

```text
Cliente preenche feedback
  |
  v
Marca "Gostaria de fazer proposta"
  |
  v
Preenche ProposalForm completo
  |
  v
Clica "Enviar Proposta"
  |
  v
createProposta.mutateAsync() --> Salva no banco
  |
  v
supabase.functions.invoke("notify-proposta") --> Fire & forget
  |
  +---> Busca corretor_id da ficha_visita (service_role)
  |       |
  |       v
  |     Busca email + telefone do corretor em profiles
  |       |
  |       +---> Envia email (Resend) ao corretor + agencia
  |       +---> Envia WhatsApp (Evolution) ao corretor
  |
  v
Tela de sucesso "Proposta Enviada!"
```

