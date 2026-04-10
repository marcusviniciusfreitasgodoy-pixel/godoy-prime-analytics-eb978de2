

## Plano: Template "pos_visita" com ficha completa no WhatsApp

### Objetivo
Criar um novo template `pos_visita` na Edge Function `send-whatsapp` que envia todos os dados da ficha de visita ao visitante, com links de assinatura e feedback, e instrucoes para preencher dados faltantes. Automatizar o envio ao mudar status para "realizada".

### Alteracoes

#### 1. Edge Function `send-whatsapp` — novo template `pos_visita`

- Adicionar `'pos_visita'` ao tipo `WhatsAppRequest['tipo']`
- Expandir a interface `dados` com campos opcionais: `valor_imovel`, `condominio_edificio`, `unidade_imovel`, `nome_corretor`, `nome_proprietario`, `cpf_visitante`, `link_feedback`, `link_ficha`
- Criar template `pos_visita` no `gerarMensagem` com formato:

```text
📋 *Ficha de Visita Realizada*

Olá *{nome_visitante}*! 👋

Sua visita foi concluída com sucesso. Seguem os dados registrados:

🏠 *Dados do Imóvel*
📍 Endereço: {endereco_imovel}
🏢 Condomínio: {condominio_edificio}
🏠 Unidade: {unidade_imovel}
🔑 Código: {codigo_imovel}
💰 Valor: R$ {valor_imovel}
👤 Proprietário: {nome_proprietario}

📅 Data da Visita: {data_hora}
👔 Corretor: {nome_corretor}

📝 *Assinatura Digital:*
{link_assinatura}

⭐ *Pesquisa de Satisfação:*
{link_feedback}

📋 *Ficha Completa:*
{link_ficha}

⚠️ *Importante:* Por favor, analise os dados acima e
preencha qualquer informação que esteja faltando
acessando os links acima.

_Godoy Prime Analytics_
```

#### 2. `src/utils/whatsappService.ts` — nova funcao `enviarFichaCompletaPosVisita`

- Criar funcao que aceita a ficha completa (`FichaVisita`) e monta o payload com todos os dados do imovel, links de assinatura, feedback e ficha
- Usar tipo `'pos_visita'`

#### 3. `src/hooks/useVisitas.ts` — substituir chamada no `updateStatus`

- No bloco `if (data.status === "realizada")`, substituir a chamada a `enviarSolicitacaoFeedback` pela nova `enviarFichaCompletaPosVisita`
- Passar todos os dados da ficha (valor, condominio, unidade, proprietario, corretor, etc.) junto com os links de assinatura, feedback e ficha

### Detalhes tecnicos
- A Edge Function `send-whatsapp` precisa ser re-deployada apos a alteracao
- O `whatsappService.ts` importara o tipo `FichaVisita` para tipagem
- O link da ficha sera: `{baseUrl}/visitas/ficha/{id}`
- Campos nulos/vazios serao omitidos do template (exibicao condicional)

