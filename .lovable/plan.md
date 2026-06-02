## Problema

Ruas de fronteira (ex.: Rua Escritor Rodrigo Melo Franco) têm o cadastro de bairro alterado pela Prefeitura ao longo do tempo (Barra → Camorim a partir de 2022). Como as queries do motor de avaliação filtram estritamente por `bairro`, transações reais "somem" da análise quando o usuário avalia o imóvel na Barra da Tijuca.

## Solução: Fallback automático cross-bairro por logradouro

Quando uma busca por logradouro dentro do bairro selecionado retorna 0 transações (ou número muito baixo), refazer a mesma busca **sem o filtro de bairro**, mantendo o filtro de logradouro. Se o resultado vier de bairros vizinhos, exibir um aviso de transparência.

Aplicar em dois pontos:

### 1. `src/hooks/useHistoricalTransactionAnalysis.ts`

- Após o loop que busca por `searchCandidates` filtrando `bairro = normalizedBairro`, se `transactions.length === 0` e **não houver `ruasInternas`** (condomínio já é específico), executar uma nova rodada do mesmo loop **sem** o `.ilike('bairro', ...)`.
- Coletar os bairros distintos retornados (campo `bairro` em select expandido) para exibir no aviso.
- Marcar `dataSource: 'logradouro'` (continua sendo dado do logradouro, só que cross-bairro).
- Adicionar ao retorno: `crossBairro: boolean` e `bairrosEncontrados: string[]`.
- Atualizar a chave do cache (`historicalAnalysisCache.ts`) bumping `CACHE_VERSION` para `'v11'` para invalidar entradas antigas.
- Alerta automático: `"ℹ️ Esta rua possui transações registradas em bairros vizinhos (X). Os dados consolidados foram considerados."`

### 2. `src/components/valuation/Step1Location.tsx` — `fetchMarketRows`

- Adicionar parâmetro `allowCrossBairro = true` (default).
- Após a query `logradouro + bairro`, se `logradouroRows.length === 0`, executar nova query **sem** o filtro de bairro mantendo `ilike('logradouro', …)`.
- Se essa segunda busca retornar dados, usar como fonte com `source: 'logradouro'` e propagar uma flag adicional (`crossBairro`) no retorno para o `state` da avaliação.
- O fallback existente para "bairro inteiro" continua como último recurso.

### 3. UI — aviso de transparência

- No componente que exibe a análise histórica (provavelmente `HistoricalTransactionChart` / card de "Histórico de Transações"), quando `crossBairro === true`, mostrar um banner discreto cor âmbar:
  > "Esta rua está cadastrada no ITBI da Prefeitura sob o bairro **Camorim** a partir de 2022 (limite entre bairros). Os dados foram consolidados para refletir o histórico completo."
- Texto genérico parametrizado por `bairrosEncontrados`.

### 4. Sem alteração de schema

Nenhuma migration. Apenas mudanças em hooks/components e bump do cache version.

## Critérios de aceite

- Avaliando "Rua Escritor Rodrigo Melo Franco" em Barra da Tijuca, o gráfico de histórico passa a mostrar transações de 2020 a 2026 (incluindo 2023/2024/2025 que estão sob Camorim).
- Aviso de transparência aparece informando o cross-bairro.
- Buscas em ruas estritamente de um único bairro continuam funcionando idênticas (zero regressão).
- Cache antigo é invalidado automaticamente.

## Fora de escopo

- Tabela de overrides manuais por logradouro (opção 1 descartada).
- Reclassificação retroativa de registros ITBI no banco.
- Mudança em outras telas (Pesquisa de Mercado, Territorial, KPIs do Dashboard) — podem ser feitas em iteração futura se o usuário pedir.
