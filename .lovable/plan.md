
## Melhorias de Transparencia nos Dados de Transacoes (Pesquisas de Mercado)

### Contexto
Os dados ITBI da Prefeitura sao agregados por logradouro/mes, nao representam transacoes individuais. Isso confunde o usuario quando busca imoveis especificos (ex: apartamentos >500m2 na Av. Lucio Costa). Tres melhorias serao implementadas:

---

### Melhoria 1: Filtro "Apenas transacoes individuais"
Adicionar um toggle/switch na area de filtros da aba Transacoes que, quando ativado, filtra apenas registros com `total_transacoes = 1` (transacoes nao agregadas).

**Arquivo:** `src/hooks/useTransactionSearch.ts`
- Adicionar campo `apenasIndividuais?: boolean` na interface `TransactionSearchParams`
- Quando ativado, adicionar `.eq('total_transacoes', 1)` na query Supabase

**Arquivo:** `src/pages/PesquisasMercado.tsx`
- Adicionar estado `apenasIndividuais` (boolean, default false)
- Adicionar um Switch com label "Apenas transacoes individuais" abaixo dos filtros de area
- Passar o parametro para `useTransactionSearch`

---

### Melhoria 2: Coluna "Qtd. Agregada" nos resultados
Mostrar no card de cada resultado quantas transacoes foram agregadas naquele registro, para o usuario distinguir dados individuais de medias.

**Arquivo:** `src/pages/PesquisasMercado.tsx`
- Na lista de resultados (linha ~652-656), adicionar indicador visual quando `total_transacoes > 1` mostrando que o valor e uma media agregada
- Adicionar um pequeno badge "media de X transacoes" ou icone de agregacao

---

### Melhoria 3: Aviso de dados agregados
Adicionar um banner/alerta informativo permanente na aba de Transacoes explicando a natureza dos dados.

**Arquivo:** `src/pages/PesquisasMercado.tsx`
- Adicionar um `Alert` (componente ja existente) no topo da aba Transacoes com icone de informacao
- Texto: "Os valores exibidos representam medias mensais agregadas pela Prefeitura do Rio de Janeiro, nao transacoes individuais. Valores de area e preco podem estar diluidos quando multiplas transacoes sao agrupadas."
- Incluir dica sobre o filtro de transacoes individuais

---

### Arquivos alterados
1. `src/hooks/useTransactionSearch.ts` -- adicionar parametro `apenasIndividuais` na interface e query
2. `src/pages/PesquisasMercado.tsx` -- adicionar switch, aviso Alert, e indicador de agregacao nos resultados

### Detalhes tecnicos
- O Switch usara o componente `@radix-ui/react-switch` ja instalado (`src/components/ui/switch.tsx`)
- O Alert usara `src/components/ui/alert.tsx` ja existente
- Exportacoes CSV/XLSX tambem incluirao a coluna de agregacao
