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
