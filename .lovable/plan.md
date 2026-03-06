

## Busca de transações por condomínio fechado na avaliação

### Diagnóstico

O imóvel na **Rua João Geraldo Kuhlmann** está dentro do **Santa Mônica Residências**, um condomínio fechado com 6 ruas internas cadastradas na base:
- Rua João Geraldo Kuhlmann
- Rua Desenhista Luís Guimarães
- Rua Pedro Ludovico
- Rua Nélson Rodrigues
- Rua Josué de Castro
- Rua Sebastião Affonso Ferreira

Atualmente, a busca ITBI no Step 1 procura apenas pelo logradouro principal, encontrando **1 transação**. Se buscasse em todas as ruas internas, encontraria pelo menos **6 transações** (1 na Kuhlmann + 5 na Nélson Rodrigues), fornecendo uma base de dados muito mais representativa.

O mesmo problema afeta o hook `useHistoricalTransactionAnalysis` (análise de 5 anos), que também busca apenas pelo logradouro.

### Plano de implementação

#### 1. Adicionar campo `condominioSelecionado` ao ValuationState (`src/types/valuation.ts`)

Novo campo opcional com dados do condomínio selecionado:
```typescript
condominioSelecionado: {
  nome: string;
  ruas_internas: string[];
  logradouro_padrao: string;
} | null;
```

#### 2. Seletor de condomínio no Step0Identification (`src/components/valuation/Step0Identification.tsx`)

Quando o tipo de imóvel for "Casa em Condomínio" (ou similar), transformar o campo "Nome do Condomínio" de texto livre para um **autocomplete com busca** na tabela `condominios_mapeamento`:
- Buscar por `nome_condominio ILIKE %termo%`
- Ao selecionar, salvar `ruas_internas` e `logradouro_padrao` no state
- Manter opção de texto livre para condomínios não cadastrados

#### 3. Expandir busca ITBI no Step1Location (`src/components/valuation/Step1Location.tsx`)

Quando `condominioSelecionado` existir e tiver `ruas_internas`:
- Buscar transações em **todas** as ruas internas (usando `.or()` com múltiplas condições `.ilike`)
- Agregar os resultados como se fossem da mesma localidade
- Exibir badge informando: "X transações em Y ruas do condomínio"

#### 4. Expandir análise histórica (`src/hooks/useHistoricalTransactionAnalysis.ts`)

Aceitar parâmetro opcional `ruasInternas: string[]`. Quando fornecido:
- Buscar transações em todas as ruas internas ao invés de apenas no logradouro principal
- Isso evita o fallback para dados genéricos do bairro quando há dados suficientes dentro do condomínio

#### 5. Ajustar ValuationEngine para passar dados do condomínio

Conectar o `condominioSelecionado` do state ao hook `useHistoricalTransactionAnalysis` e às buscas do Step1.

### Resultado esperado

Para o Santa Mônica Residências, ao invés de encontrar 1 transação na Kuhlmann e cair no fallback do bairro, o sistema encontrará transações em todas as 6 ruas internas, fornecendo uma análise específica e confiável do condomínio.

