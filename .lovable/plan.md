

# Correcao: Rua Alfredo Ceschiatti nao encontrada na busca

## Diagnostico

A **Rua Alfredo Ceschiatti** existe no banco de dados com **67+ transacoes** registradas, porem esta cadastrada no bairro **JACAREPAGUA**, nao em Barra da Tijuca. Quando o cliente busca com o bairro "Barra da Tijuca" selecionado (que e o padrao), a rua nao aparece nos resultados nem nas sugestoes de autocomplete.

Dados encontrados:
- Bairro real: JACAREPAGUA
- Tipologia: Apartamento
- Valor medio R$/m2: ~R$ 6.800-7.600
- Transacoes desde 2023 ate 2025

## Solucao Proposta

Implementar uma **busca cross-bairro** que, quando o logradouro digitado nao for encontrado no bairro selecionado, busque automaticamente em outros bairros e sugira ao usuario trocar de bairro.

### Mudancas

#### 1. Componente EmbeddedAdvancedSearch (Pesquisa Avancada)
- Apos a busca principal retornar 0 resultados com logradouro preenchido, executar uma segunda query sem filtro de bairro
- Se encontrar resultados em outro bairro, exibir um alerta: "Rua Alfredo Ceschiatti encontrada em JACAREPAGUA. Deseja buscar nesse bairro?"
- Ao clicar, atualiza o bairro selecionado e refaz a busca automaticamente

#### 2. Hook useStreetSuggestions (Autocomplete)
- Quando a busca no bairro selecionado retornar 0 sugestoes e o termo tiver 5+ caracteres, fazer uma busca secundaria sem filtro de bairro (limitada a 5 resultados)
- Exibir essas sugestoes com um badge indicando o bairro real (ex: "RUA ALFREDO CESCHIATTI - Jacarepagua")
- Ao selecionar, atualizar automaticamente o campo de bairro

#### 3. Componente BairroSelector
- Nenhuma mudanca necessaria, apenas garantir que o bairro JACAREPAGUA esteja disponivel no cache de bairros

### Detalhes Tecnicos

**EmbeddedAdvancedSearch.tsx** - Adicionar estado `crossBairroSuggestion` e logica pos-busca:
- Novo estado: `crossBairroSuggestion: { logradouro: string; bairro: string; count: number } | null`
- No `queryFn`, quando `results.length === 0` e `searchParams.logradouro` existe, executar query adicional sem filtro de bairro
- Renderizar Alert com botao para trocar bairro

**useStreetSuggestions.ts** - Adicionar fallback cross-bairro:
- Quando query principal retorna array vazio e `debouncedQuery.length >= 5`, executar busca em `itbi_transactions` sem filtro de bairro
- Adicionar campo `bairro_origem?: string` na interface `StreetSuggestion`
- Marcar sugestoes cross-bairro com o bairro de origem para exibicao diferenciada no UI

**Step0Identification.tsx e Step1Location.tsx** - Mesma logica de fallback:
- Quando sugestoes oficiais retornam vazio no bairro selecionado, buscar em outros bairros
- Exibir badge com bairro de origem e atualizar campo bairro ao selecionar

### Impacto
- Nenhuma mudanca no banco de dados
- Nenhuma mudanca em edge functions
- Apenas mudancas no frontend (3-4 arquivos)
- Retrocompativel com buscas existentes (o fallback so ativa quando 0 resultados)
