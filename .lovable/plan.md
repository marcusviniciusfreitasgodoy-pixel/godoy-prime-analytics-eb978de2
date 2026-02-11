

## Reorganizar Feedback: Mover "Interesse e Proposta" para o Final e Simplificar Campos de Proposta

### O que muda para voce

- A secao **"Interesse e Proposta"** sera movida para **depois de "Pontos de Atencao"**, ficando como ultima secao antes do botao de enviar
- Quando o cliente marcar "Gostaria de fazer uma proposta?", os campos de proposta simplificada aparecerao **inline** (sem abrir o formulario completo de ProposalForm), com:
  - **Valor da Proposta** (campo de moeda)
  - **Sinal / Entrada** (campo de moeda)
  - **Forma de Pagamento** (radio: "A Vista", "Parcelamento Direto", "Financiamento Bancario")
  - **Valor Financiado** (campo de moeda, visivel apenas se selecionar "Financiamento Bancario")
- A ordem final das secoes sera:
  1. Avaliacao Geral
  2. Efeito UAU
  3. Pontos de Atencao
  4. Interesse e Proposta (com campos simplificados condicionais)
  5. Botao "Enviar Feedback"

### Secao Tecnica

**Arquivo:** `src/components/visitas/FeedbackForm.tsx`

**Mudanca 1 — Schema: adicionar novos campos**

Adicionar ao `feedbackSchema`:
```
forma_pagamento: z.enum(["a_vista", "parcelamento_direto", "financiamento_bancario"]).optional(),
sinal_entrada: z.string().optional(),
valor_financiado: z.string().optional(),
```

**Mudanca 2 — Reordenar secoes no JSX**

Nova ordem do JSX dentro do `<form>`:
1. Card "Avaliacao Geral" (sem mudanca)
2. Card "Efeito UAU" (mover para cima)
3. Card "Pontos de Atencao" (mover para cima)
4. Card "Interesse e Proposta" (mover para baixo, com campos simplificados)
5. Botao submit

**Mudanca 3 — Substituir ProposalForm por campos inline**

Remover o bloco condicional que renderiza `<ProposalForm>` (linhas 307-327). Em seu lugar, dentro do card "Interesse e Proposta", apos o checkbox "Gostaria de fazer uma proposta?", exibir condicionalmente:

- Campo `valor_ofertaria` (ja existe, manter)
- Campo `sinal_entrada` (CurrencyInput, novo)
- RadioGroup `forma_pagamento` com 3 opcoes: "A Vista", "Parcelamento Direto", "Financiamento Bancario"
- Campo `valor_financiado` (CurrencyInput, visivel apenas quando `forma_pagamento === "financiamento_bancario"`)

**Mudanca 4 — onSubmit: mapear novos campos**

Incluir os novos campos no payload do `createFeedback.mutateAsync`. Como os campos `sinal_entrada`, `forma_pagamento` e `valor_financiado` nao existem na tabela `feedbacks_visita`, salva-los no campo `pontos_positivos` ou criar um campo JSON. A abordagem mais limpa seria adicionar esses campos a tabela.

**Mudanca 5 — Migracao de banco (opcional mas recomendada)**

Adicionar colunas a tabela `feedbacks_visita`:
```sql
ALTER TABLE feedbacks_visita 
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS sinal_entrada numeric,
  ADD COLUMN IF NOT EXISTS valor_financiado numeric;
```

Isso permite rastrear essas informacoes diretamente no dashboard analitico.

