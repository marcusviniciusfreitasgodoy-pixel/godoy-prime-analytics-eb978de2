

## Correção do Texto "Últimos 12 Meses" no PDF

O texto "últimos 12 meses" está **hardcoded** no PDF em 2 locais dentro de `src/utils/valuationPdfExport.ts`, mas a busca de transações ITBI no motor de avaliação **não aplica filtro de data** — usa todas as transações disponíveis. O texto é simplesmente impreciso.

### Alterações

**Arquivo: `src/utils/valuationPdfExport.ts`**

1. **Linha 84** — Disclaimer do cabeçalho:
   - De: `'reais (últimos 12 meses), características declaradas e análise estatística.'`
   - Para: `'reais no período selecionado, características declaradas e análise estatística.'`

2. **Linha 212** — Texto explicativo da seção de transações:
   - De: `'...realizadas nos últimos 12 meses e registradas nos órgãos oficiais.'`
   - Para: `'...realizadas no período selecionado e registradas nos órgãos oficiais.'`

### Arquivo alterado
- `src/utils/valuationPdfExport.ts` (2 substituições de texto)

