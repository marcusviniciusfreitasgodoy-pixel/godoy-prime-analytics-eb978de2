

## Diagnóstico da Duplicidade

Os dados ITBI da Prefeitura são **agregações mensais por logradouro/tipologia**. Um mesmo logradouro pode ter múltiplos registros no mesmo mês quando há diferentes faixas de área, complementos ou tipologias. No caso da RUA NELSON RODRIGUES, existem 3 registros separados com o mesmo valor médio (R$ 3.070.980, 545m², R$ 5.640/m²) — são 3 linhas distintas no banco, cada uma representando 2 transações, possivelmente de períodos mensais diferentes ou com pequenas variações de complemento.

A tabela de resultados exibe **todos os registros brutos do banco** sem agrupar por logradouro, o que causa confusão visual.

## Correção

### Arquivo: `src/components/EmbeddedAdvancedSearch.tsx`

Adicionar uma **legenda explicativa** abaixo da tabela de resultados (após a tag `</ScrollArea>`, antes do bloco de "nenhum resultado"). A legenda será um bloco informativo discreto explicando:

1. Que cada linha representa um **registro agregado mensal** (não uma transação individual)
2. Que o mesmo logradouro pode aparecer várias vezes por ter registros em **meses diferentes** ou com **tipologias/áreas distintas**
3. Que a coluna "Trans." indica quantas escrituras reais compõem aquele registro
4. Que para ver o histórico completo, basta clicar no número de transações

Texto da legenda:
> **Como interpretar os resultados:** Cada linha representa um registro mensal agregado da Prefeitura, não uma transação individual. O mesmo logradouro pode aparecer múltiplas vezes quando há registros em meses distintos ou com tipologias/áreas diferentes. A coluna "Trans." indica quantas escrituras reais compõem cada registro. Clique no número para ver o histórico completo.

### Estilo
- Bloco com ícone `Info`, fundo `bg-muted/50`, texto `text-xs text-muted-foreground`
- Posicionado logo após o `</ScrollArea>` da tabela, dentro do mesmo container de resultados

### Arquivo alterado
- `src/components/EmbeddedAdvancedSearch.tsx` — inserir legenda após a tabela (~linha 942)

