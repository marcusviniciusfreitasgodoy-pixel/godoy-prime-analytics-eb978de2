
# Plano: Alterar opcoes do campo Interesse

## O que sera feito

Substituir as opcoes atuais do campo "Interesse" no formulario de contato da pagina `/apresentacao`:

**Atual:** Comprar Imovel / Vender Imovel / Ambos

**Novo:** Imobiliaria / Corretor Autonomo

## Alteracoes em `src/pages/Apresentacao.tsx`

### 1. Schema Zod (linha 45)
Alterar o enum de `["compra", "venda", "ambos"]` para `["imobiliaria", "corretor_autonomo"]`.

### 2. SelectItems (linhas 253-255)
Substituir as 3 opcoes por:
- `<SelectItem value="imobiliaria">Imobiliaria</SelectItem>`
- `<SelectItem value="corretor_autonomo">Corretor Autonomo</SelectItem>`

Nenhum outro arquivo precisa ser alterado. A edge function `send-lead-notification` ja recebe o valor do campo `interesse` como string e o repassa no email sem depender dos valores especificos.
