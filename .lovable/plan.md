
# Melhorar Responsividade Mobile da Apresentacao e One-Pager PDF

## Diagnostico

Apos inspecao visual no viewport 390x844 (iPhone), a pagina de apresentacao ja tem uma boa base responsiva. As melhorias focam em refinamentos de espacamento, tipografia e legibilidade em telas pequenas. O PDF, por ser A4 fixo, precisa de ajustes para evitar sobreposicao de texto.

## Alteracoes na Apresentacao (3 arquivos)

### 1. `src/components/apresentacao/FunctionalityMapSection.tsx`

- Reduzir padding interno dos cards em mobile (`p-4` em vez de `pt-6`)
- Diminuir tamanho do icone em mobile (de `h-10 w-10` para `h-8 w-8` em telas `< sm`)
- Reduzir espacamento entre secoes de dor/beneficio em mobile
- Adicionar `text-xs` nos blocos de dor/beneficio para `< sm` e manter `text-sm` acima

### 2. `src/components/apresentacao/PersonasSection.tsx`

- Adicionar fundo de card (`bg-card rounded-xl p-4 shadow-sm`) em mobile para melhor separacao visual entre personas
- Reduzir gap do grid em mobile de `gap-6` para `gap-4`

### 3. `src/pages/Apresentacao.tsx`

- Reduzir padding vertical das secoes em mobile (`py-8` em vez de `py-12`)
- Melhorar espacamento do hero em mobile (reduzir `mb-6` do logo para `mb-4`)
- Reduzir tamanho dos botoes do hero em mobile para evitar que fiquem excessivamente altos

## Alteracoes no PDF (1 arquivo)

### 4. `src/utils/productOnePagerPdfExport.ts`

#### Funcao `drawMercado` (Pagina 1)
- Limitar largura do texto dos bullet points para `contentWidth - 50` ao inves de usar `contentWidth` inteiro, evitando sobreposicao com a caixa de estatisticas (80.000+ transacoes) posicionada a direita

#### Funcao `drawDorMercado` (Pagina 1)
- Usar `splitTextToSize` com largura reduzida (`contentWidth - 12`) para garantir que as linhas longas nao ultrapassem a borda do card

#### Funcao `drawPage2FuncionalidadesDetalhadas` (Pagina 2)
- Aumentar `cellH` de 38 para 40mm para dar mais espaco ao texto dentro dos cards detalhados
- Usar `splitTextToSize` para o texto de "Entrega" com largura limitada a `cellW - 10` para evitar que textos longos ultrapassem a borda

#### Funcao `drawParaQuem` (Pagina 2)
- Usar `splitTextToSize` com largura `colW - 8` (mais margem interna) para evitar que descricoes longas das personas ultrapassem as colunas vizinhas

## Resumo das alteracoes

| Arquivo | Tipo | Impacto |
|---|---|---|
| FunctionalityMapSection.tsx | Responsividade | Cards mais compactos em mobile |
| PersonasSection.tsx | Responsividade | Melhor separacao visual em mobile |
| Apresentacao.tsx | Responsividade | Espacamento otimizado em mobile |
| productOnePagerPdfExport.ts | PDF layout | Prevencao de sobreposicao de texto |
