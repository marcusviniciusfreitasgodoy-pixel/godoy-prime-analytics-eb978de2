

## Corrigir Responsividade da Proposta em Mobile

### Problema
No mobile, o canvas de assinatura e o botao "Confirmar Assinatura" estao sendo cortados/saindo da tela. Isso acontece porque o container do formulario de proposta nao tem restricao de largura adequada e os botoes dentro do canvas de assinatura transbordam.

### Correcoes

**Arquivo 1: `src/components/visitas/ProposalForm.tsx`**
- Adicionar `overflow-hidden` no container principal do formulario para evitar transbordamento
- Garantir que o grid de CNH + Assinatura use `grid-cols-1` em mobile (ja usa, mas confirmar que nao ha conflito)

**Arquivo 2: `src/components/visitas/PublicSignatureCanvas.tsx`**
- Adicionar `overflow-hidden` no Card raiz do componente
- Nos botoes "Limpar" e "Confirmar Assinatura": trocar de `flex-1` para layout responsivo que nao transborde
- Usar `flex-wrap` no container dos botoes para que quebrem linha se necessario em telas muito estreitas
- Reduzir texto do botao em mobile: "Confirmar" em vez de "Confirmar Assinatura" (usando classe `hidden sm:inline` no texto extra)
- Garantir que o canvas container tenha `max-w-full` e `overflow-hidden`

**Arquivo 3: `src/components/visitas/FeedbackForm.tsx`**
- Adicionar `overflow-hidden` no container que envolve o ProposalForm para evitar que o formulario de proposta extrapole a largura da tela

