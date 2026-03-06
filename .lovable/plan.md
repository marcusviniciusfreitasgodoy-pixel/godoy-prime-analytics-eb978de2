

## Plano: Busca por Condomínio no módulo Pesquisas de Mercado

### Contexto
O `CondominioSelector` (autocomplete com busca na base `condominios_mapeamento`) já existe e funciona bem no módulo de Avaliação. O objetivo é reutilizá-lo nas duas abas do Pesquisas de Mercado para que, ao selecionar um condomínio, a busca de transações ITBI se expanda para todas as ruas internas.

### Alterações

#### 1. Aba Transações (`src/pages/PesquisasMercado.tsx`)
- Adicionar um campo `CondominioSelector` logo abaixo dos filtros existentes (bairro/tipologia/período)
- Novo state: `condominioSelecionado` (tipo `CondominioSelecionado | null`) e `nomeCondominio` (string)
- Quando um condomínio é selecionado, extrair suas `ruas_internas` (normalizando acentos) e injetá-las no hook `useTransactionSearch`
- Ao limpar filtros, limpar também o condomínio

#### 2. Hook `useTransactionSearch` (`src/hooks/useTransactionSearch.ts`)
- Adicionar campo `logradouros?: string[]` ao `TransactionSearchParams`
- Quando `logradouros` estiver presente, construir filtro `.or()` com `logradouro.ilike.%rua%` para cada rua interna (com normalização de acentos), **substituindo** o filtro genérico de bairro por filtro específico nas ruas
- Incluir `logradouros` na query key para cache correto

#### 3. Aba Localização (`src/components/EmbeddedAdvancedSearch.tsx`)
- Adicionar um campo `CondominioSelector` ao formulário de filtros (ao lado do campo logradouro)
- Novo state: `condominioSelecionado` e `nomeCondominio`
- Quando um condomínio é selecionado, preencher automaticamente o filtro de logradouro com um `.or()` de todas as ruas internas (normalizando acentos) na query do `useQuery`
- Exibir badge informativo mostrando o condomínio selecionado e quantidade de ruas internas

#### 4. Normalização de acentos (reutilizar padrão existente)
- Aplicar `normalize('NFD').replace(/[\u0300-\u036f]/g, '')` nas ruas internas antes de construir os filtros ILIKE, garantindo match com o banco (que não tem acentos)

### Arquivos alterados
- `src/pages/PesquisasMercado.tsx` — adicionar CondominioSelector na aba Transações
- `src/hooks/useTransactionSearch.ts` — suportar filtro por array de logradouros
- `src/components/EmbeddedAdvancedSearch.tsx` — adicionar CondominioSelector na aba Localização

