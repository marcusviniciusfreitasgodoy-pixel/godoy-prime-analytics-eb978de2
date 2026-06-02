# Corrigir histórico cross-bairro por ano

## Problema confirmado

O gráfico de Rua Escritor Rodrigo Melo Franco mostra dados em 2021/2022 mas zero em 2023/2024/2025. A causa é que o fallback cross-bairro implementado anteriormente só dispara quando **todas as transações** do logradouro são zero. Como existem registros em Barra da Tijuca em 2021/2022, o fallback nunca é acionado e os anos 2023–2025 (que ficaram cadastrados em Camorim) somem.

Confirmado na base ITBI:

```
2021 → Barra da Tijuca (128 transações)
2022 → Camorim (105 transações)
2023 → Camorim (125 transações)
2024 → Camorim (36 transações)
2025 → Camorim (439 transações)
```

A lógica atual descarta 2022–2025 porque já encontrou algo em 2021 sob Barra.

## Solução: união cross-bairro sempre que a busca for por logradouro específico

Quando o usuário seleciona uma rua específica (não condomínio), o nome do logradouro já é discriminante o bastante — não há necessidade de filtrar por bairro. Vamos buscar a rua **em todos os bairros** e marcar como cross-bairro quando houver registros em bairros diferentes do selecionado.

### Mudanças

**1. `src/hooks/useHistoricalTransactionAnalysis.ts`**

- No bloco `else` (busca por logradouro, sem `ruasInternas`), remover o `.ilike('bairro', normalizedBairro)` da query principal. Sempre selecionar a coluna `bairro` no SELECT.
- Após receber `data`, calcular `bairrosEncontrados` = lista única dos bairros presentes, excluindo o `normalizedBairro` selecionado.
- Setar `crossBairro = bairrosEncontrados.length > 0`.
- Remover o bloco de "FALLBACK CROSS-BAIRRO" separado (linhas ~208-244), pois agora é inerente à busca.
- Manter o `dataSource = 'logradouro'` e o fallback para bairro inteiro quando `transactions.length < fallbackThreshold`.

**2. `src/components/valuation/Step1Location.tsx`** (função `fetchMarketRows`)

- Aplicar a mesma lógica: quando busca por logradouro (sem `ruasInternas`), não filtrar por bairro. Marcar `source = 'logradouro'` e expor `crossBairro` quando aplicável.
- Manter o fallback para bairro inteiro quando o logradouro não retornar nada.

**3. `src/utils/historicalAnalysisCache.ts`**

- Bump `CACHE_VERSION` de `'v11'` para `'v12'` para invalidar cache de usuários que já viram dados truncados.

**4. `src/components/valuation/HistoricalAnalysisChart.tsx`**

- Nenhuma mudança estrutural — o banner âmbar já existe e será exibido sempre que `crossBairro` for true e `bairrosEncontrados` tiver entradas.
- Ajustar texto do banner para refletir "União de dados": "Esta rua possui registros ITBI também em [bairros]. Os dados foram unificados para completar o histórico." (em vez de "registrada em outro bairro").

## Critério de aceitação

- Selecionando "Rua Escritor Rodrigo Melo Franco" + "Barra da Tijuca" no avaliador, o gráfico passa a mostrar transações em 2021 (Barra) + 2022, 2023, 2024, 2025 (Camorim, unificados).
- Banner âmbar indica que houve união com Camorim.
- Ruas que existem apenas em um bairro continuam funcionando normalmente (sem banner).

## Fora de escopo

- Outras telas (Pesquisa de Mercado, Inteligência Territorial, KPIs do Dashboard).
- Reclassificação retroativa do ITBI.
- Tabela de overrides manual de bairros.
