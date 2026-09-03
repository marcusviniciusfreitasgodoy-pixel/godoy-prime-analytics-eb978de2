# Roteiro de alinhamento da metodologia ITBI

## Objetivo

Fazer com que a plataforma que gera o relatório de Pesquisa de Mercado produza a mesma amostra, os mesmos indicadores e a mesma interpretação adotados pelo Godoy Prime Analytics.

## 1. O significado de cada linha

A tabela `itbi_transactions` não contém uma linha por escritura individual. Cada linha é um registro agregado da Prefeitura, normalmente por combinação de:

- logradouro;
- período de referência;
- uso/tipologia;
- demais características de agrupamento da fonte.

O campo `total_transacoes` é o peso da linha: informa quantas escrituras reais compõem aquele registro agregado.

Portanto, no relatório devem existir dois números separados:

- **Registros ITBI (agregações mensais):** `COUNT(*)` das linhas que passaram pelos filtros;
- **Escrituras Reais (transações):** `SUM(total_transacoes)` das mesmas linhas.

A contagem de linhas nunca deve ser apresentada como o número de transações/escrituras.

## 2. Filtros mínimos da amostra

Aplicar os mesmos filtros antes de qualquer cálculo:

```sql
uso = 'Residencial'
percentual_transferido >= 90
valor_m2 IS NOT NULL
```

Para uma pesquisa com chave de bairro:

```sql
bairro = 'BARRA DA TIJUCA'
```

O texto do bairro deve ser normalizado para comparação consistente (maiúsculas, sem diferenças de acentuação e com espaços normalizados). O logradouro deve usar o mesmo normalizador e as mesmas variantes de grafia nos dois sistemas.

Se houver filtros de tipologia, área, valor ou período, eles devem ser aplicados na mesma ordem lógica e com os mesmos limites inclusivos:

- tipologia: correspondência equivalente entre os sistemas;
- área mínima: `area_m2 >= mínimo`;
- área máxima: `area_m2 <= máximo`;
- valor mínimo: `valor_transacao >= mínimo`;
- valor máximo: `valor_transacao <= máximo`;
- data inicial: `data_transacao >= início`;
- data final: `data_transacao <= fim`.

O período precisa ser exibido no relatório com as datas efetivamente usadas, não apenas com o ano selecionado.

## 3. Cálculos corretos

### 3.1 Média ponderada do R$/m²

Para cada registro `i`, usar `valor_m2_i` e `total_transacoes_i`:

```text
média_ponderada_m2 =
  SUM(valor_m2_i × total_transacoes_i)
  / SUM(total_transacoes_i)
```

Não usar `AVG(valor_m2)` sem peso.

Uma linha com 1 escritura e uma linha com 30 escrituras não podem ter a mesma influência no resultado.

### 3.2 Mediana e percentis ponderados

Ordenar os registros por `valor_m2` e considerar `total_transacoes` como peso. O cálculo deve ser equivalente a expandir cada linha pelo número de escrituras, sem necessariamente materializar o array.

Usar essa distribuição ponderada para:

- mediana: posição central;
- mínimo estatístico: P10;
- máximo estatístico: P90.

Não calcular mediana/percentis sobre a quantidade de linhas, pois isso dá peso incorreto às agregações.

### 3.3 Volume financeiro

Se o objetivo for estimar o volume de negócios do grupo, usar:

```text
volume_estimado = SUM(valor_transacao_i × total_transacoes_i)
```

O `valor_transacao` da linha é o valor médio do grupo agregado; não deve ser somado uma única vez ignorando o peso.

### 3.4 Indicadores temporais

Médias mensais e anuais também devem ser ponderadas por `total_transacoes`. Para cada mês/ano:

```text
média_m2_do_período =
  SUM(valor_m2_i × total_transacoes_i)
  / SUM(total_transacoes_i)
```

Variação, valorização e CAGR devem comparar essas médias ponderadas, usando o mesmo período inicial e final nos dois sistemas.

## 4. Critérios de outlier

Os dois sistemas precisam usar o mesmo método, os mesmos parâmetros e a mesma ordem de aplicação.

Metodologia adotada pelo Analytics:

1. aplicar o cinto de segurança de R$/m² por bairro e tipologia;
2. para pesquisa específica de logradouro, calibrar piso e teto pela amostra da própria rua quando houver amostra suficiente;
3. aplicar o corte MAD em escala logarítmica quando houver linhas suficientes;
4. calcular P10, mediana, P90 e média ponderada apenas sobre os sobreviventes;
5. preservar no metadado quantas linhas e escrituras foram descartadas.

O desenvolvedor deve confirmar explicitamente se a plataforma externa:

- aplica algum piso/teto de R$/m²;
- usa IQR, MAD, percentil ou nenhum corte;
- aplica o corte antes ou depois dos filtros de tipologia/área/período;
- calcula o corte ponderando por `total_transacoes`.

Diferenças em qualquer desses pontos alteram a amostra e os resultados.

## 5. O que explica o relatório encaminhado

No relatório da plataforma foram exibidos:

- **397 registros agregados**;
- **2.267 escrituras reais**.

Isso é internamente plausível: cada linha agrega, em média, aproximadamente 5,7 escrituras.

O ponto a corrigir é a nomenclatura: as 397 linhas não devem ser chamadas simplesmente de “397 transações”. O número correto de negócios representados pela amostra é 2.267 escrituras.

Na comparação com o Analytics, também é obrigatório conferir se os dois relatórios usam exatamente:

- a mesma data inicial e final;
- o mesmo bairro normalizado;
- a mesma tipologia;
- os mesmos limites de área e valor;
- o mesmo critério de percentual transferido;
- a mesma regra de outlier;
- a mesma ponderação por escrituras.

Mesmo vindo da mesma base, qualquer diferença nesses itens produz amostras e médias diferentes.

## 6. Ajustes obrigatórios na plataforma externa

1. Renomear a coluna `total_transacoes` para **Escrituras** ou **Escrituras no registro**.
2. Renomear o resumo de `Total de transações` para **Escrituras Reais (transações)**.
3. Criar um resumo separado chamado **Registros ITBI (agregações mensais)** com a contagem de linhas.
4. Somar `total_transacoes` para informar escrituras reais.
5. Ponderar média, mediana, percentis, médias mensais/anuais e volume financeiro por `total_transacoes`.
6. Garantir que exportações CSV/XLSX/PDF carreguem os dois números separados.
7. Exibir no relatório os filtros efetivos, as datas exatas, o método de outlier, o número de linhas e o número de escrituras antes/depois do corte.
8. Executar uma consulta de auditoria lado a lado com os mesmos filtros e comparar `COUNT(*)`, `SUM(total_transacoes)`, média simples e média ponderada.

## 7. Consulta de auditoria recomendada

```sql
SELECT
  COUNT(*) AS registros_itbi_agregados,
  SUM(COALESCE(total_transacoes, 1)) AS escrituras_reais,
  AVG(valor_m2) AS media_simples_linhas,
  SUM(valor_m2 * COALESCE(total_transacoes, 1))
    / NULLIF(SUM(COALESCE(total_transacoes, 1)), 0) AS media_ponderada_m2,
  MIN(data_transacao) AS data_inicial,
  MAX(data_transacao) AS data_final
FROM itbi_transactions
WHERE bairro = 'BARRA DA TIJUCA'
  AND uso = 'Residencial'
  AND percentual_transferido >= 90
  AND valor_m2 IS NOT NULL
  AND data_transacao >= '2025-01-01'
  AND data_transacao <= '2026-06-14';
```

A consulta deve ser executada também na plataforma externa, usando a mesma base ou uma exportação byte a byte da mesma amostra. Os resultados de `registros_itbi_agregados` e `escrituras_reais` devem coincidir antes de comparar qualquer preço.

---

## 8. Caso de referência auditado: Avenida do Pepe (Barra da Tijuca)

Este é o caso mais didático encontrado até agora, porque **os dois sistemas exibiram o mesmo número "39"** e mesmo assim chegaram a preços de m² com 17% de diferença. A auditoria linha a linha na base ITBI mostrou que o "39" significa coisas diferentes em cada sistema.

### 8.1 Números exibidos

| Sistema | "Vendas" exibidas | R$/m² exibido |
|---|---|---|
| Godoy Prime Analytics | 39 | 18.251 |
| Plataforma externa (Prime Circle) | 39 | 15.789,31 |

### 8.2 O que a base efetivamente contém

Consulta em `itbi_transactions`, logradouro `AVN DO PEPE`, bairro `BARRA DA TIJUCA`, `uso = 'Residencial'`, `percentual_transferido = 100`:

| Janela | Linhas ITBI | Escrituras (`SUM(total_transacoes)`) | Média simples | Média ponderada | Σvalor / Σárea |
|---|---|---|---|---|---|
| Últimos 24 meses | 13 | 42 | 18.195 | **18.533** | 18.306 |
| Desde 01/2024 | 18 | 58 | 17.705 | 17.991 | 17.884 |
| Desde 01/2023 | 22 | 69 | 17.358 | 17.642 | 17.544 |
| **Série completa 2020–2026** | **39** | **115** | 15.269 | **15.673** | **15.887** |

### 8.3 Diagnóstico

1. **O "39" da plataforma externa é a contagem de LINHAS ITBI da série completa 2020–2026**, não o número de vendas. Essas 39 linhas representam **115 escrituras**. A liquidez real está subdimensionada em cerca de 3x.
2. **O "39" do Analytics são escrituras** (`SUM(total_transacoes)`) dentro da janela de 24 meses. A coincidência numérica é acidental: as duas plataformas mediram grandezas diferentes que por acaso deram o mesmo valor.
3. **O R$ 15.789,31 da plataforma externa cai exatamente na faixa da série completa de 6 anos** (15.673 a 15.887, conforme o detalhe de ponderação e arredondamento). Ou seja, o preço exibido está diluído por transações de 2020 a 2022, quando a Avenida do Pepe negociava entre R$ 10.407 e R$ 13.664/m². Nos últimos 24 meses a mesma rua negocia entre R$ 13.039 e R$ 22.193/m².
4. **Conclusão**: para precificação de mercado atual, o número correto é o da janela de 24 meses (R$ 18.533/m² ponderado, 42 escrituras). O número externo descreve a média histórica de 6 anos, que não serve para avaliar um imóvel hoje.

### 8.4 Teste de confirmação a ser executado pelo desenvolvedor

Executar e devolver o resultado exato:

```sql
SELECT
  COUNT(*)                                   AS linhas_itbi,
  SUM(COALESCE(total_transacoes, 1))         AS escrituras,
  MIN(data_transacao)                        AS data_min,
  MAX(data_transacao)                        AS data_max,
  AVG(valor_m2)                              AS media_simples,
  SUM(valor_m2 * COALESCE(total_transacoes, 1))
    / NULLIF(SUM(COALESCE(total_transacoes, 1)), 0) AS media_ponderada
FROM itbi_transactions
WHERE bairro = 'BARRA DA TIJUCA'
  AND logradouro ILIKE '%PEPE%'
  AND uso = 'Residencial'
  AND percentual_transferido >= 90
  AND valor_m2 IS NOT NULL;
```

Se o retorno for **39 linhas / 115 escrituras / data_min = 2020-01-15**, está confirmado que a plataforma externa (a) não filtra período e (b) conta linhas como se fossem vendas.

### 8.5 Correções decorrentes na plataforma externa

1. **Aplicar uma janela temporal explícita** (padrão recomendado: 24 meses) e exibi-la no cabeçalho do relatório, com data inicial e final.
2. **Nunca rotular contagem de linhas como "vendas" ou "transações"** — usar "Registros ITBI (agregações mensais)" para linhas e "Escrituras" para `SUM(total_transacoes)`.
3. **Ponderar o preço médio por escrituras**, conforme a seção 3.
4. **Exibir os dois números lado a lado** em toda tela e todo export, para que a diferença entre linhas e escrituras seja auditável pelo usuário.

---

## 9. Correções já aplicadas no Godoy Prime Analytics

Registro do que foi corrigido do nosso lado, para que a comparação seja feita contra a versão atual e não contra prints antigos.

| Local | Problema | Correção |
|---|---|---|
| `Dashboard.tsx` | Média de m² calculada como média simples das linhas | Média ponderada por `total_transacoes` |
| `AdvancedSearchReport.tsx` | Média simples e rótulos ambíguos | Média ponderada + rótulos "Registros ITBI (agregações mensais)" e "Escrituras Reais (transações)" |
| `useStreetComparison` | Comparativo de ruas com média simples | Média ponderada por escrituras |
| Edge function `public-itbi-stats` | Estatísticas públicas com média simples | `media_ponderada_m2` e `mediana_ponderada_m2`; outlier por MAD; piso/teto calibrados por logradouro com fallback para bairro |
| `useMicrobairroDetalhado` (página Microregiões) | (a) média simples por rua; (b) valor geral calculado como `(média_apartamento + média_casa) / 2`, dando 50% de peso a amostras de tamanhos muito diferentes | Média ponderada por escrituras em todas as tipologias; valor geral passa a ser a média ponderada de toda a amostra da rua |
| Página Microregiões (subtítulo) | Exibia "(2025)" enquanto a consulta usava os últimos 24 meses | Subtítulo passa a declarar "últimos 24 meses (valores ponderados por escrituras)" |
| Exports (`exportUtils.ts`), `SearchTools.tsx`, `PesquisasMercado.tsx`, `EmbeddedAdvancedSearch.tsx` | Colunas "Transações" / "Qtd Trans." ambíguas | Renomeadas para "Escrituras" / "Escrituras no registro" |

Efeito medido na Barra da Tijuca, últimos 24 meses: a referência de bairro passou de R$ 10.376/m² (média simples) para R$ 11.190/m² (média ponderada) — cerca de 8% de diferença, que se amplia em ruas onde poucas linhas concentram muitas escrituras.

---

## 10. Checklist de aceite da correção

O ajuste só pode ser considerado concluído quando, para a **mesma configuração de busca**, os dois sistemas devolverem valores idênticos em:

- [ ] data inicial e data final efetivas;
- [ ] `COUNT(*)` de registros ITBI;
- [ ] `SUM(total_transacoes)` de escrituras;
- [ ] quantidade de logradouros distintos;
- [ ] média ponderada `Σ(valor_m2 × total_transacoes) / Σ(total_transacoes)`;
- [ ] mediana ponderada e percentis P10/P90 ponderados;
- [ ] volume financeiro `Σ(valor_transacao × total_transacoes)`;
- [ ] método de outlier, piso e teto aplicados;
- [ ] lista dos registros excluídos pelo filtro de outlier;
- [ ] uso e tipologia considerados.

Caso de teste obrigatório: **Avenida do Pepe, Barra da Tijuca, Residencial, últimos 24 meses** deve retornar 13 linhas ITBI, 42 escrituras e média ponderada de aproximadamente R$ 18.533/m².
