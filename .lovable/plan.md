# Padronização R$ e validação na geração da Autorização

## 1. Máscara de moeda nos campos R$

Arquivo: `src/components/autorizacoes/GerarAutorizacaoDrawer.tsx`

Criar (ou reaproveitar) helper `formatCurrencyInput` / `parseCurrencyInput` em `src/utils/currencyMask.ts` (já existem padrões similares no projeto para visitas — reutilizar a abordagem):

- Exibição: `R$ 1.234.567` (sem casas decimais, padrão brasileiro com pontos de milhar).
- `inputMode="numeric"` mantido (sem `<input type="number">`, conforme regra do projeto).
- Aceita digitação livre, descarta não-dígitos, formata em tempo real.
- `onBlur` valida e normaliza.

Aplicar nos 4 campos:
- **Condomínio (R$/mês)**
- **IPTU (R$/ano)**
- **Valor de Avaliação (R$)** *
- **Valor de Venda Autorizado (R$)** *

Estado interno continua armazenando string numérica pura ("1234567"); apenas o display recebe máscara. `buildPayload()` segue usando `Number(form.valor_xxx)`.

## 2. Validação visual e bloqueio de geração com campos vazios

Hoje a validação existe (`errors` no useMemo) mas só aparece como toast genérico. Mudanças:

a) **Destacar campos com erro inline**: borda vermelha (`aria-invalid`) + mensagem em texto pequeno abaixo do Input, para todos os campos obrigatórios (nome, CPF, e-mail, endereço, bairro, valor_avaliacao, valor_venda).

b) **Ampliar lista de obrigatórios** para incluir:
- `valor_condominio` e `valor_iptu`: passam a ser **obrigatórios > 0** (ou explicitamente "isento"). Adicionar checkbox "Imóvel isento de condomínio/IPTU" que, quando marcado, libera o campo e grava `0` no payload com flag.
- `prazo_dias` e `percentual_honorarios`: já têm default, mas validar `> 0`.

c) **Diálogo de confirmação na geração** (`handleSalvarRascunho` e `handleEnviar`):
   - Se houver erros → trocar a aba ativa para "Dados", rolar até o primeiro campo inválido, exibir um `Alert` destacado no topo do drawer listando exatamente quais campos faltam, e abortar.
   - Se todos OK mas algum campo opcional importante (RG, telefone, CEP, número) estiver vazio → abrir `AlertDialog` "Alguns campos opcionais estão vazios. Deseja preencher antes de enviar ou prosseguir mesmo assim?" com botões **Voltar e preencher** / **Prosseguir mesmo assim**.

d) **Banner persistente** no rodapé do drawer mostrando contagem: "⚠ 3 campos obrigatórios pendentes" enquanto `errors` não estiver vazio, com botão **Salvar Rascunho** desabilitado apenas para envio (rascunho continua permitido apenas se nome+endereço presentes).

## 3. Detalhes técnicos

- Arquivos alterados: `src/components/autorizacoes/GerarAutorizacaoDrawer.tsx` (principal), `src/utils/currencyMask.ts` (novo helper, ~25 linhas).
- Sem mudanças no backend, no schema, no PDF nem nas edge functions.
- Sem mudanças no `GerarAutorizacaoButton.tsx` (gating de pré-condição já existe).
- Tipo `AutorizacaoFormData` já guarda `valor_condominio` / `valor_iptu` como `string` — compatível.

## Fora de escopo

- Editar valores em autorizações já geradas (status ≠ rascunho).
- Refatorar PDF ou fluxo de assinatura.
