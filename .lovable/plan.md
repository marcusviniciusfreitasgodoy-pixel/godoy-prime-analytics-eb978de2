
# Remover sinalizacoes de persona (Para Quem) da Apresentacao e do PDF

## Objetivo

Remover os badges/sinalizacoes de persona ("Para: Corretor Autonomo", "Imobiliaria", etc.) de todos os cards de funcionalidades, tanto na pagina web quanto no PDF, ja que todas as funcionalidades sao relevantes para todos os perfis.

## Alteracoes

### 1. `src/components/apresentacao/FunctionalityMapSection.tsx`

- Remover o campo `para` da interface `FunctionalityItem` e de todos os 10 itens do array `functionalityMap`
- Remover o bloco JSX do badge de persona (linhas 127-132) de dentro do card

### 2. `src/components/apresentacao/PersonasSection.tsx`

- Remover este componente inteiro, ja que a secao "Para Quem" com personas separadas nao faz mais sentido

### 3. `src/pages/Apresentacao.tsx`

- Remover o import e uso de `<PersonasSection />` da pagina

### 4. `src/utils/productOnePagerPdfExport.ts`

- No array `detailedModules` (linha 302): remover o campo `persona` de todos os 6 itens
- Remover o desenho do badge de persona nos cards (linhas 381-388)
- Remover a funcao `drawParaQuem` inteira (linhas 394-442)
- Na funcao principal `exportProductOnePagerPDF`: remover a chamada `drawParaQuem(doc, page2Y, margin, contentWidth)`

## Resultado

Os cards de funcionalidades mostrarao apenas: icone + titulo + dor (vermelho) + beneficio (verde), sem nenhuma sinalizacao de publico-alvo. A secao "Para Quem" sera completamente removida tanto da pagina web quanto do PDF.
