

## Remover Proposta Simplificada e Manter Apenas Proposta Completa

### O que muda

- Ao marcar "Gostaria de fazer uma proposta?", o formulario de **Proposta Completa** aparece diretamente, sem seletor de modelo
- Remove o `ProposalModelSelector` e os campos inline da proposta simplificada
- Remove o estado `modeloProposta` que nao sera mais necessario
- Melhora a responsividade do `ProposalForm` (grids adaptativos, espacamento mobile)

### Secao Tecnica

**Arquivo 1: `src/components/visitas/FeedbackForm.tsx`**

- Remover imports de `ProposalModelSelector` e estado `modeloProposta`
- Substituir todo o bloco condicional (linhas 376-473) por renderizacao direta do `ProposalForm` quando `gostaria_fazer_proposta` estiver marcado — sem seletor, sem campos simplificados
- Remover campos do schema que eram exclusivos da simplificada (`forma_pagamento`, `sinal_entrada`, `valor_financiado`, `valor_ofertaria`) ja que esses dados serao capturados pelo ProposalForm
- Remover labels de `formaPagamentoLabels`

**Arquivo 2: `src/components/visitas/ProposalForm.tsx`**

- Remover o seletor de modelo interno (linhas 132-143) — ir direto para o formulario completo
- Forcar `modelo = "completo"` sempre (remover estado e condicional `isCompleto`)
- Melhorar responsividade:
  - Campos de identificacao: `grid-cols-1 sm:grid-cols-2` (ja esta ok)
  - Assinatura e CNH: largura total em mobile, lado a lado em desktop
  - Botao de envio: `w-full` em mobile
  - Espacamento vertical adequado para telas pequenas
