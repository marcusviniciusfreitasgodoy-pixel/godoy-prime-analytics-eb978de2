

## Atualizar Materiais de Consulta e Orientação — Inteligência Territorial

O módulo Inteligência Territorial (novo) e os enriquecimentos dos módulos existentes (Motor de Avaliação com sugestão de logradouro IPTU, Pesquisa de Mercado com dados IPTU/venal) precisam ser refletidos em **8 arquivos** de documentação e orientação.

---

### Resumo das Alterações

O conteúdo novo a adicionar em todos os materiais:

1. **Módulo Inteligência Territorial** (4 sub-áreas: Mapa de Condomínios, Ficha de Condomínio, Ranking/Logradouro, Painel Admin)
2. **Motor de Avaliação enriquecido** — agora sugere dados IPTU do logradouro (total de imóveis, preço médio real, comparativo venal vs real)
3. **Pesquisa de Mercado enriquecida** — exibe unidades IPTU, valor venal vs real, variação geocodificada
4. **Infraestrutura de dados** — 1.567 condomínios, 52.761 edificações, 1.515 lotes, 485 logradouros IPTU, 450+ logradouros geocodificados

---

### Arquivo 1: `src/pages/Apresentacao.tsx`

- Adicionar **Inteligência Territorial** ao array `features` (com ícone `Map` ou `Building2`)
- Atualizar descrições de "Avaliação Imobiliária" e "Pesquisas de Mercado" para mencionar dados IPTU
- Atualizar `differentials` para incluir "Mapeamento Geoespacial" (1.567 condomínios, 52.761 edificações)
- Atualizar texto do Hero para mencionar "mapeamento geoespacial completo"

### Arquivo 2: `src/components/apresentacao/FunctionalityMapSection.tsx`

- Adicionar card **Inteligência Territorial** ao array `functionalityMap` com dor/benefício
- Atualizar dor/benefício do "Motor de Avaliação" para incluir dados IPTU
- Atualizar dor/benefício da "Pesquisa de Mercado" para incluir venal vs real

### Arquivo 3: `src/components/apresentacao/OnePagerPreview.tsx`

- Adicionar "Inteligência Territorial" ao array `detailedModules` na Página 2
- Atualizar texto do `modules` (Página 1) para refletir o Motor de Avaliação enriquecido
- Atualizar métricas no bloco "O MERCADO" para mencionar 1.567 condomínios mapeados
- Adicionar diferencial "Mapeamento Geoespacial" ao array `diferenciais`

### Arquivo 4: `src/utils/productOnePagerPdfExport.ts`

- Espelhar as mesmas alterações do OnePagerPreview no PDF:
  - `drawSolucaoModulos`: atualizar módulos destaques
  - `drawDiferenciais`: adicionar mapeamento geoespacial
  - `drawPage2FuncionalidadesDetalhadas`: adicionar Inteligência Territorial ao `detailedModules`
  - `drawMercado`: atualizar com 1.567 condomínios

### Arquivo 5: `src/pages/ManualPlataforma.tsx`

- Adicionar seção **Inteligência Territorial** ao array `manualSections` com 4+ features (Mapa, Ficha, Ranking, Logradouros, Admin)
- Atualizar descrição da seção "Pesquisas de Mercado" e "Avaliação Imobiliária" com dados IPTU
- Adicionar FAQ sobre Inteligência Territorial na seção FAQ (no arquivo `Onboarding.tsx`)

### Arquivo 6: `src/pages/Onboarding.tsx`

- Adicionar step **Inteligência Territorial** ao `allOnboardingSteps` com features descritivas e rota `/inteligencia-territorial`
- Atualizar features do step "Pesquisas de Mercado" (id 3) e "Avaliação de Imóveis" (id 4)
- Adicionar FAQ category "Inteligência Territorial" ao `faqCategories`
- Atualizar FAQ "Geral" com menção ao mapeamento geoespacial

### Arquivo 7: `src/utils/manualPdfExport.ts`

- Adicionar módulo "Inteligência Territorial" ao array `manualContent.modulos` (entre módulo 3 e 4, renumerando)
- Atualizar módulo "Pesquisas de Mercado" e "Avaliação Imobiliária" com funcionalidades IPTU
- Adicionar FAQ category "Inteligência Territorial" ao `manualContent.faq`
- Atualizar texto da introdução para mencionar mapeamento geoespacial

### Arquivo 8: `src/utils/quickGuidePdfExport.ts`

- Adicionar seção "INTELIGENCIA TERRITORIAL" com items sobre mapa, fichas de condomínio, ranking e logradouros
- Atualizar seções existentes de Avaliação e Pesquisa com menção a dados IPTU

### Arquivo 9: `src/utils/videoScriptPdfExport.ts`

- Adicionar módulo de Inteligência Territorial ao roteiro (novo bloco com narração + screenshots)
- Atualizar módulos de Avaliação e Pesquisa com menções a IPTU
- Atualizar lista de módulos na capa
- Atualizar duração estimada

---

### Conteúdo-chave para Inteligência Territorial (usado em todos)

**Dor:** Sem visão geoespacial dos condomínios, decisões de prospecção baseadas em experiência pessoal sem dados estruturados.

**Benefício/Entrega:** Mapa interativo com 1.567 condomínios, ficha completa com torres, unidades, histórico de preços ITBI e dados IPTU. Ranking e análise por logradouro.

**Features (para manual/onboarding):**
- Mapa com 1.567 condomínios plotados com cores por faixa de unidades
- Heatmap de densidade e camada de lotes PAL
- Ficha de condomínio com torres, unidades, área, valor venal e histórico trimestral
- Ranking ordenável por preço, transações, unidades e torres
- Análise por logradouro com comparativo venal vs real
- Painel administrativo com ETLs e cards de cobertura dinâmicos

