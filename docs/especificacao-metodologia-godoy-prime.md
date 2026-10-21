# Especificação de Metodologia ITBI — Godoy Prime Analytics

**Versão 3.0, consolidada (2026-09-03).** Substitui e unifica dois documentos escritos no mesmo dia: a "Especificação de Metodologia ITBI, documento de handoff" (v1.0, gerada via Lovable) e a "Especificação da lógica estatística" (gerada na auditoria). Nenhum dos dois continua válido separadamente. A v2.1 reescreveu a seção 15 como plano de ação. A v2.2 incorpora a segunda rodada de consultas (2026-09-03, 15h): recarga da base com perda da geocodificação, baselines da seção 16 reexecutados, spread P90 × P95 medido, corte do cinto de 3 anos por par, e as correções decorrentes (sync preservando geocodificação, limiares de spread recalibrados para P95). A v2.3 registra a terceira rodada: geocodificação recuperada (99,6 %), base no último mês da Prefeitura, cinto regenerado em Centro, Flamengo, Santo Cristo e Glória, trilha de auditoria da carga completa e o achado do filtro de bairro sem acento nas consultas de calibração. A v2.4 regenera o cinto inteiro (59 pares com 100 ou mais escrituras em 3 anos, consulta 7.4 sem filtro por nome) e registra a consulta 7.10, que fecha a decisão do fallback por raio. A v2.5 fecha o cinto: os 18 pares de amostra pequena regenerados com a consulta 7.4b (janela de 5 anos e regra de largura mínima), Barra Olímpica removida da tabela e a hipótese do filtro de ingestão de R$ 100 mil registrada como pendência 12. A v2.6 confirma essa hipótese com a consulta 7.11 e a contagem na API da Prefeitura, baixa o piso de valor da ingestão para R$ 30 mil num módulo compartilhado pelas duas cargas, corrige a carga diária (que não gravava peso nem percentual) e deixa escrito o protocolo da recarga que ainda falta. A v2.7 registra a recarga das 17:12 com o piso novo (141.976 escrituras, Santa Cruz de 85 para 266), os dois defeitos que ela expôs (chave natural repetida derrubando lotes inteiros; `etl_log` sobrescrito no encerramento), a correção de ambos e a decisão de manter o MAD em 2,5/3,0 diante da consulta 7.3. A v2.8 registra a carga completa sem lotes perdidos (38.197 linhas, 163.015 escrituras, cobertura de 90 % das escrituras da API, com a diferença inteiramente explicada pelas rejeições), transforma a geração do cinto num script reproduzível (`bun run cinto`), unifica a consulta 7.4 e abre três pendências: Barra Olímpica de volta à base, cinto ainda calibrado na base anterior e o descarte de transferências parciais na carga. A v2.9 regenera o cinto pela primeira vez por script, a partir da 7.4 unificada sobre a base completa: 144 pares (66 em 3 anos, 78 em 5 anos com largura mínima), 132 pares fora por amostra, Barra Olímpica com par próprio; e fecha a composição das rejeições nos quatro bairros conferidos. A v3.0 muda o motor (`ENGINE_VERSION` 4): salvaguarda de bimodalidade no corte de outliers, decidida com o 7.3 par a par; corrige o site público, que não casava bairro com acento; e registra a contradição sobre Del Castilho, que ainda não tem explicação.

**Código descrito:** `main` após o PR #24 (2026-09-03), `ENGINE_VERSION` 4. O export "código atual" recebido em 2026-09-03 é idêntico a este commit no código-fonte; só os arquivos de documentação diferem, por ter sido gerado antes da consolidação.
**Finalidade:** permitir que o desenvolvedor da Prime Circle reproduza, número a número, o que o Analytics calcula em consultas, avaliações e pesquisas de mercado, e localize exatamente onde os dois sistemas divergem.

Como ler: as seções 1 a 13 são descritivas (o que o código faz, não o que deveria fazer). A seção 14 traz o roteiro de comparação e o checklist de aceite; a 15, as ressalvas do auditor com o plano de ação para os dois sistemas; a 16, os casos de conferência com números reais da base; os apêndices, as constantes, a tabela completa do cinto de outliers e os arquivos de referência.

Convenções: referências `arquivo:linha` apontam para o commit acima. "Escrituras" = `SUM(total_transacoes)`. "Registros" ou "linhas" = `COUNT(*)`. Toda fórmula "ponderada" usa `total_transacoes` como peso, com `max(1, total_transacoes)` quando nulo.

Duas implementações só produzem o mesmo número quando concordam em quatro coisas, nesta ordem: o que é uma linha, quais linhas entram, qual é o peso de cada linha e qual estatística é aplicada. Este documento fixa as quatro.

---

## 1. A base: o que é uma linha de `itbi_transactions`

Cada linha é um **agregado mensal da Prefeitura do Rio** por logradouro × mês × uso × tipologia, não uma escritura. Colunas relevantes:

| Coluna | Significado | Origem |
|---|---|---|
| `logradouro`, `logradouro_norm` | nome como veio da Prefeitura e nome normalizado pela função SQL `normalizar_logradouro_busca` | ingestão |
| `bairro` | maiúsculas, com acento como na fonte (ex.: `BARRA DA TIJUCA`, `FREGUESIA (JACAREPAGUÁ)`) | ingestão |
| `data_transacao` | data de referência do agregado mensal, definida na ingestão (seção 12) | ingestão |
| `uso` | enum; o motor usa só `Residencial` | ingestão |
| `tipologia` | `Apartamento`, `Casa` e outras; coberturas e flats são agregados como `Apartamento` pela função `classificarTipologia` do importador | ingestão |
| `valor_transacao` | **valor médio** das escrituras do grupo (R$) | Prefeitura |
| `area_m2` | **área média** das escrituras do grupo | Prefeitura |
| `valor_m2` | `valor_transacao / area_m2` do grupo (razão de médias, não média de razões) | ingestão |
| `total_transacoes` | número de escrituras do grupo (**peso**) | Prefeitura |
| `percentual_transferido` | média do percentual transferido no grupo; o motor exige `>= 90` | Prefeitura |
| `lat`, `lng`, `geom` | coordenadas do logradouro (geocodificação posterior; nem toda linha tem) | edge functions de geocodificação |
| `microbairro` | classificação territorial opcional | classify-microbairros |

Consequências que todo cálculo respeita (ou deveria):

1. **Contar linhas subestima o mercado.** A mediana de escrituras por linha na base é 3; contar linhas em vez de somar `total_transacoes` reduz a liquidez aparente em cerca de 3 a 4 vezes.
2. **Média de `valor_m2` sem peso está errada.** Uma linha com 30 escrituras e uma com 1 não podem pesar igual.
3. **Percentis e medianas são calculados sobre a distribuição ponderada**, equivalente a repetir cada linha `total_transacoes` vezes.

Detalhes de ingestão (fonte, filtros de carga, normalização e geocodificação) estão na seção 12.

**Regra de ouro.** Linha ≠ transação. `COUNT(*)` subestima o mercado em cerca de 4× (30.011 linhas ↔ 125.867 escrituras na base de 2026-09-03). Todo relatório exibe dois números separados: "Registros ITBI (agregações mensais)" = `COUNT(*)` e "Escrituras Reais (transações)" = `SUM(total_transacoes)`. Consequência direta: qualquer média, mediana ou percentil de preço calculado sem peso está errado. É o erro número 1 na comparação entre sistemas.

### 1.1 Snapshot da base usado nos casos de conferência

| Métrica | 2026-09-03, manhã (v1.0) | 2026-09-03, 15h (recarga) | 2026-09-03, 17h12 (piso de R$ 30 mil) | 2026-09-03, 17h40 (carga `34f03d7c`, sem lotes perdidos) |
|---|---|---|---|---|
| Linhas em `itbi_transactions` | 30.011 | 31.472 | **33.647** (faltam cerca de 5.000 de 10 lotes perdidos, pendência 15) | **38.197** |
| Escrituras (`SUM(total_transacoes)`) | 125.867 | 134.555 | **141.976** | **163.015** (90,0 % das 181.163 da API; o resto é rejeição por percentual, faixas e duplicatas) |
| Período coberto | 15/01/2020 a 15/05/2026 | 15/01/2020 a 15/07/2026 | 15/01/2020 a **15/07/2026** | 15/01/2020 a 15/07/2026 |
| Linhas com `uso = 'Residencial'` | 100 % | 100 % | 33.619 residenciais | n/d |
| Linhas com `geom` | 30.011 | **0** na recarga; **31.369 (99,6 %)** após o backfill das 15:59 (30.137 por `logradouros_geo`, 1.232 por fallback de logradouro sem bairro, 131 nulas em ruas de volume marginal) | **33.104 de 33.619 residenciais (99,1 % das escrituras)** após novo backfill (31.820 + 1.311 fallback, 516 sem geom) | **37.402 (97,9 %)**; 795 sem geom, quase todas linhas novas de ruas sem entrada em `logradouros_geo` |
| Piso de valor na ingestão | desconhecido (carga anterior a 2026-06) | R$ 100 mil | **R$ 30 mil** |

**Incidente de 2026-09-03.** A tabela foi truncada e reimportada entre 15:06 e 15:08 UTC, sem registro em `etl_log`, trazendo dois meses novos de dados e apagando a geocodificação de todas as linhas (`geom`, `lat`, `lng` nulos). Causa: a sincronização completa (`sync-itbi-prefeitura` com `clearExisting`) apagava as linhas do período antes de reinserir. A função foi corrigida no mesmo dia (seção 12) e reimplantada; as coordenadas foram recuperadas pelo backfill a partir de `logradouros_geo` (99,6 %). Último mês na base e na Prefeitura: 07/2026 (`detect-latest-itbi-month`, `isOutdated: false`). Quem disparou a carga não pôde ser determinado: a função não gravava em `etl_log` e os logs de edge function do período já tinham expirado; desde o PR #17 toda execução grava usuário, modo, `clearExisting` e período em `etl_log`, e o botão de sincronização nasce com a recarga desligada. Os números da seção 16 foram reexecutados sobre a base recarregada e são os vigentes; os da v1.0 ficam registrados entre parênteses para rastreabilidade.

**Segunda ressalva sobre esta base (17h).** A recarga das 15h aplicou o filtro de ingestão que descarta transações abaixo de R$ 100 mil (seção 12), e a carga que gerou a base da manhã provavelmente não. Na Zona Oeste isso apagou até metade do mercado (pendência 12 da seção 15.1: Santa Cruz ficou com 85 escrituras em 5 anos e a Prefeitura tem outras 186 entre R$ 50 mil e R$ 100 mil). O piso foi corrigido no código para R$ 30 mil e a base foi recarregada às 17:12 UTC (`etl_log` `435e241d`, autor identificado, `docs/calibracao/base-2026-09-03-recarga-30mil.md`): a cauda barata voltou (Santa Cruz Apartamento de 85 para 266 escrituras em 5 anos; Campo Grande Casa com 659; Irajá Casa com P1 de R$ 36 mil). Mas 10 lotes, cerca de 5.000 linhas concentradas no fim do arquivo, falharam por chave natural repetida (pendência 15) e ainda não estão na base. Até a carga ser repetida com o PR #21, todo número desta especificação para bairros baratos (Santa Cruz, Campo Grande, Guaratiba, Inhoaíba, Paciência, Bangu, Cosmos, e casas em Irajá e Engenho de Dentro) descreve uma amostra truncada por cima do mercado real. Os casos da seção 16 (Barra, Copacabana, Tijuca, Botafogo, Ipanema, Leblon) não estão nessa lista; Centro, com kitnets, pode estar.

**Terceira nota (17h40).** A carga completa repetida com o PR #21 entrou sem erro (`etl_log` `34f03d7c`: 0 lotes com erro, 291 duplicatas de chave mescladas, `limites_ingestao.valorMin` 30.000, usuário registrado). A base passou a ter 38.197 linhas e 163.015 escrituras, e a conferência bairro a bairro contra a API (`docs/calibracao/cobertura-api-x-base-2026-09-03.md`) fecha a conta: os 5.153 agregados que faltam são exatamente 4.428 rejeitados por percentual < 90, 434 fora das faixas e 291 duplicatas somadas. Barra Olímpica, Lapa, Jabour e Acari, os últimos bairros da ordem da API, estão presentes. É a primeira base do dia que descreve o mercado inteiro. Duas consequências ainda abertas: o cinto (Apêndice B) continua calibrado na base anterior até a consulta 7.4 unificada rodar (pendência 18), e Barra Olímpica voltou a existir como bairro próprio, com 581 escrituras em 3 anos, desfazendo em silêncio a reclassificação da migration de maio (pendência 17).

---

## 2. Primitivas comuns (módulo compartilhado)

Arquivo: `supabase/functions/_shared/itbiMarketStats.ts`, reexportado para o app por `src/utils/itbiMarketStats.ts`. Roda idêntico no navegador e nas edge functions. Testes em `src/utils/__tests__/itbiMarketStats.test.ts`.

### 2.1 Constantes

| Constante | Valor | Uso |
|---|---|---|
| `ENGINE_VERSION` | 4 | gravado nos metadados de cada avaliação (4 desde a salvaguarda de bimodalidade, 2026-09-03) |
| `MAX_OUTLIER_CUT_SHARE` | 0,15 | corte MAD/IQR que removeria mais do que isso das escrituras é ignorado (amostra bimodal) |
| `WINDOW_MONTHS_OPTIONS` | 12, 24, 36, 48, 60 | opções de janela móvel |
| `DEFAULT_WINDOW_MONTHS` | **12** | janela padrão da avaliação e do site público |
| `MAX_WINDOW_MONTHS` | 60 | a consulta ao banco traz sempre 60 meses; o recorte é feito em memória |
| `MIN_ROWS_FOR_TIPOLOGIA` | 8 | abaixo disso o filtro de tipologia é relaxado |
| `MIN_ROWS_SCOPE` | 8 | abaixo disso um escopo (rua, raio) ou uma janela é "insuficiente" |
| `MIN_ROWS_FOR_MAD` | 8 | mínimo de linhas para aplicar o corte MAD |
| `MAD_K_INF` / `MAD_K_SUP` | 2,5 / 3,0 | cercas do MAD em escala log (inferior mais rigorosa) |
| `MIN_VALUES_FOR_IQR` | 4 | mínimo de escrituras para aplicar Tukey |
| `RANGE_LOW_P` / `RANGE_HIGH_P` | 0,10 / **0,95** | percentis da faixa exibida (mínimo e máximo) |
| `MAX_ROWS` | 30000 | teto da amostra, lida em páginas de 1.000 por `_shared/fetchPaged.ts` (desde 2026-10-21) |
| `MIN_ESCRITURAS_INDEX_QUARTER` | 30 | trimestres do índice com menos escrituras são ignorados |
| `MAX_DEFLATION_FACTOR` | 2 | fator de correção temporal limitado a [0,5; 2] |
| `SOURCE_PENALTY` | rua 0, raio 100 m 5, raio 300 m 10, bairro 15 | penalidade de confiança por origem da amostra |
| `WINDOW_YEARS`, `MIN_ROWS_CLOSED_WINDOW` 30, `MIN_TX_CLOSED_WINDOW` 100 | legado | janela por anos fechados; **não é mais usada** por nenhuma tela desde 2026-09-03 |

### 2.2 Peso e somas

```
peso(linha)        = max(1, total_transacoes ?? 1)
escrituras(linhas) = Σ peso(linha)
```

### 2.3 Quantis ponderados

Entrada: pares `(v, w)` ordenados por `v`. `N = Σ w`.

- **Quantil posicional** `weightedQuantile(items, p)`: `k = min(N-1, max(0, floor(N·p)))`; devolve o `v` do primeiro item cuja soma acumulada de pesos ultrapassa `k`. Equivale a expandir cada linha `w` vezes e pegar o elemento de índice `floor(N·p)` (0-based). Usado para P10 e P95.
- **Mediana ponderada** `weightedMedian`: se `N` ímpar, elemento de índice `floor(N/2)`; se par, média dos elementos `N/2 - 1` e `N/2` da sequência expandida.
- **Média ponderada** `weightedMean`: `Σ v·w / Σ w`.

Transformação opcional (`transform`) permite calcular em `ln(v)`; é usada pelo MAD.

#### 2.3.1 Equivalentes SQL de conferência

Média ponderada:

```sql
SELECT ROUND(
  SUM(valor_m2 * GREATEST(1, COALESCE(total_transacoes,1)))
  / SUM(GREATEST(1, COALESCE(total_transacoes,1)))
) AS media_ponderada
FROM itbi_transactions WHERE ...;
```

Magnitude do erro se a ponderação for omitida (12 meses, base recarregada de 2026-09-03): Barra da Tijuca, ponderada R$ 11.995/m² contra simples R$ 10.941/m² (+9,6 %); Jacarepaguá, 7.221 contra 6.833 (+5,7 %); Centro, 6.970 contra 6.526 (+6,8 %). Tabela completa no caso 4 da seção 16.

Mediana e percentis (expansão explícita por peso):

```sql
WITH base AS (
  SELECT valor_m2, GREATEST(1, COALESCE(total_transacoes,1)) AS w
  FROM itbi_transactions WHERE ...
), expandida AS (
  SELECT valor_m2 FROM base, generate_series(1, w)
)
SELECT percentile_cont(0.50) WITHIN GROUP (ORDER BY valor_m2) AS mediana,
       percentile_cont(0.10) WITHIN GROUP (ORDER BY valor_m2) AS p10,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY valor_m2) AS p95
FROM expandida;
```

> Nota: `percentile_cont` interpola; a implementação do motor é posicional. Em amostras grandes a diferença é desprezível; em amostras pequenas pode haver desvio de poucos R$/m². Para bater dígito a dígito, replicar o pseudocódigo acima, não o `percentile_cont`.

### 2.4 Janela móvel (vigente)

```
buildRollingWindow(meses, hoje):
  start = hoje - meses (mesmo dia, UTC)   # ex.: 12 meses em 2026-09-03 → 2025-09-03
  end   = hoje
selectRollingWindowRows(linhas, mesesSolicitados):
  m = normalizar(mesesSolicitados)   # fora de {12,24,36,48,60} → 12
  para cada opção o >= m em ordem crescente:
      subset = linhas com start(o) <= data_transacao <= hoje
      se |subset| >= MIN_ROWS_SCOPE (8 linhas): devolve subset, janelaMeses=o, expandida=(o != m)
  se nenhuma opção atingiu 8 linhas: devolve o subset de 60 meses (o último tentado), expandida=true
```

Observações: o critério de suficiência da janela é **8 linhas agregadas**, não escrituras. `ano_corrente_incluido` é sempre `true` na janela móvel. A consulta ao banco usa sempre 60 meses (`buildRollingWindow(MAX_WINDOW_MONTHS)`) e o recorte é em memória, então trocar a janela na tela não refaz a consulta.

### 2.5 Cinto de segurança de R$/m² (piso e teto)

**Regra vigente desde 2026-10-22 (piso P0,5).** Tabela gerada, nunca editada à mão: `supabase/functions/_shared/outlierLimits.ts` (constantes entre os marcadores `<cinto:constantes>` e `OUTLIER_LIMITS_TABLE`), regras em `_shared/outlierLimitsGen.ts`, carga do banco em `docs/calibracao/cinto-<data>.sql`.

**Base da calibração (consulta 7.4).** Uma linha de `itbi_escrituras` é uma escritura, sem expansão por peso. Entram `aceita OR motivo_rejeicao = 'fora_do_cinto'`, para o cinto não se encolher a cada recalibração. Bairro `DESCONHECIDO` fica fora. Apartamento e Casa usam só uso Residencial; Comercial usa só uso Comercial. Cada valor é corrigido ao último trimestre de `itbi_price_index`: `valor_m2 * exp(ln_mediana_referencia - ln_mediana_trimestre)`. Percentis contínuos sobre escrituras individuais, nas janelas de 3 e 5 anos.

**Regra por par bairro × tipologia:**

- 200 ou mais escrituras em 3 anos: piso = round(P0,5 × 0,85), teto = round(P99,5 × 1,15).
- Menos de 200 em 3 anos e 30 ou mais em 5 anos: janela de 5 anos, piso = round(min(P0,5 × 0,85; mediana / 2)), teto = round(max(P99,5 × 1,15; mediana × 2)).
- Menos de 30 em 5 anos: fora da tabela.
- Únicas travas: as da ingestão, 500 e 300.000 R$/m².

O piso usa P0,5, não P1. Com P1, a primeira proposta deixava cinco pares acima de 2% de corte, sempre por vendas baratas recentes. Com P0,5 nenhum par reprova (seção 15.0). P1 continua na tabela só como referência.

**Faixa da cidade (consulta 7.4b).** Escrituras residenciais corrigidas em 3 anos, sem `DESCONHECIDO`: piso = P0,5 × 0,85, teto = P99,5 × 1,15. Hoje **907 / 42.013**, sobre 126.381 escrituras. Vai para `itbi_cinto` como a linha `CIDADE|*`.

**Unidade de preço.** A tabela está em preço do último trimestre do índice. As linhas de `itbi_transactions` estão em preço da época, com até 5 anos. Fator de um trimestre = índice do último trimestre ÷ índice daquele trimestre (consulta 7.4b). O app converte os limites antes de filtrar:

- piso ÷ `FATOR_INDICE_5_ANOS`, o maior fator da janela (hoje **1,1721**, trimestre mais barato);
- teto ÷ `FATOR_MIN_INDICE_5_ANOS`, o menor fator da janela (hoje **0,9667**: o trimestre de 2026-04 custou 3,4% mais que o de 2026-07).

Com isso o app nunca corta uma linha que o banco aceitou. A faixa fica um pouco mais larga que a do banco, o que é seguro: o banco já filtrou cada escritura. No banco, `itbi_aplicar_cinto` corrige cada escritura antes de comparar, então usa os limites sem conversão.

**Onde o cinto é aplicado:**

1. **No banco, por escritura, antes da agregação.** `itbi_consolidar_smf()` chama `itbi_aplicar_cinto`, que marca `motivo_rejeicao = 'fora_do_cinto'`. Par exato; senão a faixa da cidade. Sem a linha `CIDADE|*` em `itbi_cinto`, a consolidação para com erro. A mesma função aplica as duas regras por prédio descritas abaixo.
2. **No app, sobre `itbi_transactions`.** `getOutlierLimits(bairro, tipologia)`: par exato (Apartamento, Casa ou Comercial; cobertura e flat contam como Apartamento; sala, loja e escritório como Comercial); senão, menor piso e maior teto entre Apartamento e Casa do bairro, nunca Comercial; senão, a faixa da cidade (`DEFAULT_OUTLIER_MIN` e `FAIXA_SEM_CALIBRACAO_TETO` convertido) com `calibrado: false`.
3. **Busca sem bairro.** `DEFAULT_OUTLIER_MIN` = piso da cidade ÷ maior fator (hoje 774). `DEFAULT_OUTLIER_MAX` = maior teto de Apartamento/Casa da faixa padrão de 3 anos (84.363, Ipanema) ÷ menor fator, hoje 87.269. Pares de 5 anos ficam fora desse máximo, porque uma amostra pequena com cauda gorda (Copacabana/Casa, 60 escrituras, teto 90.965) não pode definir o teto da cidade inteira.

O fallback do banco (cidade) e o do app (residencial do bairro) diferem quando falta o par. Medido em 2026-10-21 sobre os 12 meses: 414 vendas sem par; a faixa da cidade corta 14 e a residencial do bairro cortaria 21. Diferença pequena, sem mudança no banco.

**Regras por prédio (desde 2026-10-22).** A faixa é uma só por bairro e tipologia e não enxerga o prédio. Duas regras em `itbi_aplicar_cinto` (migration `20261021230000_itbi_cinto_regras_predio.sql`) comparam cada escritura com o próprio prédio:

- **Prédio** = mesmo `cl`, mesmo número de porta, mesmo bairro e mesma tipologia. Exige `cl` conhecido e número válido.
- **Referências** = as outras escrituras do prédio, de qualquer data, com preço corrigido dentro do cinto do par. Uma escritura fora do cinto nunca serve de referência.
- **Fora de mercado** (`motivo_rejeicao = 'fora_de_mercado'`): com 2 ou mais referências de área parecida (área ÷ 1,25 a área × 1,25), a escritura com R$/m² corrigido de no máximo 50% da mediana delas sai da consolidação, dentro ou fora do cinto. Pega vendas por uma fração do valor do resto do prédio, com a mesma área: transferência entre parentes, partilha, doação e unidades subsidiadas de conjuntos habitacionais. A SMF não informa a causa, e nenhuma delas é preço de mercado.
- **Exceção** (só acima do teto): com 2 ou mais referências e R$/m² entre 0,67 e 1,5 vez a mediana delas, a escritura não é cortada. Recupera vendas reais de prédios caros para o bairro. Abaixo do piso não há exceção, para um prédio com várias vendas fora de mercado não abonar as outras.
- **Ordem:** fora de mercado vence; depois vale o cinto com a exceção. A marcação é refeita a cada consolidação, e nada é apagado.

Constantes espelhadas em `REGRA_PREDIO` (`_shared/outlierLimits.ts`), com a mesma decisão em `classificarEscritura`. O teste `regraPredio.test.ts` falha se a migration e o código divergirem. Simulação de leitura por ano: `docs/calibracao/bloco74d-simulacao-regras-predio.sql`. Como as consultas 7.4 e 7.4b usam `aceita OR motivo_rejeicao = 'fora_do_cinto'`, as escrituras fora de mercado ficam fora da calibração do cinto.

**Fluxo de recalibração:** consultas 7.4 e 7.4b → dois CSVs em `docs/calibracao/` → `bun run cinto <csv 7.4> <csv 7.4b>` (aceita `--dry-run` e `--candidate=<arquivo>`) → `bun run test` → aceite da seção 15.0 → carga de `docs/calibracao/cinto-<data>.sql` no banco → reconsolidação pelo painel /admin → Apêndice B. Cadência trimestral ou depois de carga relevante, não a cada carga mensal. O motor estatístico e o MAD da seção 2.7 não mudam.

**Limitações conhecidas.**
- Casa tem cauda alta pesada: P99,5 ÷ mediana fica entre 4,6 e 5,1, contra 2,3 a 2,5 em Apartamento. A causa é área construída subdeclarada (casa de 29 m² vendida por R$ 625 mil). A regra continua uniforme; quem segura esses casos é a segunda rede, o MAD.
- O índice é da cidade inteira: +8% em 3 anos, contra +23% na Barra. A correção temporal é grossa em bairros que subiram mais que a média.
- O banco aplica o cinto do par a toda escritura daquela tipologia, inclusive Apartamento com uso Comercial. A calibração usa só o uso correspondente.

### 2.6 Correção temporal pelo índice de preços

View materializada `itbi_price_index` (migration `20260902150000`): por trimestre, mediana ponderada de `ln(valor_m2)` de toda a base residencial válida (`uso = 'Residencial'`, `percentual_transferido >= 90`, `valor_m2 > 0`), com `escrituras = SUM(total_transacoes)`. Atualizada por `refresh_itbi_price_index()` ao fim de `sync-itbi-daily`.

```
deflateRows(linhas, indice, hoje):
  usáveis   = trimestres com escrituras >= 30
  referência = trimestre mais recente <= trimestre(hoje) entre os usáveis
  para cada linha: fator = exp(ln_mediana(referência) - ln_mediana(trimestre(linha)))
                   fator = clamp(fator, 0,5, 2)
                   valor_m2 e valor_transacao × fator
  linhas de trimestres sem índice ficam como estão
```

Todos os valores da faixa (P10, mediana, P95) são calculados sobre linhas **deflacionadas** para o trimestre de referência. Com a janela padrão de 12 meses o efeito é pequeno; com 60 meses, uma linha de 2021 entra multiplicada por cerca de 1,29.

### 2.7 Corte de outliers estatísticos (dentro da amostra)

Três métodos, escolhidos pela configuração da organização (`company_settings.outlier_filter_method`; padrão `mad`). Aplicados sobre as linhas já deflacionadas e já dentro do cinto:

**MAD em escala log (padrão):**
```
requer >= 8 linhas com valor_m2 > 0
L      = ln(valor_m2) por linha, ponderado
med    = mediana ponderada de L
MAD    = mediana ponderada de |L - med|
escala = 1,4826 × MAD           # se 0, não corta
inferior = exp(med - 2,5 × escala)
superior = exp(med + 3,0 × escala)
```

**IQR (Tukey):** requer ≥ 4 escrituras. `Q1`, `Q3`, `med` por quantil ponderado; `IQR_ef = max(Q3 - Q1, 0,2 × med)`; cercas `Q1 - 1,5·IQR_ef` e `Q3 + 1,5·IQR_ef`.

**Percentil:** não corta; a faixa P10/P95 já ignora as caudas.

Depois de calcular as cercas, o motor decide se aplica o corte (`ENGINE_VERSION` 4, 2026-09-03):

```
escrituras_total     = Σ peso das linhas válidas
escrituras_filtradas = Σ peso das linhas dentro das cercas
se escrituras_filtradas < 3:                                   corte ignorado, outlier_cut_skipped = "amostra_minima"
senão se (total − filtradas) / total > MAX_OUTLIER_CUT_SHARE (0,15): corte ignorado, outlier_cut_skipped = "bimodal"
senão:                                                         corte aplicado
```

Quando o corte é ignorado, `outlier_method` sai como `none` e a amostra inteira segue para a faixa P10–P95, que continua limitando as caudas. A salvaguarda de bimodalidade veio do bloco 7.3 par a par (`docs/calibracao/bloco73-analise-2026-09-03.md`): em Santo Cristo, São Conrado, Glória, Curicica e Parada de Lucas o MAD com qualquer k remove de 11 a 22 % das escrituras do bairro, porque esses mercados têm dois núcleos (lançamento novo ao lado de estoque antigo, luxo ao lado de habitação popular) e o MAD elimina o menor inteiro chamando-o de outlier. Um filtro de erro que remove mais de 15 % da amostra não está removendo erro.

### 2.8 Estatística final (`calculateITBIData`)

Sobre os sobreviventes:

```
min_m2   = round(P10 ponderado)
med_m2   = round(mediana ponderada)
max_m2   = round(P95 ponderado)
media_m2 = round(média ponderada)           # exibição apenas
transaction_count   = escrituras de TODAS as linhas válidas (antes do corte)
escrituras_validas  = escrituras dos sobreviventes
avg_valor_transacao = média ponderada de valor_transacao das linhas válidas (deflacionadas)
```

Metadados (`ITBIMarketMeta`) gravados com o resultado: `engine_version`, `data_source` (logradouro | raio100 | raio300 | bairro), `raio_m`, `ponto_referencia`, `bairros_incluidos`, `janela_inicio`, `janela_fim`, `janela_meses`, `janela_meses_solicitada`, `janela_expandida`, `tipologia_filtro`, `tipologia_fallback`, `outlier_method` (`mad` | `iqr` | `percentile` | `none` quando o método não pôde ser aplicado), `piso_m2`, `teto_m2`, `linhas_agregadas`, `linhas_descartadas`, `escrituras_validas`, `truncado`, `deflacionado`, `trimestre_referencia`, `calculado_em`.

### 2.9 Normalização de logradouro e variantes de grafia

A base oficial grava nomes abreviados e com grafias históricas. Buscar por "Avenida General Olyntho Pilar" não encontra `AVN GAL OLYNTHO PILLAR`. A busca por rua **expande o termo em todas as combinações válidas** (`buildStreetSearchTerms`, `src/lib/logradouroSearch.ts`) e monta um `OR` de `ILIKE`.

**Passo 1 — Normalização de texto**
1. Converter para maiúsculas;
2. Remover acentos (NFD + remoção de diacríticos);
3. Colapsar espaços múltiplos.

**Passo 2 — Expansão do tipo de via** (grupos equivalentes; o primeiro token é substituído por cada membro do grupo)

| Grupo | Variantes |
|---|---|
| Avenida | `AVENIDA`, `AV`, `AV.`, `AVN` |
| Rua | `RUA`, `R`, `R.` |
| Estrada | `ESTRADA`, `EST`, `EST.` |
| Travessa | `TRAVESSA`, `TV`, `TV.` |
| Praça | `PRACA`, `PRAÇA`, `PCA`, `PC`, `PÇ` |
| Alameda | `ALAMEDA`, `AL`, `AL.` |

**Passo 3 — Expansão de títulos e patentes** (cada token do nome é substituído por cada membro do seu grupo)

`GENERAL/GAL/GEN` · `CORONEL/CEL` · `TENENTE/TEN` · `CAPITAO/CAP` · `MAJOR/MAJ` · `SARGENTO/SGT` · `ALMIRANTE/ALM` · `BRIGADEIRO/BRIG` · `MARECHAL/MAL/MAR` · `PROFESSOR/PROF` · `PROFESSORA/PROFA/PROF` · `DOUTOR/DR` · `DOUTORA/DRA` · `PRESIDENTE/PRES` · `PREFEITO/PREF` · `GOVERNADOR/GOV` · `SENADOR/SEN` · `DEPUTADO/DEP` · `VEREADOR/VER` · `MINISTRO/MIN` · `DESEMBARGADOR/DES` · **`DESENHISTA/DESEN`** · `EMBAIXADOR/EMBAIX/EMB` · `ENGENHEIRO/ENG` · `MARQUES/MARQ` · `BARAO/BAR` · `VISCONDE/VISC` · `CONDE/CDE` · `COMENDADOR/COMEND` · `MONSENHOR/MONS` · `PADRE/PE` · `SANTO/STO` · `SANTA/STA` · `SAO/S` · `NOSSA SENHORA/N SRA/NSA SENHORA`

**Passo 4 — Variantes de grafia de nomes próprios**

`OLYNTHO/OLINTO/OLYNTO/OLINTHO` · `PILLAR/PILAR` · `ESTELLITA/ESTELITA` · **`LUIZ/LUIS`**

**Passo 5 — Produto cartesiano** das variantes de cada token, gerando a lista de termos de busca. Para "Avenida General Olyntho Pilar" isso produz mais de 100 combinações, entre as quais `AVN GAL OLYNTHO PILLAR` — a grafia efetivamente gravada.

O mesmo conjunto de regras existe no banco, na função SQL `normalizar_logradouro_busca` (migration `20260903141055`: maiúsculas, sem acentos, só `[A-Z0-9]`, abreviações de tipo de via e de títulos unificadas), usada por `logradouro_norm` e pelo parecer técnico. Atenção: nem toda tela usa a expansão. O motor de avaliação e a análise histórica usam; o site público, o comparativo de ruas e a busca por logradouro selecionado usam `ILIKE` simples sobre o texto informado (seções 8.1 e 9).



---

## 3. Parecer Godoy Prime (motor de avaliação)

Fluxo em `src/components/valuation/ValuationEngine.tsx`, etapas 0 a 5. Esta seção cobre a estatística de mercado (Etapa 1) e o cálculo do valor (`src/utils/valuationCalculations.ts`). As etapas de questionário, documentação, resultado, recomendação e PDF estão na seção 4.

### 3.1 Amostra de mercado (`fetchMarketRows`, `Step1Location.tsx:176`)

Entradas: `bairro`, `logradouro` (nome oficial ou normalizado ITBI vindo da sugestão), `tipoImovel`, `ruasInternas` (quando o imóvel está num condomínio mapeado).

Consulta base (tabela `itbi_transactions`, colunas `valor_m2, valor_transacao, total_transacoes, data_transacao, bairro, tipologia`):

```sql
uso = 'Residencial'
AND percentual_transferido >= 90
AND valor_m2 IS NOT NULL
AND valor_m2 >= piso(bairro, tipologia) AND valor_m2 <= teto(bairro, tipologia)
AND data_transacao >= hoje - 60 meses AND data_transacao <= hoje
[AND bairro ILIKE bairro]              -- só nos escopos bairro e condomínio
[AND tipologia = 'Apartamento'|'Casa'] -- quando a tipologia do imóvel é conhecida
ORDER BY data_transacao DESC, logradouro ASC, tipologia ASC
LIMIT 5000
```

Filtro de rua: `OR` de `logradouro ILIKE '%termo%'` para cada variante gerada de `logradouro` (nome normalizado, sem número, sem prefixo de via). A busca por rua é **sem filtro de bairro** (ruas que cruzam bairros entram inteiras; os bairros encontrados ficam em `bairros_incluidos`). Condomínio: `OR` de `logradouro ILIKE '%rua interna%'` para cada rua interna, **com** filtro de bairro.

Tipologia: `mapTipoImovelToTipologia(tipoImovel)` → `Casa` | `Apartamento` | null. Dentro de cada escopo tenta primeiro com tipologia; se vier menos de 8 linhas, tenta sem tipologia; fica com a maior das duas se nenhuma atingir 8 (`tipologia_fallback = true` quando a usada foi a sem filtro).

Cadeia de escopos (proximidade crescente):

```
1. rua (ou ruas internas)                       → se >= 8 linhas, encerra
2. se company_settings.radius_fallback_enabled (padrão: DESLIGADO):
     ponto = itbi_ponto_logradouro(logradouro_padrao ou logradouro, bairro)  # média das coordenadas da rua
     raio 100 m via RPC itbi_amostra_raio(ponto, 100, mesmos filtros, tipologia, piso, teto)
       → se >= 8 linhas, encerra; senão raio 300 m
3. entre rua/raio100/raio300: primeiro com >= 8 linhas; se nenhum, o de mais linhas (empate: o mais próximo)
4. bairro inteiro, só se rua e raios não tiverem NENHUMA linha
```

Penalidade de confiança por origem: 0 / 5 / 10 / 15 (seção 3.5).

### 3.2 Janela, correção temporal e faixa (`calculateITBIData`, `Step1Location.tsx:436`)

1. `selectRollingWindowRows(linhas, janelaMeses)` com `janelaMeses` escolhido pelo usuário no seletor "Período" (padrão 12; opções 12/24/36/48/60), expansão automática até 8 linhas (seção 2.4).
2. `deflateRows` para o trimestre de referência (seção 2.6).
3. `calculateITBIData` com o método de outlier da organização (seção 2.7 e 2.8).

Saída para a tela e para o restante do motor (`ITBIData`): `min_m2` (P10), `med_m2` (mediana), `max_m2` (P95), `media_m2`, `transaction_count`, `avg_valor_transacao`, `meta`. A linha de rastreabilidade exibe fonte, tipologia, janela, registros agregados e descartados, método de corte, piso/teto e correção temporal.

### 3.3 Anúncios de referência (`Step1Location.tsx:396`)

Até 5 anúncios com valor total e área. `valor_m2 = valor_total / area_m2` por anúncio; `min`, `max` e **mediana simples** (não ponderada) dos anúncios válidos, arredondados. Não entram na base de valor; só no gap (3.4).

### 3.4 Base de valor e gap de mercado (`calculateCombinedPrices`)

```
base = {min_m2, med_m2, max_m2} do ITBI, sempre (100 % transações reais)
se sem anúncios:              gap = null, alinhamento SEM_DADOS
se 1 ou 2 anúncios:           gap = null, alinhamento AMOSTRA_INSUFICIENTE   (mínimo 3)
senão:
  gap = (mediana_anuncios - med_m2_itbi) / med_m2_itbi × 100
  gap = clamp(gap, -35, +35)  (trend_capped = true quando cortado; original guardado)
  alinhamento: |gap| <= 10 EQUILIBRADO; <= 20 MODERADO; <= 35 DESALINHADO; > 35 CRITICO
  direção: > +5 UP; < -5 DOWN; senão STABLE
```

Seleção de base (`applyBaseSelection`): o usuário pode escolher `min`, `med` (padrão), `max` ou um R$/m² customizado; `min` e `max` são reescalados pela razão `novaMediana / medianaOriginal` para preservar a proporção do spread.

### 3.5 Valor final, spread e confiança

Ajuste do questionário (`calculateTotalAdjustment`; detalhes na seção 4.2): soma dos pesos das características marcadas "sim", por categoria, com cap por categoria e cap global ±35 %; mais bônus/penalidade de terreno (casas).

```
fator     = area_m2 × (1 + ajuste) × fator_documentacao
pessimista = round(min_m2 × fator)      # P10
provavel   = round(med_m2 × fator)      # mediana
otimista   = round(max_m2 × fator)      # P95
spread %   = (otimista - pessimista) / provavel × 100
```

Sem compressão de spread e sem clamps.

Confiança (`calculateConfidenceScore`), começa em 100:

| Critério | Regra |
|---|---|
| Magnitude do ajuste | abs(ajuste) > 40 % −15; > 35 % −8; > 25 % −4 |
| Spread P10–P95 | > 65 % −18; > 50 % −10; > 35 % −4 (recalibrado em 2026-09-03 para P95; com P90 eram 55/40/30) |
| Documentação | fator < 0,85 −20; < 0,95 −8 |
| Liquidez (score 0–100 da análise histórica, seção 7) | ≥ 70 +10; ≥ 50 +5; < 30 −5 |
| Gap de anúncios | null −10; abs(gap) ≤ 15 +3; ≤ 25 0; ≤ 35 −3; > 35 −5 |
| Origem da amostra | rua 0; raio 100 m −5; raio 300 m −10; bairro −15; tipologia relaxada −5 |
| Clamp | [0, 100] |
| Teto por escrituras válidas | ≤ 2 → máx 40; ≤ 9 → máx 55; ≤ 29 → máx 75 |

Nível: ≥ 85 verde; ≥ 70 amarelo alto; ≥ 55 amarelo médio; < 55 vermelho.

### 3.6 Recomendação (`generateRecommendation`, ordem de avaliação)

1. documentação `incompleta` → **Avaliação Bloqueada**
2. escrituras válidas < 3 → **Amostra Insuficiente** (valor indicativo)
3. fator de documentação < 0,80 → **Consultar Especialista Jurídico** (ganho potencial `provavel × (1 - fator)`)
4. spread > `SPREAD_WIDE_PCT` (50 %) e confiança < 55 → **Requerer Avaliação Técnica Formal**
5. gap > 15 % e confiança ≥ 70 → **Anúncios Acima do Mercado**
6. 0,90 ≤ fator doc < 1,00 → **Regularizar Antes de Vender**
7. gap < −5 % → **Mercado em Cautela** (anunciar 5 % abaixo)
8. alinhamento DESALINHADO ou CRITICO → **Revisar Precificação**
9. senão → **Pronto para Comercializar**

Saída persistida (`valuations`): pessimista, provável, otimista, `spread_percentage` (1 casa), `confidence_score`, `confidence_level`, `total_adjustment` (3 casas), `auto_capped`, recomendação, e `itbi_metadata` com todo o `meta` da seção 2.8.

---

## 4. Parecer Godoy Prime: etapas 2 a 5, questionário, documentação e PDF

### 4.1 Etapa 2: área e base de preço (`Step2BasicData.tsx`)

Entradas: `area_m2` (área construída/privativa, obrigatória), `area_terreno_m2` (casas), e a escolha da base (`baseSelected`: `min` = P10, `med` = mediana (padrão), `max` = P95, `custom` = R$/m² digitado). Exibe `area_m2 × base` como valor bruto de referência. A base alterada reescala P10 e P95 proporcionalmente (seção 3.4).

### 4.2 Etapa 3: questionário de características (`Step3Questionnaire.tsx`, `calculateTotalAdjustment`)

Fonte das características: tabela `valuation_characteristics` (`is_active = true`, `applies_to IN ('ambos', tipo)`), ordenada por `display_order`. Cada característica tem `category` (A a E), `weight_value` (fração, ex.: 0,05) e `applies_to` (`casa` | `apartamento` | `ambos`). O usuário responde "sim" ou "não".

```
por categoria: soma dos weight_value das respostas "sim"
cap por categoria (código, CATEGORY_CAPS; os valores category_cap_* do banco são ignorados):
   casa:        A [-0,12; +0,15]  B [-0,08; +0,10]  C [-0,06; +0,10]  D [-0,06; +0,06]  E [-0,06; +0,08]
   apartamento: A [-0,12; +0,12]  B [-0,08; +0,08]  C [-0,06; +0,06]  D [-0,06; +0,06]  E [-0,06; +0,06]
ajuste = Σ categorias limitadas + bônus de terreno (casas)
cap global: [-0,35; +0,35] (auto_capped = true quando atinge)
```

"Casa" para fins de cap = tipo contém "casa" ou "cobertura" (`isCasaType` em `valuationCalculations.ts`); note que para a **amostra ITBI** cobertura conta como Apartamento (seção 2.5). Bônus de terreno (`calculateTerrainBonus`), só quando `area_terreno_m2 > 0`:

| terreno / construção | bônus |
|---|---|
| ≥ 3,0 | +6 % |
| ≥ 2,5 | +4 % |
| ≥ 2,0 | +2 % |
| ≥ 1,5 | 0 |
| ≥ 1,2 | −2 % |
| < 1,2 | −4 % |

Pesos vigentes em produção (44 ativas de 49; export de 2026-09-02, `docs/calibracao/valuation_characteristics-2026-09-02.csv`):

| Cat. | Código | Nome | Peso | Aplica a |
|---|---|---|---|---|
| A | vista_frontal_mar | Vista Frontal Mar Deslumbrante | +5,0 % | ambos |
| A | vista_mar | Vista Mar | +3,0 % | ambos |
| A | vista_mar_lateral | Vista Mar Lateral | +2,0 % | ambos |
| A | vista_parcial_mar | Vista Parcial Mar | +1,0 % | ambos |
| A | vista_lagoa | Vista livre Lagoa/Parque/Verde | +3,0 % | ambos |
| A | interior_sem_vista | Interior/Sem Vista | −4,0 % | apartamento |
| A | frente_propria | Imóvel de Frente/Fachada Própria | +2,0 % | ambos |
| A | fundo_lote_lateral | Fundo de Lote / Rua Lateral | +3,0 % | casa |
| A | sol_manha | Sol Manhã Favorável | +2,0 % | ambos |
| A | andar_alto | Andar Alto (>6º) | +3,0 % | apartamento |
| A | andar_baixo | Andar Baixo (<6º) | −3,0 % | apartamento |
| A | ruido_excessivo | Ruído Excessivo | −5,0 % | ambos |
| B | totalmente_reformado | Totalmente Reformado | +6,0 % | ambos |
| B | estado_otimo | Estado Geral Ótimo | +4,0 % | ambos |
| B | acabamento_fachada | Acabamento Visual Fachada | +4,0 % | casa |
| B | eletrica_nova | Elétrica Nova/Recente | +0,5 % | ambos |
| B | hidraulica_nova | Hidráulica Nova/Recente | +1,5 % | ambos |
| B | esquadrias_novas | Esquadrias Novas | +1,0 % | apartamento |
| B | telhado_bom_estado | Telhado/Cobertura Bom Estado | +2,0 % | casa |
| B | energia_solar | Sistema Energia Solar | +2,0 % | casa |
| B | antigo_sem_modernizacao | Antigo Sem Modernização | −7,0 % | ambos |
| B | reforma_urgente | Necessidade Reforma Geral | −10,0 % | ambos |
| C | lazer_completo | Condomínio Lazer Completo | +5,0 % | ambos |
| C | lazer_basico | Condomínio Lazer Básico | 0 | ambos |
| C | piscina_privada | Piscina Privativa | +1,0 % | ambos |
| C | piscina_aquecida | Piscina Aquecida | +1,0 % | casa |
| C | terraco_amplo | Terraço/Varanda Ampla | +2,0 % | ambos |
| C | churrasqueira_gourmet | Churrasqueira Gourmet | +1,0 % | casa |
| C | quintal_amplo | Quintal/Área Externa Ampla | +2,0 % | casa |
| C | jardim_paisagismo | Jardim com Paisagismo | +2,0 % | casa |
| D | portaria_24h | Portaria 24h + Vigilância | +2,0 % | ambos |
| D | muros_altos_seguranca | Muros Altos + Segurança Privada | +2,0 % | casa |
| D | cameras | Câmeras Monitoradas | +0,5 % | ambos |
| D | elevador | Elevador Social e Serviço | +1,0 % | ambos |
| D | sem_portaria | Sem Portaria 24h | −5,0 % | ambos |
| D | sem_elevador | Sem Elevador (Prédio >4 andares) | −5,0 % | ambos |
| E | vaga_extra | Vaga de Garagem Extra | +1,0 % | ambos |
| E | layout_moderno | Layout Moderno/Otimizado | +1,0 % | ambos |
| E | deposito | Depósito/Área Guarda | +0,5 % | ambos |
| E | layout_confuso | Layout Confuso/Mal Distribuído | −2,0 % | ambos |
| E | area_servico_externa | Área de Serviço Externa | +1,0 % | casa |
| E | edicula_caseiro | Edícula/Casa Caseiro | +3,0 % | casa |
| E | closet_suite | Closet na Suíte | +1,0 % | apartamento |
| E | dependencia_empregada | Dependência Completa | +1,0 % | apartamento |

### 4.3 Documentação (`valuation_documentation_factors`)

O usuário escolhe um status; o motor usa a coluna **`factor`** (multiplicador do valor). A coluna `adjustment` existe no banco mas não entra no cálculo.

| Código | Nome | factor | Efeito na recomendação (seção 3.6) |
|---|---|---|---|
| pendente_avaliacao | Documentação Pendente de Avaliação | 1,00 | nenhum |
| ok | Documentação Regular | 1,00 | nenhum |
| pequena_pendencia_iptu | Pequena Pendência IPTU | 0,99 | Regularizar Antes de Vender |
| pendencia_condominio | Débito Condomínio | 0,99 | Regularizar Antes de Vender |
| restricao_usufruto | Restrição Usufruto | 0,85 | penalidade de confiança −8 |
| grave_penhora | Grave (Penhora/Inventário) | 0,75 | Consultar Especialista; confiança −20 |
| incompleta | Documentação Incompleta | (null → 1,00) | Avaliação Bloqueada |

### 4.4 Etapa 4: resultado (`Step4Results.tsx`)

Exibe pessimista, provável e otimista (seção 3.5), spread, ajuste total e por categoria, bônus de terreno, confiança (score e nível), gap de anúncios com alinhamento, liquidez (score da análise histórica, seção 7) e a análise histórica com projeção. A liquidez entra no cálculo da confiança quando a análise histórica já carregou; se ainda não carregou, a confiança é calculada sem o termo de liquidez.

### 4.5 Etapa 5: recomendação, precificação e persistência (`Step5Recommendation.tsx`)

Recomendação da seção 3.6. Módulo de **estratégia de preço de anúncio** (`pricingCalculations.ts`), sobre um valor base editável pelo usuário (inicializado com o **valor provável** da avaliação):

```
percentuais: atração 4 % (6 % se prioridade "vender rápido" ou "liquidez rápida" e mercado não em baixa)
             mercado 8 % (10 % se mercado em alta e imóvel com diferenciais/alto padrão/premium)
             premium 12 % (15 % se premium, sem pressa e (poucos concorrentes ou mercado em alta))
preço de anúncio = base × (1 + p);  corretagem = 6 %;  líquido = anúncio × 0,94
piso planejado = anúncio × 0,97;  líquido mínimo = piso × 0,94;  prêmio líquido % = líquido / base − 1
estratégia recomendada: atração se (vender rápido | até 30 dias | liquidez rápida | muitos concorrentes);
                        premium se (alto padrão ou premium) e horizonte ≠ 30 dias e (poucos concorrentes ou mercado em alta);
                        senão mercado
```

Persistência em `valuations`: valores, spread, confiança, ajuste, recomendação, `anuncio_min/med/max_m2`, `anuncio_fontes`, `itbi_metadata` (JSON da seção 2.8), `janelaMeses` no estado do rascunho.

### 4.6 PDF do Parecer (`valuationPdfExport.ts`)

Não recalcula: repete o estado. Mostra "Transações" = `transaction_count` (escrituras antes do corte), "Valor médio por m² (mediana)" = `med_m2`, os três valores, spread, confiança, gap e a tabela anual da análise histórica (transações, mínimo, médio, máximo por ano). Texto de metodologia impresso: "valores de referência (P10, mediana e P95 do R$/m², ponderados pelo número de escrituras) calculados exclusivamente com dados oficiais de transações; anúncios não entram na base". Classificação de spread no PDF (recalibrada em 2026-09-03 para P95): ≤ 27 % "precisão alta", ≤ 37 % "boa", ≤ 50 % "moderada", acima "baixa".

---

## 5. Pesquisa de Mercado (busca por logradouro e busca avançada)

### 5.1 Busca por logradouro / condomínio (`useTransactionSearch.ts`; telas `PesquisasMercado.tsx`, `SearchTools.tsx`)

Parâmetros: bairro, tipologia, período em meses (padrão **12**; opções 12/24/36/48/60), faixa de valor de transação, faixa de área, faixa de R$/m², "apenas individuais" (`total_transacoes = 1`), lista de logradouros (ruas internas do condomínio).

```sql
uso = 'Residencial'   -- 'Comercial' quando tipologia = Comercial
AND valor_m2 IS NOT NULL
AND valor_m2 <= teto(bairro)            -- só TETO, sem piso; sem bairro: DEFAULT_OUTLIER_MAX (87.269)
AND percentual_transferido >= 90
AND data_transacao >= hoje - N meses
[AND bairro ILIKE bairro]
[AND tipologia ILIKE '%tipologia%']
[AND valor_transacao BETWEEN ...] [AND area_m2 BETWEEN ...] [AND valor_m2 BETWEEN ...]
[AND total_transacoes = 1]
[AND (logradouro ILIKE variante1 OR ...)]   -- variantes de src/lib/logradouroSearch.ts
LIMIT 5000  -- sem ORDER BY
```

Agrupamento por `logradouro`:

```
escrituras(logradouro)     = Σ total_transacoes
preco_medio_m2(logradouro) = round(Σ valor_m2 × total_transacoes / Σ total_transacoes)
ordenação: escrituras desc
totais: "Escrituras Reais (transações)" = Σ escrituras; "Total de Logradouros" = número de grupos
```

Sem mediana, sem corte MAD, sem correção temporal, sem piso. Export CSV/XLSX repete as linhas agrupadas e os totais.

### 5.2 Busca avançada (`EmbeddedAdvancedSearch.tsx`, `AdvancedSearchReport.tsx`)

Filtros: uso, tipologia, valor, área, ano inicial/final (`YYYY-01-01` a `YYYY-12-31`), bairro (`ILIKE '%bairro%'`), logradouro com variantes fuzzy, ou lista de ruas internas. Sempre `percentual_transferido >= 90`, `valor_m2 IS NOT NULL`, `valor_m2 <= teto(bairro)` quando há bairro.

Duas consultas: totais sobre até 5000 linhas; tabela de exibição com `ORDER BY valor_transacao DESC LIMIT 500` (relatório simples: `LIMIT 100`).

Indicadores (sobre as até 5000 linhas):

```
Registros ITBI (agregações mensais) = COUNT(*)
Escrituras Reais (transações)       = Σ total_transacoes
Média do Período (R$/m²)            = Σ valor_m2 × tt / Σ tt
R$/m² Atual (últimos 3 meses)       = mesma média ponderada nas linhas com data >= (data máxima da amostra − 3 meses)
Volume Estimado                     = Σ valor_transacao × tt
CAGR                                = (média_ano_final / média_ano_inicial)^(1/(ano_final − ano_inicial)) − 1   (médias anuais ponderadas)
Valorização Total                   = média_ano_final / média_ano_inicial − 1
Confiança da Valorização            = min(escrituras por ano) >= 10 alta; >= 3 média; senão baixa
```

Histórico de um logradouro selecionado (`ILIKE` exato no nome, mesmo bairro, `<= teto`, `LIMIT 200`, data desc): lista de períodos, total de escrituras e média ponderada.

---

## 6. Dashboard (Painel Analítico)

### 6.1 KPIs do bairro (`useKPIStats.ts`)

Cinto: **só teto** do bairro (`getOutlierLimit`, maior teto entre as tipologias), sem piso. Filtros comuns: `uso = 'Residencial'`, `bairro ILIKE`, `valor_m2 IS NOT NULL`, `percentual_transferido >= 90`, `LIMIT 5000` (era 10000 até 2026-09-03).

Período "atual":
- ano corrente (YTD, `data_transacao >= 01/01`); se tiver menos de 30 linhas **e** menos de 100 escrituras, usa os últimos 12 meses (`usandoDadosHistoricos = true`).

Período "anterior" (para variação anual): 24 a 12 meses atrás. Para a variação anual o "atual" é sempre os **últimos 12 meses** (busca própria quando o período atual é YTD), para ficar simétrico.

```
Preço médio (geral, apartamento, casa) = Σ valor_m2 × tt / Σ tt         (tipologia por substring "apartamento"/"casa")
Liquidez (geral, apt, casa)            = Σ total_transacoes do período atual
Variação anual                         = (média 12 m − média 12 m anteriores) / anterior × 100
Variação mensal                        = (média do último mês com dados − média do penúltimo) / penúltimo × 100   (meses = YYYY-MM de data_transacao)
Mês de referência                      = último mês com dados
Região mais valorizada                 = maior média ponderada com >= 3 escrituras entre:
                                          Barra da Tijuca: microbairros por palavra-chave fixa no código (Orla, Península, Centro Metropolitano, Ayrton Senna, Jardim Oceânico, ABM, Parque das Rosas, Eixo Américas)
                                          outros bairros: logradouros
Preço apt/casa da região mais valorizada: média ponderada da tipologia; sem dados: apt = média geral, casa = média geral × 0,9
```

Preenchimentos quando não há dados: `precoMedioApt` cai para o geral; `precoMedioCasa` cai para geral × 0,85.

### 6.2 Evolução (`useEvolutionData.ts`)

Todas as linhas do bairro desde 2020-01-01 (paginação de 1000 em 1000), mesmos filtros, só teto. Agrupa por semestre (S1 = meses 1–6) ou ano; por grupo, média ponderada geral, apartamento e casa; variação % em relação ao grupo anterior (geral). Preenchimentos: apt sem dados = geral; casa sem dados = geral × 0,85.

### 6.3 Ranking de microrregiões do painel (`useMicrobairroRanking` em `useITBITransactions.ts`)

Últimos 12 meses, só teto, `percentual >= 90`. Se o bairro tem `microbairros_geo`, agrupa por `microbairro` da linha ou por palavra-chave; senão por logradouro. Por grupo: média e mediana **ponderadas por escrituras** (mediana = valor em que a soma acumulada dos pesos atinge metade do total), mínimo e máximo; `total_transacoes` = Σ escrituras; entra com ≥ 3 escrituras; ordena por média desc; bairros sem microrregiões: 10 primeiros. (Até 2026-09-03 eram média e mediana simples das linhas.)

### 6.4 Exports do painel (`Dashboard.tsx`)

Consulta `bairro = X` (igualdade), `uso`, `percentual >= 90`, `valor_m2 IS NOT NULL`, paginada em blocos de 1000 até esgotar (antes de 2026-09-03 não havia `.limit()` e o PostgREST cortava em 1000 linhas): totais = COUNT, Σ escrituras, Σ `valor_transacao` (não multiplicado por escrituras), média ponderada de R$/m². O backup completo usa a mesma paginação.

---

## 7. Microrregiões (`Microbairros.tsx`, `useMicrobairroDetalhado`, `useMicrobairroEvolutionData`)

**Tabela e cards:** últimos 12 meses; `uso = 'Residencial'`, `bairro ILIKE`, `valor_m2 IS NOT NULL`, só teto, `percentual_transferido >= 90` (adicionado em 2026-09-03), `logradouro IS NOT NULL`, `LIMIT 5000`. Agrupa por logradouro:

```
valor_m2      = Σ valor_m2 × tt / Σ tt (todas as tipologias)
valor_m2_apt  = idem só apartamentos; sem dados = valor_m2
valor_m2_casa = idem só casas; sem dados = round(valor_m2 × 0,92)
total_transacoes = Σ tt
rank por valor_m2 desc; "Alta" = top 3
```

**Evolução por microrregião:** desde 2020-01-01, `bairro =` (igualdade), `percentual >= 90`, só teto, paginado. Barra da Tijuca: 8 microrregiões por palavra-chave fixa; outros bairros: os 8 logradouros com mais escrituras. Por semestre/ano e região: média ponderada (métrica "valorização") ou escrituras acumuladas (métrica "liquidez").

---

## 8. Comparativo de ruas, mapa e análise histórica

### 8.1 Comparativo de ruas (`useStreetComparison.ts`)

Por logradouro (`ILIKE '%nome%'`, **sem filtro de bairro**), período N meses (padrão 12; a página Microrregiões passa 60) e período anterior de mesmo tamanho; `uso`, `percentual >= 90`, `valor_m2 IS NOT NULL`, só teto do bairro, `LIMIT 2000`.

```
media_m2   = média ponderada
mediana_m2 = primeiro valor cuja soma acumulada de pesos >= Σ pesos / 2   (ordenado asc)
total_transacoes = Σ tt
variacao_periodo = (media_m2 − média ponderada do período anterior) / anterior × 100
dados_mensais: por YYYY-MM, média ponderada e Σ tt
```

### 8.2 Mapa (`useTransactionMapData.ts`)

`bairro =` (maiúsculas, igualdade), N meses (padrão 12), uso, `valor_m2 IS NOT NULL`, `percentual >= 90`, só teto, filtros opcionais de valor/área/tipologia/logradouros, `LIMIT 5000`. Agrupa por logradouro (Σ escrituras, média ponderada), ordena por escrituras desc, geocodifica os 100 primeiros via `geo-logradouro/batch-geocode`.

### 8.3 Análise histórica de 5 anos (`useHistoricalTransactionAnalysis.ts`)

Usada na Etapa 4 do Parecer (gráfico, liquidez, tendência, projeção) e no PDF. **Janela: 5 anos fechados** (`currentYear − 5` a `currentYear − 1`), diferente da janela móvel do motor. Condomínio (ruas internas) inclui o ano corrente.

Escopo: `rua` (padrão), `raio100`, `raio200`, `raio300`. Rua: `OR` das variantes de `logradouroSearch`, `uso = 'Residencial'`, `percentual_transferido >= 90` (adicionado em 2026-09-03), **sem** filtro de bairro (união cross-bairro registrada em `bairrosEncontrados`), sem filtro de `valor_m2` no SQL, `ORDER BY data ASC LIMIT 5000`. Raio: `itbi_ponto_logradouro` (média das coordenadas da rua) + `itbi_transacoes_raio(lat, lng, raio, início, fim)` (RPC; `uso = 'Residencial'`, `percentual_transferido >= 90` desde a migration `20260903160000`, `geom IS NOT NULL`, raio limitado a [50; 2000] m). Bairro inteiro só quando a rua devolve zero linhas (`dataSource = 'bairro'`).

Por ano:

```
transacoes(ano)  = Σ tt de todas as linhas do ano (mesmo sem valor_m2)
valores(ano)     = cada valor_m2 dentro de [piso, teto] do bairro, repetido tt vezes   (piso reduzido a min(piso × 0,5; 3000) em condomínios)
se >= 4 valores: corte de Tukey simples sobre os valores expandidos (Q1 = elemento floor(n·0,25), Q3 = floor(n·0,75), cercas 1,5×IQR)
valorMedioM2    = média dos sobreviventes
valorMedianoM2  = mediana dos sobreviventes
valorMinM2/MaxM2 = mínimo e máximo dos sobreviventes
variacaoTransacoes, variacaoPrecoM2 = variação % ano a ano (preço pela MÉDIA)
```

Tendências e liquidez (anos com `transacoes > 0`; com menos de 2 anos devolve "dados insuficientes", liquidez 30):

```
transactionGrowth = ((tt_último − tt_primeiro) / tt_primeiro × 100) / (anos entre eles);  confiável só se tt_primeiro >= 3
transactionTrend  = confiável: > +10 % crescente, < −10 % decrescente; não confiável e média >= 10/ano: ±15 %; senão estável
priceGrowth       = taxa anual de fitLogGrowth(medianas anuais) × 100   (seção 8.4)
priceTrend        = > +3 % alta; < −3 % baixa; senão estável
liquidityScore    = min(100, média de escrituras por ano × 3) (+10 crescente, −10 decrescente, só se confiável), clamp [0, 100]
liquidityLevel    = >= 70 alta; >= 40 média; senão baixa
```

Cache local (`historicalAnalysisCache.ts`, chave versão v17) só no escopo rua; não cacheia se houver 2 ou mais anos recentes zerados numa série com mais de 200 escrituras.

### 8.4 Tendência e projeção (`priceTrend.ts`, `calculateFutureProjection`)

```
pontos (ano, ln(mediana anual)), n >= 2
inclinação b = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²
taxa provável = e^b − 1
n = 2: banda fixa ln(1,03) → taxa baixa/alta = e^(b ∓ banda) − 1   (método "dois_pontos")
n >= 3: se = sqrt(SSE / (n−2) / Σ(x−x̄)²); banda = min(0,25; t(95 %, n−2) × se)   (método "regressao_log")
projeção k anos (k = 1, 2, 3) = (1 + taxa)^k, para provável, otimista (taxa alta) e pessimista (taxa baixa)
confiança: regressão e liquidez >= 70 e >= 4 anos → alta; regressão e liquidez >= 40 e >= 3 anos → média; senão baixa
```

A projeção é um multiplicador sobre o valor atual; o gráfico aplica sobre o valor provável.

---

## 9. Site público (`public-itbi-stats`)

Edge function `supabase/functions/public-itbi-stats/index.ts`, chamada pelo site com `{bairro, logradouro?, tipologia?, janela_meses?}`. Usa a **chave de serviço** (sem RLS) e o mesmo módulo compartilhado do motor.

Consulta (`itbi_transactions`, 60 meses, `ORDER BY data_transacao DESC, logradouro, tipologia LIMIT 5000`):

```sql
bairro = resolverNomeBairro(bairro)     -- grafia oficial com acento (BARRA OLÍMPICA), igualdade exata
AND uso = 'Residencial'
AND percentual_transferido >= 90
AND valor_m2 IS NOT NULL
AND data_transacao BETWEEN hoje - 60 meses AND hoje
[AND logradouro ILIKE '%logradouro%']   -- sem variantes de grafia
[AND tipologia ILIKE '%tipologia%']     -- quando informada e diferente de "Todos"
```

Piso e teto:
- **sem logradouro:** limites do bairro × tipologia aplicados no SQL;
- **com logradouro:** consulta entre `DEFAULT_OUTLIER_MIN` e `DEFAULT_OUTLIER_MAX` (774 e 87.269), depois `getStreetOutlierLimits` (seção 2.5): se a rua tem ≥ 8 linhas e ≥ 40 escrituras, piso/teto = P1/P99 ponderados da própria rua com margens; senão limites do bairro. O corte é feito em memória.

Depois: `selectRollingWindowRows(linhas, janela_meses)` (padrão 12, expansão automática), `deflateRows` com `itbi_price_index`, `calculateITBIData` com método **`mad` fixo** (não lê a configuração da organização).

Resposta: `min_m2` (P10), `med_m2` (mediana), `media_ponderada_m2`, `mediana_ponderada_m2`, `max_m2` (P95), `transaction_count` (escrituras antes do corte) e `meta` (inclui `limites_escopo` = `logradouro` | `bairro` e `limites_bairro`). Sem linhas: `stats: null` e mensagem "Dados insuficientes para esta localização".

Sugestões de rua (`action: 'suggestions'`): até 100 linhas `ILIKE` no bairro, agregadas por `logradouro` somando `total_transacoes`; condomínios de `condominios_mapeamento` primeiro, depois por escrituras desc; 10 resultados.

O nome do bairro é resolvido para a grafia gravada na base por `_shared/bairrosRio.ts` (lista oficial de 157 bairros da API, com código e acento; `resolverNomeBairro("barra olimpica")` devolve `BARRA OLÍMPICA`); até 2026-09-03 a função comparava o texto digitado em maiúsculas e devolvia "dados insuficientes" para qualquer bairro acentuado escrito sem acento. Diferenças em relação ao motor interno: filtro de bairro por igualdade (não `ILIKE`), logradouro sem variantes de grafia, sem cadeia rua → raio → bairro, sem relaxamento de tipologia, piso/teto por rua (só aqui), método sempre MAD.

---

## 10. Parecer Técnico (`parecer-nucleo`)

Edge function de "segunda opinião": lê só dados oficiais com um papel Postgres restrito, não recalcula o motor. Entrada: `logradouro`, `bairro`, `numero?`, `nome_condominio?`, `tipologia?`, `periodo_meses` (6 a 120, **padrão 60**).

ITBI: `logradouro_norm = normalizar_logradouro(logradouro)` (função SQL; fallback `ILIKE '%logradouro%'`), `data_transacao >= hoje − periodo_meses`, `[tipologia =]`, `LIMIT 5000`. **Sem** filtro de uso, de bairro, de `percentual_transferido` nem de piso/teto. Estatística: `calculateITBIData` com MAD (seção 2.7 e 2.8) sobre linhas com `valor_m2 > 0` e `total_transacoes > 0`, **sem** correção temporal e sem janela móvel. Saída: `valor_m2_medio_ponderado`, `valor_m2_mediana_ponderada`, `valor_m2_min` (P10), `valor_m2_max` (P95), `q1`, `q3`, `iqr` (quantis ponderados de toda a amostra, informativos), `spread_pct = (P95 − P10) / média × 100`, `n_transacoes` (escrituras dos sobreviventes), `n_linhas_agregadas`, `linhas_descartadas_iqr` (nome legado: são as descartadas pelo MAD).

IPTU: tabela `iptu_logradouro_resumo` (populada pela ingestão do IPTU; colunas `valor_venal_medio`, `preco_real_medio_itbi`, `total_transacoes_itbi`, `desconto_venal_percentual`, `area_media_unidade`, `total_imoveis`); busca em cascata `logradouro_norm + tipologia` → `logradouro_norm` → `ILIKE`; `valor_venal_agregado` = média de `valor_venal_medio` ponderada por `total_imoveis`. Territorial: `condominios_mapeamento` (preço médio, escrituras, padrão), `microbairros_geo`.

O `analista-imobiliario` (IA) recebe esse núcleo e o resultado do motor e comenta divergências; a regra escrita no prompt é `média = Σ(valor_m2 × total_transacoes) / Σ(total_transacoes)`.

---

## 11. Assistente de mercado (`chat-mercado`, Sofia)

Dados calculados a cada pergunta e enviados ao modelo: resumo da cidade no **ano corrente (YTD)** (`uso = 'Residencial'`, `percentual >= 90`, `valor_m2 IS NOT NULL`, paginado em blocos de 1000 desde 2026-09-03, sem piso/teto): escrituras totais, média ponderada de R$/m², número de bairros; ranking dos 20 bairros por escrituras e dos 10 mais caros por média ponderada (mínimo 10 escrituras); para bairros, logradouros (`ILIKE`, `LIMIT 500`) e condomínios citados na pergunta, média ponderada de R$/m² e de valor de transação e escrituras; consulta específica por ano/bairro/valor/área/tipologia (`LIMIT 5000`). Tudo por média ponderada; sem mediana, sem corte de outliers.

---

## 12. Ingestão (`sync-itbi-prefeitura`, `sync-itbi-daily`)

Fonte: API ArcGIS da Prefeitura do Rio (camada de ITBI agregado), por código de bairro. Por feature:

```
valor  = média_valor_transação;  area = média_área_construída;  tt = total_transações (padrão 1)
percentual = média_percentual_transferido (padrão 100)
descarta: logradouro vazio, valor ou área nulos/<= 0; percentual < 90;
          área fora de [20; 5000] m²; valor fora de [30 mil; 200 milhões]; valor/área fora de [500; 300 000]
          (LIMITES_INGESTAO em _shared/itbiIngestion.ts; até 2026-09-03 o piso de valor era 100 mil, ver 15.1 item 12)
valor_m2 = valor / area
data_transacao = 'ano-mês-15' (dia 15 fixo; sem mês: 'ano-06-15')
bairro = nome da API em maiúsculas (ou mapa de código → nome)
uso = 'Comercial' se o texto contém "não residencial"/"comercial", senão 'Residencial'
tipologia = Apartamento (apartamento|apto|flat|cobertura) | Casa (casa|sobrado|residencia) | Terreno | Comercial (sala|loja|escritório) | padrão Apartamento
```

As regras de aceitação vivem em `supabase/functions/_shared/itbiIngestion.ts` (`validarFeatureItbi`) e são as mesmas nas duas cargas. `sync-itbi-daily` reimporta o mês corrente e o anterior por upsert na chave natural (`logradouro, bairro, data_transacao, uso, tipologia`) e chama `refresh_itbi_price_index()`. Até 2026-09-03 a carga diária não aplicava filtro nenhum e não gravava `total_transacoes` nem `percentual_transferido`: cada linha nova dos dois meses mais recentes entrava com peso 1 e percentual 100 (os defaults da tabela), até a carga completa passar de novo pelo mês. Desde o PR #20 grava peso e percentual e rejeita o que a carga completa rejeita; os limites usados ficam registrados em `etl_log.detalhes.limites_ingestao` a cada carga completa. Antes do upsert, as duas cargas mesclam os agregados que caem na mesma chave natural (`mesclarDuplicatasItbi`: escrituras somadas; valor, área e percentual ponderados pelas escrituras), porque a fonte traz tipologias distintas que viram a mesma classe e o Postgres rejeita duas linhas da mesma chave no mesmo comando. `sync-itbi-prefeitura` (carga completa por bairro ou de toda a cidade) também faz upsert na chave natural; com `clearExisting`, **desde 2026-09-03** não apaga nada antes de inserir: as linhas existentes são atualizadas preservando `lat`, `lng`, `geom`, `microbairro` e `geocodificado_via`, e só depois as linhas do período que a Prefeitura deixou de publicar (não tocadas pela sincronização, `updated_at` anterior ao início) são removidas. Antes dessa data a função apagava o período inteiro e reinseria, o que perdia a geocodificação (incidente da seção 1.1). Toda execução grava em `etl_log` (`fonte = sync_itbi_prefeitura`): usuário e e-mail do JWT, modo (bairro ou todos), `clear_existing`, período, contagens da API, registros válidos, inseridos, obsoletos removidos e status final. Geocodificação (`lat`, `lng`, `geom`) e `microbairro` são preenchidos por funções separadas, depois da carga; `logradouro_norm` pela função SQL da seção 2.9.

Consequência para a comparação: como `data_transacao` é sempre dia 15, uma janela "últimos 12 meses" iniciada em 2025-09-03 inclui setembro/2025 inteiro (dia 15 ≥ dia 3) mas uma janela iniciada em 2025-09-20 exclui. A Prime Circle precisa usar a mesma convenção de data.

---

## 13. Glossário de contagens e mapa de coerência entre telas

| Rótulo na tela | O que é |
|---|---|
| Registros ITBI (agregações mensais) | `COUNT(*)` de linhas |
| Escrituras / Escrituras Reais (transações) / Liquidez | `SUM(total_transacoes)` |
| "Transações" no PDF do Parecer e no gráfico histórico | `SUM(total_transacoes)` |
| `transaction_count` (metadados) | escrituras antes do corte de outliers |
| `escrituras_validas` (metadados) | escrituras depois do corte |

Onde cada tela diverge do motor (todas usam `uso = Residencial` e `valor_m2 IS NOT NULL`):

| Tela | Janela | Piso/teto | Percentual ≥ 90 | Estatística central | Corte de outlier | Correção temporal |
|---|---|---|---|---|---|---|
| Parecer (motor) | móvel 12 m, expande até 8 linhas (máx 60 m) | piso e teto bairro × tipologia | sim | mediana ponderada; P10/P95 | MAD log (config.) | sim |
| Site público | idem | por rua (≥ 8 linhas e ≥ 40 escrituras) ou bairro | sim | idem | MAD fixo | sim |
| Pesquisa por logradouro | N meses (12) | só teto | sim | média ponderada por logradouro | nenhum | não |
| Busca avançada | anos inteiros | só teto | sim | média ponderada; CAGR de médias anuais | nenhum | não |
| Dashboard KPIs | YTD ou 12 m; variação 12 m × 12 m | só teto | sim | média ponderada | nenhum | não |
| Evolução | desde 2020, semestre/ano | só teto | sim | média ponderada | nenhum | não |
| Ranking microrregiões (painel) | 12 m | só teto | sim | média e mediana ponderadas | nenhum | não |
| Microrregiões (tabela) | 12 m | só teto | sim | média ponderada | nenhum | não |
| Comparativo de ruas | N meses (12; 60 em Microrregiões), sem bairro | só teto | sim | média e mediana ponderadas | nenhum | não |
| Mapa | N meses (12) | só teto | sim | média ponderada | nenhum | não |
| Análise histórica | 5 anos fechados | piso e teto do bairro (em memória) | sim | mediana e média por ano (expansão por peso) | Tukey simples por ano | não |
| Parecer técnico | 60 m (param.) | nenhum | **não** | mediana ponderada; P10/P95 | MAD | não |
| Sofia (chat) | YTD | nenhum | sim | média ponderada | nenhum | não |

### 13.1 Divergências fechadas em 2026-09-03

Encontradas durante a escrita das duas especificações e corrigidas no mesmo dia (parte via Lovable, parte via auditoria; as duas trilhas convergiram no merge). O sistema externo deve seguir a forma corrigida.

| Local | Antes | Agora |
|---|---|---|
| Exports do painel e backup completo (`Dashboard.tsx`) | consultas sem `.limit()`: o PostgREST devolvia no máximo 1000 linhas, em silêncio | paginação em blocos de 1000 até esgotar, ordenação estável por `id` |
| Resumo da cidade e do bairro na Sofia (`chat-mercado`) | idem, truncado em 1000 linhas | paginação em blocos de 1000 |
| Tabela de Microrregiões (`useMicrobairroDetalhado`) | sem filtro de `percentual_transferido` | `percentual_transferido >= 90`; cache `v8` |
| Ranking de microrregiões (`useMicrobairroRanking`) | média e mediana **simples** por linha | média ponderada `Σ(valor_m2 × w) / Σ w` e mediana ponderada posicional (`resumoPonderado`); cache `v7` |
| `useKPIStats` duplicado em `useITBITransactions.ts` | segunda implementação, não ponderada, sem filtro de percentual, sem uso | removido; fonte única é `src/hooks/useKPIStats.ts` |
| `useKPIStats.ts` e `useITBITransactions.ts` | `.limit(10000)` | `.limit(5000)`, o padrão do produto |
| Análise histórica (`useHistoricalTransactionAnalysis`) | sem filtro de `percentual_transferido` nas quatro consultas e na RPC de raio | `percentual_transferido >= 90` em todas; RPC `itbi_transacoes_raio` reescrita na migration `20260903160000` (`CREATE OR REPLACE`, precisa ser aplicada); cache local `v17` |
| `Microbairros.tsx` comparativo de ruas | 72 meses | 60 meses (dentro do conjunto padrão) |
| `_shared/outlierLimits.ts` | campo `p99` guardava o P99,5 | campo renomeado para `p995` |
| `sync-itbi-prefeitura` com `clearExisting` | apagava o período antes de reinserir; geocodificação perdida a cada recarga | upsert preservando colunas de geocodificação; varredura posterior de linhas obsoletas por `updated_at` |
| `valuationCalculations.ts`, `valuationPdfExport.ts` | limiares de spread 30/40/55 calibrados para P10–P90, com a faixa já em P10–P95 | 35/50/65 e rótulos do PDF 27/37/50, calibrados com a consulta 7.5 em P95 (`docs/calibracao/bloco75-spread-2026-09-03.csv`) |
| `_shared/outlierLimits.ts`: Centro, Flamengo, Santo Cristo, Glória | tetos defasados, cortando 5,0 %, 4,6 %, 9,1 % e 17,2 % das escrituras | regenerados na 3ª rodada; na 4ª rodada a tabela inteira (59 pares ≥ 100 escrituras) foi regenerada com a consulta 7.4 sem filtro por nome (`docs/calibracao/bloco74-3anos-p995-2026-09-03.csv`) |
| `sync-itbi-prefeitura` | sem trilha de auditoria; carga completa de 15:06 UTC sem autor identificável | grava início, fim, usuário, modo, `clearExisting`, período e contagens em `etl_log` |
| `SyncITBIButton.tsx` | recarga do período (`clearExisting`) ligada por padrão | desligada por padrão |
| `_shared/outlierLimits.ts`: 18 pares de amostra pequena e Barra Olímpica | valores da calibração anterior à recarga, parte com amostra parcial pelo filtro sem acento; Barra Olímpica com 411 escrituras de uma base que já não existe | regenerados com a consulta 7.4b em 5 anos e regra de largura mínima (seção 2.5); Barra Olímpica removida (bairro reclassificado como Barra da Tijuca desde a migration `20260521155956`) |
| `sync-itbi-prefeitura`: piso de valor na ingestão | descartava `valor_transacao < 100000`; em Santa Cruz, Campo Grande e Guaratiba isso apagava mais escrituras do que mantinha (bloco 7.11) | piso de R$ 30 mil em `_shared/itbiIngestion.ts`, compartilhado pelas duas cargas; erro de digitação segue barrado por área e R$/m². Base ainda não recarregada (pendência 13) |
| `sync-itbi-daily` | sem filtro de percentual nem de faixas; não gravava `total_transacoes` nem `percentual_transferido` (linhas novas com peso 1 e percentual 100) | usa `validarFeatureItbi`, grava peso e percentual, conta rejeições no log |
| `public-itbi-stats`: filtro de bairro | `bairro = UPPER(TRIM(texto))`; "Jacarepagua", "Gloria" ou "Barra Olimpica" sem acento não casavam e o site devolvia "dados insuficientes" | `resolverNomeBairro` (lista oficial de 157 bairros em `_shared/bairrosRio.ts`) antes de toda consulta |
| `_shared/itbiMarketStats.ts`: corte de outliers | MAD/IQR aplicado sempre que as cercas existissem, exceto se sobrassem menos de 3 escrituras; em bairros bimodais removia até 22 % da amostra | salvaguarda `MAX_OUTLIER_CUT_SHARE` = 15 %: acima disso o corte é ignorado e `outlier_cut_skipped = "bimodal"`; `ENGINE_VERSION` 4 |
| `sync-itbi-prefeitura` e `sync-itbi-daily`: chave natural repetida no lote | a API devolve mais de um agregado para a mesma chave (tipologias que viram a mesma classe); o upsert falhava com `ON CONFLICT DO UPDATE command cannot affect row a second time` e o lote inteiro de 500 linhas era perdido em silêncio (carga das 17:12: 10 lotes) | `mesclarDuplicatasItbi` soma as escrituras e pondera valor, área e percentual antes do upsert; contagem em `etl_log.detalhes.duplicatas_mescladas` |
| `sync-itbi-prefeitura`: `etl_log.detalhes` | o update de encerramento sobrescrevia o objeto inicial e `limites_ingestao` sumia da linha final | o encerramento grava `limites_ingestao`, `registros_unicos` e `duplicatas_mescladas` junto com as contagens |

---

## 14. Roteiro de comparação com a Prime Circle

A comparação só é válida se os dois sistemas partirem da **mesma amostra**. Ordem obrigatória:

### 14.1 Igualar a amostra antes de comparar preço

Para um caso fixo (sugestão: Avenida do Pepe, Barra da Tijuca, Apartamento; e um bairro inteiro, Tijuca, Apartamento), cada sistema devolve:

| Item | Analytics (valor esperado) | Prime Circle |
|---|---|---|
| filtros aplicados (uso, percentual, valor_m2 not null) | seção 3.1 | |
| bairro normalizado usado | | |
| variantes de logradouro usadas | seção 2.9 | |
| janela efetiva (data inicial e final) | `janela_inicio` / `janela_fim` dos metadados | |
| piso e teto aplicados e escopo | `piso_m2`, `teto_m2` | |
| `COUNT(*)` de linhas | `linhas_agregadas` | |
| `SUM(total_transacoes)` | `transaction_count` | |
| método de outlier, linhas e escrituras descartadas | `outlier_method`, `linhas_descartadas`, `escrituras_validas` | |
| correção temporal (sim/não, trimestre) | `deflacionado`, `trimestre_referencia` | |

Enquanto `COUNT(*)` e `SUM(total_transacoes)` não coincidirem, qualquer diferença de preço é diferença de amostra, não de método.

### 14.2 Comparar as fórmulas

| Grandeza | Analytics | Verificar na Prime Circle |
|---|---|---|
| valor de referência | mediana ponderada por escrituras dos sobreviventes | mediana ou média? ponderada? de linhas ou de escrituras? |
| faixa | P10 e P95 ponderados | quais percentis? ponderados? |
| corte de outlier | MAD em log, k 2,5/3,0, ≥ 8 linhas; cinto P0,5×0,85 / P99,5×1,15 por bairro | método, parâmetros, ordem |
| janela | móvel, 12 meses padrão, expande até 8 linhas | fixa? qual? |
| origem da amostra | rua → (raio) → bairro com penalidades | rua? bairro? raio? |
| correção temporal | índice trimestral próprio, ln-mediana ponderada | nenhuma? IPCA? |
| valor final | mediana × área × (1 + ajuste) × documentação | como aplica características? |
| confiança | tabela da seção 3.5 | existe? como? |

### 14.3 Como decidir "qual é melhor"

Nenhuma das duas metodologias pode ser declarada melhor por argumento. O teste é empírico: um conjunto de **vendas reais fechadas** (20 ou mais, com endereço, tipologia, área, data e preço), avaliadas pelos dois sistemas **na data da venda**, e medidos:

- erro mediano absoluto percentual (`|estimado - real| / real`);
- viés (mediana do erro com sinal);
- cobertura da faixa (% de vendas reais dentro de pessimista–otimista);
- largura mediana da faixa.

O sistema com menor erro e cobertura mais próxima de 80 a 90 % com a faixa mais estreita é o melhor. Sem esse conjunto, a comparação fica em "qual método é mais defensável", que é a seção 15.

### 14.4 Checklist de aceite

Marcar item a item. O alinhamento só é declarado quando todos estão verdes. Os casos citados são os da seção 16.

**Amostra**
- [ ] Relatório exibe **Registros** e **Escrituras Reais** como números separados e rotulados.
- [ ] Filtros `uso = 'Residencial'`, `percentual_transferido >= 90`, `valor_m2 IS NOT NULL` aplicados em toda consulta.
- [ ] `LIMIT 5000` explícito, com `ORDER BY` determinístico.
- [ ] Bairro normalizado (maiúsculas, sem acento, espaços colapsados) antes de comparar.
- [ ] Busca por logradouro expande tipo de via, títulos/patentes e variantes de grafia (seção 2.9).
- [ ] Caso 2a reproduz 28 registros / 71 escrituras buscando por "Desenhista Luiz Guimarães" (base de 2026-09-03, 15h).
- [ ] Caso 3 reproduz 5 registros / 12 escrituras buscando por "Avenida General Olyntho Pilar".

**Estatística**
- [ ] Toda média de preço é ponderada por `total_transacoes`.
- [ ] Mediana e percentis são ponderados, com a convenção posicional da seção 2.3.
- [ ] Cinto de outlier por bairro × tipologia carregado com os 144 pares do Apêndice B (gerados por `bun run cinto` da 7.4 unificada), usando **P99,5** (não P99) no teto e a regra de largura mínima nos 78 pares de amostra pequena.
- [ ] Calibração de piso e teto por logradouro (≥ 8 linhas e ≥ 40 escrituras) **só no site público**; o motor interno usa o cinto do bairro (ver ressalva 3 da seção 15).
- [ ] Corte MAD em log com `k_inf = 2,5` e `k_sup = 3,0`, mínimo de 8 linhas, e salvaguarda de bimodalidade (corte acima de 15 % das escrituras é ignorado).
- [ ] Salvaguarda anti-colapso (<3 escrituras sobreviventes ⇒ mantém amostra inteira).
- [ ] Janela padrão de **12 meses**, com opções 24/36/48/60 e expansão automática abaixo de 8 linhas.
- [ ] Consulta traz sempre 60 meses; o recorte da janela é feito em memória.
- [ ] Expansão automática de janela é declarada ao usuário.
- [ ] Deflação pelo índice de preços aplicada, com fator limitado a [0,5 · 2,0] e trimestre de referência exibido.

**Avaliação**
- [ ] Base de referência é **100% ITBI**; anúncios entram apenas como gap.
- [ ] Gap só é calculado com ≥3 anúncios, e é limitado a ±35%.
- [ ] Faixa final = P10 / mediana / P95 × área × (1+ajuste) × fator de documentação, **sem compressão de spread**.
- [ ] Caps por categoria e cap global de ±35% conforme a seção 4.2.
- [ ] Score de confiança com as 6 penalidades e o teto por tamanho de amostra (40/55/75).
- [ ] Metadados da seção 2.8 persistidos em toda avaliação.

**Fallback**
- [ ] Ordem rua → 100 m → 300 m → bairro, com `MIN_ROWS_SCOPE = 8` (degraus de raio só com a configuração ligada; hoje desligada).
- [ ] Bairro só é usado quando rua e raios não têm **nenhuma** ocorrência.
- [ ] Origem da amostra persistida e **exibida** no relatório e no PDF.
- [ ] Penalidades de origem (0 / −5 / −10 / −15) e de tipologia (−5) aplicadas.

**Baselines**
- [ ] Caso 1 (Av. do Pepê) reproduz as 5 janelas dentro de ±1%.
- [ ] Caso 2c (série anual) reproduz os 7 anos dentro de ±1% (2026 com 3 registros / 6 escrituras).
- [ ] Caso 4 reproduz as 12 médias ponderadas dentro de ±1%.
- [ ] Caso 5 reproduz resultado idêntico com e sem cinto.

**Transparência**
- [ ] "Dados insuficientes" é exibido no lugar de número frágil.
- [ ] Período mostrado com as **datas efetivas**, não só o rótulo.
- [ ] Badge explicando que o ITBI é base agregada e registra valor de escritura, não preço de anúncio.

---


---

## 15. Ressalvas e plano de ação (auditoria)

Esta seção não descreve o código; avalia decisões e diz o que fazer com elas. Está separada do corpo para que a comparação com a Prime Circle não trate como calibrado o que não foi. Tem quatro partes: o que ainda precisa ser corrigido no Analytics (15.1), o que o Prime Circle deve adotar, evitar e ajustar tomando este documento como referência (15.2), as decisões que continuam abertas e são do dono do produto (15.3) e o protocolo que decide entre os dois sistemas (15.4).

### 15.0 Recalibração SMF em 2026-10-21 e decisão de 2026-10-22

Correção dos denominadores informados: 163.015 → 314.620 escrituras consolidadas (**1,93×**, não quase quatro vezes); 38.197 → 140.861 linhas, devido ao agrupamento mais fino rua × mês × tipologia. Snapshot atual da tabela individual: 330.854 linhas brutas, 320.627 aceitas, nenhuma rejeitada por fora_do_cinto. Esses denominadores são diferentes.

**Diagnóstico fornecido pelo usuário, medido anteriormente e não reexecutado nesta rodada:**

| Par | Acima do teto vigente | Abaixo do piso vigente |
|---|---:|---:|
| Santa Cruz / Apartamento | 77,8% | 8,0% |
| Anil / Casa | 14,1% | 3,5% |
| Bangu / Casa | 11,2% | 5,3% |
| Ipanema / Apartamento | 5,1% | 0,5% |
| Barra da Tijuca / Apartamento | 2,8% | 0,6% |
| Copacabana / Apartamento | 1,8% | 0,7% |

Santa Cruz: teto vigente 3.724 e mediana real informada 3.716. Comparação informada de limites nominais em 3 anos, Apartamento:

| Bairro | Sobre médias de grupos | Sobre escrituras |
|---|---:|---:|
| Barra da Tijuca | 5.358 / 28.111 | 4.213 / 34.461 |
| Copacabana | 5.231 / 31.209 | 4.003 / 39.272 |
| Botafogo | 5.176 / 22.816 | 4.276 / 25.186 |
| Ipanema | 8.552 / 60.000 (travado) | 6.831 / 83.561 (sem trava) |

Demais diagnósticos informados: mediana do apartamento na Barra 9.217 (2021) → 12.855 (2026), +39%; 62 escrituras acima de 60.000/m² em 3 anos (Ipanema 36, Leblon 16); Bangu/Casa P1 631; 49 pares entre 100 e 199 escrituras. Comercial na Barra: sala mediana 7.231/P99,5 26.759; loja mediana 7.516/P99,5 40.388. Cercas IQR em log descartadas: cortam 12–19% em Santa Cruz, contra 0,1–0,8% de percentis com margem nos bairros testados pelo usuário. Manter percentis; não mudar MAD.

**Medição desta rodada:** 903 linhas no CSV 7.4; uma linha na 7.4b. Tabela candidata: 318 pares. Aceite nominal individual nos últimos 12 meses, conforme consulta solicitada: 316 pares com observações; cinco pares padrão acima de 2%.

| Par | Escrituras 3 anos | n 12 meses | Piso | Teto | Fora |
|---|---:|---:|---:|---:|---:|
| VARGEM PEQUENA / Casa | 283 | 80 | 1193 | 16271 | 3.75% |
| IPANEMA / Comercial | 235 | 83 | 6844 | 155930 | 2.41% |
| ANIL / Casa | 242 | 85 | 789 | 9686 | 2.35% |
| JACAREPAGUA / Apartamento | 4635 | 1002 | 2046 | 15742 | 2.30% |
| PENHA CIRCULAR / Apartamento | 373 | 133 | 1105 | 9911 | 2.26% |

Controles atendidos: Santa Cruz/Apartamento **0,00%** fora, piso 890/teto 7.337; Ipanema/Apartamento teto **84.363**; Leblon/Apartamento teto **71.100**; Bangu/Casa piso **560**. Limites em R$/m².

Arquivos em `docs/calibracao/`: `bloco74-escrituras-2026-10-21.csv`, `bloco74b-cidade-2026-10-21.csv`, `bloco74-aceite-2026-10-21.csv`, `bloco74-candidatos-2026-10-21.csv`. Gerador executado em modo candidato e **123 testes passaram, nenhum falhou**. Decisão: não aplicar novos limites, não reimplantar funções e não substituir o Apêndice B vigente até o usuário avaliar as cinco exceções. Resolução Comercial/fallback e testes de integração aguardam essa liberação. Critério de aceite não foi flexibilizado automaticamente.

#### Investigação das exceções (2026-10-21, antes de aplicar)

O usuário escolheu investigar, não aceitar exceções. Nenhum limite de produção foi substituído.

**Dois problemas de comparabilidade encontrados na consulta de aceite fornecida:**
1. A calibração corrige preços ao trimestre de referência; o aceite original compara preços nominais. Em Jacarepaguá/Apartamento, 23/1.002 fora (22 baixos + 1 alto), 2,2954%, passa a 20/1.002 (19 baixos + 1 alto), **1,9960%** na base corrigida, arredondado a 2,00%.
2. A calibração exige uso Comercial para tipologia Comercial, mas o aceite original não filtra uso. Em Ipanema/Comercial a amostra de 12 meses passa de 83 a 75 ao alinhar uso; ambos os cortes baixos desaparecem e o resultado é **0/75, 0,00%**. Há registros com tipologia Comercial e uso diferente de Comercial; não devem ser avaliados pelo cinto calibrado só sobre uso Comercial.

Restam três exceções mesmo comparando valores corrigidos e usos iguais à calibração:

| Par | n 12 meses | Abaixo | Acima | Fora | Fora nos 3 anos (mesmo cinto) |
|---|---:|---:|---:|---:|---:|
| Vargem Pequena / Casa | 80 | 3 | 0 | 3,75% | 5/283 = 1,767% |
| Anil / Casa | 85 | 2 | 0 | 2,35% | 2/242 = 0,826% |
| Penha Circular / Apartamento | 133 | 3 | 0 | 2,26% | 4/373 = 1,072% |

Os mesmos cortes baixos concentram-se nos últimos 12 meses: Anil no trimestre 2026-07; Penha Circular nos trimestres 2025-10 e 2026-01; Vargem Pequena em 2025-10, 2026-01 e 2026-07. Não são cortes do teto nem explicados pela correção temporal. Nas cinco amostras de 12 meses, nenhum registro elegível está fora das travas nominais de ingestão 500/300.000. Isso não prova que cada escritura barata é mercado válido: a origem deve ser conferida de forma privada, sem exposição de endereço/apartamento/valor individual. Amostra total >=200 em 3 anos não garante que os cortes recentes fiquem <=2% em uma subjanela menor.

**Impacto ainda não aplicado:** o app filtra preço nominal antes de corrigir (`Step1Location.tsx`, `public-itbi-stats`); uma tabela calibrada em preços corrigidos não pode ser inserida nessa posição sem alinhar a base temporal. O motor estatístico e MAD não foram alterados. Precisará ser corrigida a coleta/aplicação dos limites, não os métodos do motor, após a decisão sobre o aceite.

Consulta reproduzível: `docs/calibracao/bloco74-investigacao-2026-10-21.sql`. CSVs: `bloco74-investigacao-nominal-corrigido-2026-10-21.csv`, `bloco74-investigacao-trimestres-2026-10-21.csv`, `bloco74-investigacao-janelas-2026-10-21.csv`, `bloco74-investigacao-mesmo-uso-2026-10-21.csv`. O CSV de janelas preserva o uso irrestrito do aceite original para demonstrar a diferença de população; não é calibração nova.

**Conclusão da investigação:** os cinco alertas originais eram dois problemas de comparação e três concentrações reais de cortes baixos recentes. Com P1 o aceite alinhado ainda deixava três exceções. A decisão está logo abaixo.

#### Decisão de 2026-10-22: piso P0,5, aceite atendido

As três exceções restantes eram cortes baixos recentes de vendas baratas, não erros de digitação. O piso passou de P1 × 0,85 para **P0,5 × 0,85** em todos os pares e na faixa da cidade. O teto, as margens, a regra de amostra pequena e o MAD não mudaram.

**Critério de aceite corrigido.** Mesma população da calibração: escrituras com `aceita OR motivo_rejeicao = 'fora_do_cinto'`, uso Residencial para Apartamento/Casa e uso Comercial para Comercial, preço corrigido ao último trimestre, últimos 12 meses. Um par reprova quando passa de 2% de corte **e** tem mais de 3 vendas cortadas. Com 20 a 50 vendas no ano, uma ou duas vendas já passam de 2%, e isso não indica cinto mal calibrado.

**Resultado sobre a tabela final (317 pares; consulta reproduzível em `docs/calibracao/bloco74c-aceite.sql`):**

| Faixa | Pares | Vendas 12 meses | Abaixo | Acima | Cortado | Acima de 2% | Reprovados |
|---|---:|---:|---:|---:|---:|---:|---:|
| Padrão (3 anos) | 102 | 38.835 | 84 | 45 | 0,33% | 0 | 0 |
| Amostra pequena (5 anos) | 215 | 5.308 | 20 | 7 | 0,51% | 20 | 0 |

Os 20 pares de amostra pequena acima de 2% têm uma ou duas vendas cortadas cada.

Controles: Santa Cruz/Apartamento 0/659; Vargem Pequena/Casa 0/80; Ipanema/Comercial 0/75; Anil/Casa 1/85; Penha Circular/Apartamento 1/133; Jacarepaguá/Apartamento 7/1.002.

**Variantes descartadas para a amostra pequena**, testadas sobre os mesmos 215 pares:

| Variante | Reprovados | Cortado |
|---|---:|---:|
| Extremos P0,5/P99,5 com largura mínima (adotada) | 0 | 0,49% |
| P5/P95 × 1,15 | 13 | 4,60% |
| P5/P95 × 1,5 | 1 | 1,45% |

**Outras correções da mesma rodada:**
- `DEFAULT_OUTLIER_MAX` deixa de vir de par de amostra pequena: Copacabana/Casa, com 60 escrituras, levava o teto da cidade a 90.965.
- Limites do app convertidos para preço da época, piso e teto (seção 2.5).
- Bairro `DESCONHECIDO` fora da calibração.
- Comercial resolvido para sala, loja e escritório. O fallback do bairro usa só Apartamento/Casa.

**Arquivos:** `docs/calibracao/bloco74-escrituras-p05-2026-10-22.csv`, `docs/calibracao/bloco74b-cidade-p05-2026-10-22.csv`, a carga gerada `docs/calibracao/cinto-2026-10-21.sql` e o aceite `docs/calibracao/bloco74c-aceite.sql`.

**O que falta, e depende de autorização para escrever em produção:**
1. Carregar `itbi_cinto` com o SQL gerado. Enquanto a tabela estiver vazia, `itbi_consolidar_smf()` para com erro e a carga mensal não consolida.
2. Simular com `itbi_aplicar_cinto('2019-01-01', current_date, null, false)` e conferir por bairro.
3. Depois do merge e da publicação, reconsolidar a cidade pelo painel /admin.

#### Decisão de 2026-10-22: regras por prédio (fora de mercado e exceção)

A auditoria das 1.375 escrituras cortadas (`AUDITORIA-CINTO-2026-10-21.md`, fora do repositório) mostrou dois problemas que a faixa por bairro não resolve. Cerca de 240 vendas reais foram cortadas porque o prédio é caro para o bairro. E vendas por uma fração do valor do resto do prédio, com a mesma área, passavam pelo cinto e entravam nas avaliações. O dono do produto pediu que essas transações (partilha, doação, venda entre parentes) fossem expurgadas da base. A seção 2.5 descreve as duas regras.

**Simulação antes de aplicar** (`bloco74d-simulacao-regras-predio.sql`, 2019 a setembro de 2026, 314.620 escrituras):

| Ano | Avaliadas | Fora de mercado (50%) | Das quais aceitas hoje | Fora de mercado com 40% | Exceções por prédio | Fora do cinto depois |
|---|---:|---:|---:|---:|---:|---:|
| 2019 | 28.685 | 254 | 228 | 99 | 20 | 152 |
| 2020 | 31.452 | 160 | 147 | 42 | 16 | 135 |
| 2021 | 43.393 | 400 | 378 | 116 | 14 | 130 |
| 2022 | 38.768 | 361 | 338 | 104 | 15 | 104 |
| 2023 | 41.158 | 513 | 462 | 149 | 26 | 138 |
| 2024 | 47.838 | 682 | 646 | 211 | 16 | 143 |
| 2025 | 46.602 | 977 | 934 | 406 | 11 | 117 |
| 2026 até set. | 36.724 | 1.020 | 978 | 453 | 1 | 94 |
| **Total** | **314.620** | **4.367** | **4.111** | **1.580** | **119** | **1.013** |

Resultado na base: aceitas de 313.245 para 309.240.

- **Onde pesa:** apartamentos de 2025 em Santa Cruz (13,4% das vendas), Campo Grande (10,1%), Bonsucesso (7,7%) e Guaratiba (5,2%). Nos outros bairros com 200 ou mais vendas, abaixo de 4%, com a mediana mudando menos de 2%. Em Bonsucesso a mediana sobe 14,4%: dois conjuntos com mais de 160 vendas cada têm unidades de 40 m² escrituradas por R$ 88 a 130 mil, enquanto o mesmo conjunto vende a cerca de R$ 230 mil.
- **Por que 50% e não 40%:** a leitura de 30 casos mostrou quase só preço fora de mercado abaixo de 40% e cerca de 6 em 10 entre 40% e 50%. Os conjuntos subsidiados ficam justamente entre 38% e 47% do próprio prédio. Com 40% eles continuariam na base.
- **Exceção e filtro do app:** das escrituras poupadas pela exceção, nenhuma cai numa linha de `itbi_transactions` que o filtro secundário do app cortaria (teto ÷ 0,9667).
- **Limitação:** a regra só age onde o prédio tem 2 ou mais referências de área parecida dentro do cinto. Casas isoladas e prédios com poucas vendas continuam dependendo só do cinto e do MAD.

### 15.1 Pendências no Analytics, por prioridade

**Proteção pré-agregação (2026-10-21):** `public.itbi_cinto` guarda bairro normalizado, tipologia, piso, teto, janela, escrituras e calibrado_em; autenticados têm apenas SELECT. `CIDADE|*` contém a faixa geral, sem usar o maior teto residencial. `bun run cinto <csv 7.4> <csv 7.4b> --candidate=<temporário>` também gera `docs/calibracao/cinto-AAAA-MM-DD.sql`, transacional com TRUNCATE/INSERT, sem executar a carga. Aceite pendente continua impedindo ativação da tabela candidata.

`itbi_aplicar_cinto(inicio,fim,bairro,false)` demonstra as contagens por bairro sem modificar dados; `true` apenas marca as escrituras, sem consolidar a cidade. Preços individuais são corrigidos com o mesmo índice trimestral da consulta 7.4 antes do teste inclusivo piso/teto. Falta de índice ou faixa da cidade interrompe o processamento, sem filtro nominal silencioso. Reavalia somente aceitas ou rejeitadas por fora_do_cinto: outros motivos permanecem intactos, e rejeições pelo cinto podem ser revertidas numa carga aprovada posterior. `itbi_consolidar_smf` executa a marcação antes de agregar e retorna o resumo por bairro. Nenhuma reconstrução da base real foi feita nesta etapa. Teste transacional reproduzível: `docs/calibracao/teste-cinto-pre-agregacao.sql` (venda boa de 12.000/m² preservada, erro de 300.000/m² removido antes da média).

Simulação sobre toda a base elegível com uso alinhado à calibração: **1.943 de 312.788 escrituras** seriam rejeitadas, em 161 bairros avaliados. Resultado completo: `docs/calibracao/cinto-impacto-por-bairro-2026-10-21.csv`. São contagens simuladas, não escrituras efetivamente marcadas. A tabela permanece vazia enquanto o aceite estiver pendente; novas consolidações interrompem com mensagem explícita de carga aprovada necessária. Relatórios atuais não foram reconstruídos. O teste transacional no banco passou com uma escritura agregada a 12.000/m²; 14 testes do gerador passaram.

Estado em 2026-09-03, 16h, depois da segunda rodada de consultas (resultados em `docs/calibracao/`).

| # | Prioridade | Problema | O que fazer | Como validar |
|---|---|---|---|---|
| 0 | Fechada | Geocodificação perdida na recarga de 2026-09-03. | Backfill a partir de `logradouros_geo` executado às 15:59: 31.369 de 31.500 linhas (99,6 %); 131 restantes em cerca de 104 ruas de volume marginal, etapa Google dispensada. Causa corrigida no código e função reimplantada. Autor da carga não identificável (sem `etl_log`, logs expirados); trilha de auditoria adicionada. | Consulta 7.9 = 0,996. |
| 1 | Fechada | Limiares de spread calibrados para P10–P90 com a faixa em P10–P95. | Feito em 2026-09-03: consulta 7.5 nas duas versões (P10–P90: mediana 24,0 %, P75 32,6 %, P90 42,2 %; P10–P95: 27,2 %, 36,6 %, 49,5 %). Limiares passam a 35/50/65 e os rótulos do PDF a 27/37/50. Se a decisão 15.3 voltar a P90, os valores são 30/40/55. | Fração de avaliações em "spread largo" volta ao patamar anterior à troca para P95. |
| 2 | Alta | **Site público e motor divergem no cinto** (`getStreetOutlierLimits` só no site). | Remover a calibração por rua do site público e usar `getOutlierLimits(bairro, tipologia)` como o motor. | Mesmo endereço, janela e tipologia: `piso_m2`, `teto_m2` e `med_m2` idênticos no site e na avaliação. |
| 3 | Fechada | Migration `20260903160000` (percentual ≥ 90 na RPC de raio). | Aplicada em 2026-09-03; filtro confirmado em `pg_get_functiondef`. Com a geocodificação recuperada, a função voltou a devolver linhas. | — |
| 4 | Média | **Janela padrão de 12 meses não foi medida.** A consulta sobre `valuations.itbi_metadata` devolveu 0 linhas: nenhuma avaliação foi salva desde que a janela móvel entrou. | Exibir "janela solicitada 12 m, usada 24 m" quando `janela_expandida = true`; repetir a consulta quando houver 30 avaliações salvas. | Distribuição de `janela_meses`; se menos de 30 % fecham em 12, o padrão deveria ser 24. |
| 5 | Fechada | **Cinto regenerado inteiro (4ª e 5ª rodadas).** A consulta 7.4 em 3 anos, agrupando por bairro sem filtrar por nome, devolveu 59 pares com 100 ou mais escrituras, todos regenerados (`docs/calibracao/bloco74-3anos-p995-2026-09-03.csv`); maiores mudanças de teto: Olaria +9,3 %, Copacabana −7,7 % (26.609 → 24.569), Santa Teresa +7,1 % (55 → 257 escrituras), Glória 13.511 → 20.080 (412 escrituras, antes 129); Leblon bate no teto global. Na 5ª rodada a consulta 7.4b devolveu os 18 pares restantes em 3 e 5 anos (`docs/calibracao/bloco74-19pares-3e5anos-2026-09-03.csv`), todos regenerados com a janela de 5 anos e a regra de largura mínima da seção 2.5. Barra Olímpica não existe na base (reclassificada como Barra da Tijuca em 2026-05) e saiu da tabela. | Nada. Rodar 7.4 e 7.4b de novo quando a base for recarregada. | 7.3 reexecutada sobre a tabela nova: nenhum par acima de 3 %. |
| 6 | Fechada (decisão pendente do dono) | **Fallback por raio validado.** Consulta 7.10 em duas amostras de 30 ruas pequenas (`docs/calibracao/bloco710-spread-por-escopo-2026-09-03.csv`): raio 100 m com mediana de 12 a 13 escrituras e spread mediano de 22 a 26 %; raio 300 m com 68 a 112 escrituras e spread de 33 a 36 %; bairro com 780 a 1.816 escrituras e spread de 51 %. O degrau de 300 m fica cerca de 15 pontos abaixo do bairro com amostra razoável: acrescenta informação e deve ser mantido. O raio de 100 m é o mais homogêneo mas raramente atinge 8 linhas, o que a regra `MIN_ROWS_SCOPE` já trata. | Ligar Configurações → Amostra por Raio (decisão do dono, seção 15.3). Nenhuma mudança de código necessária: os dois degraus e o mínimo de 8 linhas já estão implementados. | Avaliações salvas com `data_source = raio100` ou `raio300` e a penalidade correspondente na confiança. |
| 7 | Média | **Duas escalas de rótulo para a mesma confiança** (nível 85/70/55; PDF 80/60/40). | Unificar nos limiares do nível e remover a escala paralela do PDF. | Um único conjunto de constantes usado nos dois lugares. |
| 8 | Baixa | **Alerta de gap de anúncios (15 %) sem amostra.** | Manter até 30 avaliações com 3 ou mais anúncios; recalibrar pela distribuição observada. | Consulta 7.6 com n ≥ 30. |
| 9 | Baixa | **Estatística central varia por tela** (mediana no motor, média ponderada nos painéis). | Mostrar a mediana ponderada ao lado da média em Pesquisa de Mercado e no Dashboard. | Todas as telas de preço exibem as duas grandezas com o mesmo rótulo. |
| 10 | Baixa | **Repositório público no GitHub.** | Decisão do dono. | — |
| 11 | Fechada | **Recargas completas sem registro.** | `sync-itbi-prefeitura` grava em `etl_log` usuário, modo, `clearExisting`, período e contagens (PR #17); botão de sincronização nasce com a recarga desligada. Fica em aberto, como decisão do dono: quem pode disparar carga completa. | Toda execução tem uma linha em `etl_log` com `fonte = sync_itbi_prefeitura`. |
| 12 | Fechada no código, aberta na base | **Filtro de ingestão de R$ 100 mil apagava o mercado barato. Confirmado.** Consulta 7.11: nenhum bairro com `valor_transacao` mínimo abaixo de R$ 100.368 e P1 empilhado em 101 a 108 mil, ou seja, o corte estava ativo na base inteira; Inhoaíba Apartamento com 59,5 % da amostra remanescente até 110 mil, Cosmos 40,4 %, Engenho de Dentro Casa 18,8 %, Irajá Casa 17,5 %, Guaratiba Casa 13,0 %. Na API da Prefeitura, só entre R$ 50 mil e R$ 100 mil em 2021–2026: Santa Cruz 186 escrituras (82 em 2025), Campo Grande 129, Guaratiba 82, Inhoaíba 39, Paciência 32, Bangu 30. Santa Cruz mantinha 85 e Guaratiba 54: o cinto e toda estatística desses bairros estavam calibrados sobre menos da metade do mercado (`docs/calibracao/bloco711-filtro-ingestao-2026-09-03.md`). | Feito no PR #20: piso de valor a R$ 30 mil em `_shared/itbiIngestion.ts`, usado pelas duas cargas; limites gravados em `etl_log` a cada carga. Falta a recarga (pendência 13). | Depois da recarga, 7.11 mostra `valor_min` abaixo de 100 mil nos bairros da Zona Oeste e Santa Cruz com escrituras em 2021–2023. |
| 13 | Fechada | **Recarga da base com o filtro novo.** Primeira tentativa (17h12, `435e241d`): 10 lotes perdidos por chave repetida (pendência 15). Segunda (17h40, `34f03d7c`, PR #21): 0 erros, 291 duplicatas mescladas, base em 38.197 linhas e 163.015 escrituras, geom 97,9 %, índice de preços atualizado, `classify-microbairros` rodado na Barra. Cobertura contra a API: 90,0 % das escrituras, diferença 100 % explicada (`docs/calibracao/cobertura-api-x-base-2026-09-03.md`). | Feito. Falta só o que depende dela: pendências 17 e 18. | Consulta 7.9 = 0,979; `etl_log` com `registros_com_erro = 0`. |
| 14 | Fechada no código | **Carga diária sem peso e sem percentual.** `sync-itbi-daily` não lia `total_transações` nem `média_percentual_transferido` da API: linhas novas dos dois meses mais recentes entravam com `total_transacoes = 1` e `percentual_transferido = 100`, e sem nenhum filtro de faixa. Consequência: o mês corrente pesava menos do que o mercado, e escrituras parciais passavam pelo filtro de 90 %. A carga completa corrigia ao passar de novo pelo mês, então o dano fica restrito ao intervalo entre as duas. | Feito no PR #20: a carga diária usa `validarFeatureItbi` e grava peso e percentual. | Linhas com `data_transacao` no mês corrente: `total_transacoes` com valores acima de 1 depois da primeira execução diária. |
| 15 | Fechada | **Chave natural repetida derrubava lotes inteiros.** A API da Prefeitura devolve mais de um agregado para a mesma chave `logradouro, bairro, data_transacao, uso, tipologia` (por exemplo, "Apartamento" e "Cobertura" viram `Apartamento`). Duas linhas da mesma chave no mesmo upsert fazem o Postgres rejeitar o comando inteiro, e o lote de 500 era perdido em silêncio; na carga das 17:12 foram 10 lotes, concentrados no fim do arquivo (últimos bairros na ordem da API). Isso vale para toda carga anterior feita por upsert: bairros do fim da lista podem estar sub-representados há meses. | Feito no PR #21: `mesclarDuplicatasItbi` (escrituras somadas, valor, área e percentual ponderados) nas duas cargas; contagem gravada no `etl_log`. Repetir a carga (pendência 13). | Nova carga sem `registros_com_erro`; `detalhes.duplicatas_mescladas` maior que zero; contagem de linhas por bairro sem degrau nos últimos bairros da ordem da API. |
| 16 | Fechada | **`etl_log.detalhes` sobrescrito no encerramento.** O update final trocava o objeto inteiro e `limites_ingestao` sumia. | Feito no PR #21: o encerramento regrava os limites e acrescenta `registros_unicos` e `duplicatas_mescladas`. | Linha final do `etl_log` com `detalhes.limites_ingestao`. |
| 17 | Alta (decisão do dono) | **Barra Olímpica voltou como bairro próprio.** A migration `20260521155956` reclassificou as linhas de `BARRA OLÍMPICA` como `BARRA DA TIJUCA` e deixou um marcador em `logradouros_normalizacao` que nenhuma carga lê. A recarga trouxe o bairro de volta da API (código 165): 124 agregados, 666 escrituras, 581 em 3 anos, mediana 8.279/m² contra 9.673 na Barra. Hoje o Analytics tem os dois nomes na base, o painel da Barra não inclui Barra Olímpica, e o cinto passou a ter par para ela na geração de 18h (piso 4.837 / teto 11.003), o que só faz sentido na opção (a). | Decidir uma vez e gravar na ingestão: (a) bairro próprio, com par no cinto e entrada nas listas de bairro do app; ou (b) parte da Barra, com o mapeamento código 165 → BARRA DA TIJUCA em `_shared/itbiIngestion.ts`, para a decisão de maio sobreviver a qualquer recarga. A auditoria recomenda (a): os números dizem que é um submercado 15 % mais barato, e fundi-lo à Barra puxa a Barra para baixo e esconde a diferença; "oficialmente faz parte da Barra" é argumento administrativo, não de preço. | A regra escolhida está no código de ingestão e a base tem um só nome para o bairro depois da próxima carga. |
| 18 | Fechada | **Cinto regenerado sobre a base completa (6ª rodada, 18h).** Consulta 7.4 unificada (536 linhas, 268 pares × 2 janelas) passada por `bun run cinto`: 144 pares na tabela (66 em 3 anos, 78 em 5 anos com largura mínima), 132 fora por amostra, nenhum par saiu, 67 entraram (quase todos `Casa` de bairros médios e apartamentos da Zona Norte e Oeste). Mudanças relevantes: Santa Cruz Apartamento voltou à regra padrão com 309 escrituras (piso 1.386, teto 3.724, antes 1.534 / 6.136); Copacabana teto 25.809 (antes 24.569); Barra da Tijuca 23.368 (antes 22.312); Leblon 59.408, abaixo do teto global; Campo Grande Apartamento piso 1.799 (antes 2.003); Guaratiba Casa 1.200 / 3.077 com 132 escrituras. | Nada. Regenerar quando a base mudar: 7.4 → `bun run cinto` → Apêndice B. | Testes verdes; 7.3 par a par sobre esta tabela (CSV ainda não anexado). |
| 19 | Média (arquitetura) | **Transferências parciais são descartadas na carga, não na consulta.** 4.428 agregados e cerca de 18 mil escrituras (10 % da cidade, 23 % no Leblon, 57 % na Pavuna) nunca entram na base porque `percentual_transferido < 90` é rejeitado em `validarFeatureItbi`. Excluí-las do R$/m² é correto; descartá-las na carga impede medir quantas são, revisar o limiar de 90 % ou explicar ao cliente por que a rua dele "tem menos vendas" sem recarregar tudo. Todas as telas já filtram `percentual_transferido >= 90` na consulta. | Conferido em 18h (`docs/calibracao/rejeicoes-api-4-bairros-2026-09-03.csv`): em Pavuna, Bangu e Del Castilho a rejeição é quase toda por percentual < 90 (132 de 236, 344 de 812 e 717 de 2.230 escrituras), com agregados grandes (Del Castilho: 21 agregados somam 717 escrituras, mediana de 34 por agregado, padrão de lançamento vendido em cotas ou permuta); em Madureira, 44 agregados e 177 escrituras caem pela faixa de área, que ali barra unidades com área média abaixo de 20 m², compatível com vagas de garagem e boxes escriturados como residencial, e esse corte está certo. Nenhuma rejeição por valor ou R$/m² depois do piso de R$ 30 mil. O que fazer: gravar toda linha válida (faixas de área, valor e R$/m² continuam) e deixar o percentual só nas consultas, que já o aplicam; Del Castilho merece uma olhada por logradouro antes, porque 32 % do bairro em transferência parcial é um empreendimento, não um bairro. | `COUNT(*)` da base igual ao total de agregados válidos da API menos duplicatas; toda consulta do produto com o filtro de percentual explícito. |
| 20 | Alta | **Del Castilho: dois números que não fecham.** A conferência por motivo (`rejeicoes-api-4-bairros-2026-09-03.csv`) diz que 21 agregados e 717 escrituras do bairro foram rejeitados por `percentual < 90`; a listagem direta na API (`del-castilho-percentual-menor-90-2026-09-03.csv`) encontra só 10 agregados e 33 escrituras com percentual abaixo de 90 em 2020–2026. A base tem 1.513 escrituras contra 2.230 da API; 684 escrituras estão sem explicação. Hipóteses, em ordem: a consulta por motivo contou percentual nulo como rejeição (a carga trata nulo como 100 e aceita); a consulta da API foi feita numa camada ou filtro diferente da carga; ou a API muda a resposta entre chamadas. Enquanto isso não fecha, a cobertura de 90 % da seção 1.1 está "explicada" por uma consulta que se contradiz. | Anti-join definitivo: para Del Castilho, listar os agregados da API (chave natural, escrituras, percentual, área, valor) que **não** existem em `itbi_transactions`, com o motivo que `validarFeatureItbi` devolve para cada um. Repetir para Pavuna. | Soma das escrituras do anti-join igual a 2.230 − 1.513 = 717, com um motivo por linha. |
| 21 | Fechada | **Site público não casava bairro com acento.** `public-itbi-stats` comparava `bairro = UPPER(TRIM(texto))`; a base grava `BARRA OLÍMPICA`, `JACAREPAGUÁ`, `GLÓRIA`. Qualquer visitante que escrevesse sem acento recebia "dados insuficientes". | Feito no PR #24: `_shared/bairrosRio.ts` com a lista oficial (157 bairros, código e nome) e `resolverNomeBairro`, usado nas duas consultas da função. | "barra olimpica", "Barra Olímpica" e "BARRA OLIMPICA" devolvem as mesmas estatísticas no site. |
| 22 | Fechada | **Corte MAD eliminava um mercado inteiro em bairros bimodais.** 7.3 par a par (`bloco73-par-a-par-3anos-2026-09-03.csv`, 265 pares × 3 k): com 2,5 / 3,0 o corte médio é 3,8 % das escrituras, mas Santo Cristo perde 21,6 % (por baixo), São Conrado 19,3 % e Glória 17,2 % (por cima), Curicica 13,2 %, Parada de Lucas 10,6 %; trocar k não resolve (com 2,0 / 2,5 o corte médio dobra e Copacabana perde 12,7 %). | Feito no PR #24: k mantido em 2,5 / 3,0; salvaguarda `MAX_OUTLIER_CUT_SHARE` = 15 % no motor (seção 2.7); `ENGINE_VERSION` 4. Para o produto: nesses bairros o parecer deveria dizer "bairro com dois mercados" e exigir amostra de rua ou raio. | `outlier_cut_skipped = "bimodal"` aparece nos metadados de avaliações em Santo Cristo, São Conrado e Glória com amostra de bairro; nunca em amostra de rua unimodal. |

### 15.2 Referência para o Prime Circle: adotar, evitar, ajustar

Tudo abaixo decorre do corpo do documento. O desenvolvedor deve tratar esta lista como especificação mínima, não como sugestão.

**Adotar (obrigatório para os números baterem):**

1. **Semântica da linha.** Uma linha de `itbi_transactions` é um agregado mensal; `total_transacoes` é o peso. Exibir sempre dois números: registros (`COUNT(*)`) e escrituras (`SUM(total_transacoes)`). Nunca chamar contagem de linhas de "vendas" ou "transações".
2. **Filtros mínimos em toda consulta:** `uso = 'Residencial'`, `percentual_transferido >= 90`, `valor_m2 IS NOT NULL`. Bairro normalizado (maiúsculas, sem acento, espaços colapsados). Logradouro com as variantes da seção 2.9, não `ILIKE` do texto digitado.
3. **Limite explícito e ordenação determinística** (`ORDER BY data_transacao DESC, logradouro, tipologia LIMIT 5000`) ou paginação até esgotar. O PostgREST trunca em 1000 sem erro; qualquer consulta sem limite está errada por construção.
4. **Toda estatística de preço ponderada por escrituras:** média `Σ v·w / Σ w`; mediana e percentis pela convenção posicional da seção 2.3 (expandir cada linha `w` vezes). `AVG(valor_m2)` e `percentile_cont` sobre linhas não batem com o Analytics.
5. **Cinto de outliers por bairro × tipologia** com a tabela do Apêndice B aplicada no `WHERE`, antes de qualquer estatística. Não usar teto fixo global.
6. **Corte estatístico MAD em escala log** (k 2,5 abaixo, 3,0 acima, mínimo 8 linhas, salvaguarda de 3 escrituras) sobre a amostra já dentro do cinto. Se o Prime Circle usar outro corte, a comparação de preço só vale depois de os dois relatarem linhas e escrituras descartadas.
7. **Faixa = P10 / mediana / P95 ponderados dos sobreviventes** (ver decisão aberta em 15.3 sobre P90). Valor de referência é a mediana, nunca a média.
8. **Janela explícita, exibida com as datas efetivas** (início e fim), com a regra de expansão da seção 2.4 quando a amostra é fina. Um relatório que mostra só "12 meses" ou nenhum período não é comparável.
9. **Origem da amostra declarada** (rua, raio ou bairro) com a cadeia rua → bairro e a penalidade de confiança correspondente. Bairro inteiro só quando a rua não tem nenhuma ocorrência.
10. **Anúncios nunca na base.** Preço pedido entra como sinal (gap), com mínimo de 3 anúncios e limite de ±35 %.
11. **Metadados de reprodutibilidade** persistidos com cada avaliação (lista da seção 2.8). Sem eles não há auditoria linha a linha.
12. **"Dados insuficientes" em vez de número frágil:** menos de 3 escrituras não sustenta parecer; menos de 8 linhas não sustenta corte de outlier.

**Evitar (erros já encontrados na comparação):**

- contar linhas da série inteira e apresentar como vendas (caso 1 da seção 16: "39" eram 115 escrituras em seis anos);
- média simples de linhas (caso 4: erro de −1,1 % a +9,6 % por bairro, sem sinal previsível);
- série completa sem janela para precificar hoje (Avenida do Pepê: R$ 15.673/m² em seis anos contra R$ 18.533/m² em 24 meses);
- teto fixo de R$/m² igual para Leblon e Santa Cruz;
- usar a amostra da rua para calibrar o cinto da própria rua (pendência 2 de 15.1: o Analytics também vai deixar de fazer isso no site público);
- misturar anúncio com escritura na base de valor;
- média aritmética entre a média de apartamentos e a de casas como "valor geral".

**Ajustar na forma de pesquisar:**

- busca por rua com expansão de grafia (seção 2.9) e busca por condomínio pelas ruas internas com filtro de bairro mantido;
- opções de período em meses (12, 24, 36, 48, 60), nunca "ano selecionado" sem data efetiva;
- convenção de data: `data_transacao` é sempre dia 15 do mês; janelas "hoje − N meses" precisam da mesma convenção nos dois sistemas;
- correção temporal pelo índice trimestral (seção 2.6) é opcional para a comparação, mas precisa ser declarada: com ela ligada de um lado e desligada do outro, janelas longas divergem por construção.

**O que este documento não decide:** se o método da Prime Circle é melhor ou pior. Ele fixa o que o Analytics faz, com precisão suficiente para o Prime Circle reproduzir e para as diferenças restantes serem diferenças de método, não de amostra. A decisão entre métodos é a seção 15.4.

### 15.3 Decisões abertas, que são do dono do produto

| Decisão | Opções | Recomendação da auditoria |
|---|---|---|
| Topo da faixa: P95 ou P90 | P95 (vigente) alarga o spread típico em 3,2 pontos na mediana e 7,3 no P90 das ruas (consulta 7.5, 2026-09-03); os limiares já estão recalibrados para P95 | Manter P95 com os limiares 35/50/65 até o backtest medir a cobertura da faixa; se voltar a P90, restaurar 30/40/55. A decisão fica reversível com uma constante. |
| Janela padrão: 12 ou 24 meses | 12 expande sozinha na maioria das ruas; 24 fecha em mais casos com a mesma regra de 8 linhas | Medir (pendência 4) antes de decidir; a resposta está nos metadados das avaliações salvas. |
| Fallback por raio | ligar com 100 m e 300 m; ligar só com 100 m; manter desligado | **Ligar com os dois degraus.** Cobertura de geocodificação 99,6 %; a consulta 7.10 mostra o raio de 300 m com spread 15 pontos abaixo do bairro e amostra razoável, e o de 100 m como o mais homogêneo quando atinge 8 linhas. Não há mais argumento de dados para manter desligado. |
| Corte MAD: k inferior/superior | 2,0/2,5 corta 3,6 % + 3,4 % das escrituras da cidade (5 anos); 2,5/3,0 (vigente) corta 1,4 % + 1,9 %; 3,0/3,5 corta 0,8 % + 1,1 % (consulta 7.3 na base de 17h12) | **Manter 2,5/3,0.** A fração cortada não é o objetivo do MAD, é consequência; escolher k para atingir uma fatia fixa transforma um filtro de erro em um filtro de mercado. Com 2,0/2,5, Copacabana Apartamento perde 7,0 % + 5,7 % da amostra, e Copacabana não tem 12,7 % de erro de digitação. O critério que decide k é o backtest (cobertura da faixa), não a fatia cortada. |
| Barra Olímpica: bairro próprio ou parte da Barra da Tijuca | (a) bairro próprio com par no cinto e nas listas do app; (b) mapear código 165 → Barra da Tijuca na ingestão, como a migration de maio pretendia | (a). Submercado 15 % mais barato que a Barra; fundir esconde a diferença nos dois sentidos (pendência 17). A tabela gerada em 18h já traz o par, coerente com (a); se a decisão for (b), o mapeamento na ingestão remove o par na geração seguinte. |
| Corte MAD: k 2,0 / 2,5, 2,5 / 3,0 ou 3,0 / 3,5 | 7.3 par a par: corte médio 7,0 %, 3,8 % e 2,5 %; os bairros bimodais ficam acima de 10 % em qualquer k | Manter 2,5 / 3,0 com a salvaguarda de 15 % (pendência 22). A fração cortada não é objetivo, é sintoma; o backtest decide k, não a fração. |
| Cinto: 3 anos com P99,5 ou 5 anos com P99 | vigente: 3 anos e P99,5 nos 59 pares grandes; 5 anos com largura mínima [mediana/2; mediana×2] nos 18 pares pequenos | Manter. A regra de largura mínima é uma decisão da auditoria (seção 2.5), reversível pela constante `SMALL_SAMPLE_WIDTH`; o backtest diz se ela deve valer também para os pares grandes de distribuição estreita (Campo dos Afonsos, Anil, Pechincha, onde P99,5 fica a menos de 25 % da mediana). |

### 15.4 Protocolo de decisão conjunta

A escolha entre as duas metodologias não se resolve por argumento nem por leitura dos documentos. Resolve-se assim:

1. **Igualar a amostra** (seção 14.1): para os casos da seção 16, os dois sistemas devolvem os mesmos registros e escrituras. Enquanto não baterem, não se compara preço.
2. **Comparar as fórmulas** (seções 14.2 e 14.4): item a item do checklist, com o desenvolvedor marcando o que a Prime Circle faz igual, diferente ou não faz.
3. **Backtest** (seção 14.3): 20 ou mais vendas reais fechadas pela Godoy Prime (endereço, tipologia, área, data, preço), avaliadas pelos dois sistemas na data da venda, medindo erro mediano absoluto, viés e cobertura da faixa. Quem fornece as vendas é a Godoy Prime; quem roda os dois sistemas é o desenvolvedor; quem lê o resultado são os dois lados juntos.
4. **Decisão:** o método com menor erro e cobertura mais próxima de 80 a 90 % com a faixa mais estreita passa a ser a referência dos dois sistemas. O outro se ajusta. As decisões de 15.3 são tomadas com esse resultado, não antes.

Sem o passo 3, o que existe é uma comparação de métodos defensáveis, e métodos defensáveis se defendem indefinidamente.

---

## 16. Casos de conferência (baseline de aceite)

Apurados em 2026-09-03 sobre a base recarregada às 15h (seção 1.1), via consultas executadas pelo Lovable; entre parênteses, o valor da v1.0 (base da manhã), para rastreabilidade. Filtros comuns: `uso = 'Residencial' AND percentual_transferido >= 90 AND valor_m2 IS NOT NULL`. Percentis por expansão de peso (`generate_series`). Tolerância de aceite: ±1 % em médias e medianas, exato em contagens. Quando a base for recarregada de novo, os números mudam e a baseline precisa ser reapurada antes de qualquer comparação.

### Caso 1 — Avenida do Pepê (Barra da Tijuca), 5 janelas

Este caso explicou a divergência histórica entre os dois sistemas: o "39" reportado pela Prime Circle era contagem de linhas da série inteira (2020–2026), enquanto o Analytics contava escrituras em outra janela. A coincidência numérica era acidental.

```sql
WITH base AS (
  SELECT data_transacao, valor_m2, GREATEST(1, COALESCE(total_transacoes,1)) AS w
  FROM itbi_transactions
  WHERE uso='Residencial' AND percentual_transferido>=90 AND valor_m2 IS NOT NULL
    AND bairro='BARRA DA TIJUCA' AND logradouro ILIKE '%PEPE%'
), exp AS (
  SELECT b.*, v.m AS jan FROM base b
  CROSS JOIN LATERAL (VALUES (12),(24),(36),(48),(60)) v(m)
  WHERE b.data_transacao >= (CURRENT_DATE - (v.m || ' months')::interval)
), expandida AS ( SELECT jan, valor_m2 FROM exp, generate_series(1, w) )
SELECT jan, count(*) AS escrituras,
       round(avg(valor_m2)) AS media_ponderada,
       round(percentile_cont(0.5)  WITHIN GROUP (ORDER BY valor_m2)::numeric) AS mediana,
       round(percentile_cont(0.10) WITHIN GROUP (ORDER BY valor_m2)::numeric) AS p10,
       round(percentile_cont(0.95) WITHIN GROUP (ORDER BY valor_m2)::numeric) AS p95
FROM expandida GROUP BY jan ORDER BY jan;
```

| Janela | Registros | Escrituras | Média pond. | Mediana | P10 | P95 | Mín. bruto | Máx. bruto |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 12 m | 7 (5) | 18 (12) | 19.775 (19.771) | 19.361 (19.404) | 17.695 | 22.193 | 17.695 | 22.193 |
| 24 m | 15 (13) | 48 (42) | 18.689 (18.533) | 19.319 (19.361) | 15.760 | 22.143 | 13.040 | 22.193 |
| 36 m | 22 (20) | 68 (62) | 18.009 (17.837) | 17.995 (17.768) | 14.587 | 22.051 | 13.040 | 22.193 |
| 48 m | 26 (24) | 81 (75) | 17.505 (17.322) | 17.695 (17.480) | 13.919 | 22.051 | 12.595 | 22.193 |
| 60 m | 31 (29) | 95 (89) | 16.938 (16.746) | 17.175 (16.548) | 13.734 | 20.839 | 12.595 | 22.193 |

Leitura: a média ponderada cai monotonicamente conforme a janela abre, comportamento esperado num mercado em alta. Um sistema que reporta "39" para esta rua está contando linhas de 60 ou mais meses e chamando de transações.

### Caso 2 — Rua Desenhista Luiz Guimarães (Barra da Tijuca)

**2a. Grafia na base**, prova de que a expansão de variantes é obrigatória:

| Grafia gravada | Registros | Escrituras |
|---|---:|---:|
| `RUA DESEN LUIZ GUIMARAES` | 28 (27) | 71 (69) |

Buscar por "Desenhista Luiz Guimarães" ou "Desenhista Luis Guimarães" sem as regras `DESENHISTA↔DESEN` e `LUIZ↔LUIS` retorna zero linhas.

**2b. Últimos 12 meses, Apartamento:** 5 registros, 10 escrituras (era 4 / 8).

| Mês | Escrituras | R$/m² | Valor |
|---|---:|---:|---:|
| 07/2026 | 2 | 9.880 | 1.304.210 |
| 05/2026 | 2 | 9.360 | 1.235.568 |
| 01/2026 | 2 | 8.811 | 969.260 |
| 10/2025 | 2 | 9.362 | 1.235.817 |
| 09/2025 | 2 | 8.307 | 946.971 |

**2c. Série anual completa (média ponderada):**

| Ano | Média ponderada |
|---|---:|
| 2020 | 7.592 |
| 2021 | 7.839 |
| 2022 | 8.156 |
| 2023 | 8.152 |
| 2024 | 7.914 |
| 2025 | 8.766 |
| 2026 | 9.351 (3 registros, 6 escrituras; era 9.086) |

Maior R$/m² já registrado nesta rua em sete anos: R$ 9.880 (era 9.362). Nenhuma escritura acima de 9.900, em nenhum ano e em nenhuma janela. Qualquer sistema que apresente R$ 14.000/m² para esta rua não está usando valor de escritura. O P95 pode ficar ligeiramente acima do maior valor bruto por efeito da correção temporal (seção 2.6).

### Caso 3 — General Olyntho Pilar (variantes de grafia)

| Grafia gravada | Bairro | Registros | Escrituras | Média pond. | Período |
|---|---|---:|---:|---:|---|
| `AVN GAL OLYNTHO PILLAR` | BARRA DA TIJUCA | 5 | 12 | 8.486 | 07/2021 a 08/2025 |

Idêntico nas duas bases. Requer simultaneamente `AVENIDA↔AVN`, `GENERAL↔GAL` e `PILAR↔PILLAR`. Nos últimos 12 meses esta rua não tem transações: o volume que aparecia antes vinha do fallback para o bairro inteiro. Nesse caso o relatório deve declarar a origem `bairro` e aplicar a penalidade de −15 no score.

### Caso 4 — Controle global (fora da Barra), últimos 12 meses, bairros com 400 ou mais escrituras

Prova de que as regras são globais, não específicas da Barra da Tijuca.

| Bairro | Registros | Escrituras | Média ponderada | Média simples (errada) | Erro |
|---|---:|---:|---:|---:|---:|
| Copacabana | 411 | 2.439 | **11.135** | 11.253 | −1,1 % |
| Barra da Tijuca | 392 | 1.949 | **11.995** | 10.941 | **+9,6 %** |
| Tijuca | 339 | 1.357 | **6.179** | 6.187 | −0,1 % |
| Botafogo | 248 | 1.116 | **11.825** | 11.646 | +1,5 % |
| Recreio dos Bandeirantes | 264 | 1.060 | **6.893** | 6.820 | +1,1 % |
| Jacarepaguá | 108 | 952 | **7.221** | 6.833 | **+5,7 %** |
| Ipanema | 127 | 871 | **21.810** | 21.481 | +1,5 % |
| Flamengo | 138 | 748 | **11.718** | 11.150 | **+5,1 %** |
| Camorim | 42 | 560 | **6.859** | 6.804 | +0,8 % |
| Freguesia (Jacarepaguá) | 132 | 523 | **5.735** | 5.477 | **+4,7 %** |
| Leblon | 167 | 521 | **23.280** | 23.506 | −1,0 % |
| Centro | 100 | 455 | **6.970** | 6.526 | **+6,8 %** |

O erro da média simples não é constante nem tem sinal previsível: depende de como as escrituras se distribuem entre agregados grandes e pequenos. É grande onde poucos agregados concentram muitas escrituras de alto valor.

### Caso 5 — Cinto de outlier, Copacabana | Apartamento, 12 meses

Piso 5.189 / teto 26.609 na tabela vigente quando a consulta rodou; a 4ª rodada trouxe o par para 5.034 / 24.569 e a geração de 18h sobre a base completa para 5.194 / 25.809 (Apêndice B). Como nenhuma linha de Copacabana em 12 meses passa de 24.569, o resultado abaixo não muda.

| Escopo | Registros | Escrituras | Média pond. |
|---|---:|---:|---:|
| Sem cinto | 403 | 2.416 | 11.182 |
| Com cinto | 403 | 2.416 | 11.182 |

Resultado idêntico: o cinto não corta mercado legítimo num bairro bem calibrado. É uma rede de segurança contra erro de digitação, não um filtro de mercado. Se o sistema externo obtiver números diferentes entre as duas linhas, seu cinto está mal calibrado. Contraponto na mesma rodada: em Glória, Santo Cristo, Centro e Flamengo o cinto de então cortava entre 4,6 % e 17,2 % das escrituras; os quatro foram regenerados no mesmo dia (pendência 5 da seção 15.1, fechada), e a 7.3 precisa ser reexecutada sobre a tabela final antes de esses bairros servirem de baseline.

---

## Apêndice A. Constantes do motor (referência rápida)

| Constante | Valor | Onde |
|---|---|---|
| `ENGINE_VERSION` | 4 | itbiMarketStats.ts |
| `MAX_OUTLIER_CUT_SHARE` | 0,15 | itbiMarketStats.ts |
| `MAX_ROWS` | 30000 | itbiMarketStats.ts |
| `WINDOW_MONTHS_OPTIONS` | 12, 24, 36, 48, 60 | itbiMarketStats.ts |
| `DEFAULT_WINDOW_MONTHS` | 12 | itbiMarketStats.ts |
| `MAX_WINDOW_MONTHS` | 60 | itbiMarketStats.ts |
| `WINDOW_YEARS` (legado) | 5 | itbiMarketStats.ts |
| `MIN_ROWS_CLOSED_WINDOW` | 30 | itbiMarketStats.ts |
| `MIN_TX_CLOSED_WINDOW` | 100 | itbiMarketStats.ts |
| `MIN_ROWS_FOR_TIPOLOGIA` | 8 | itbiMarketStats.ts |
| `MIN_ROWS_SCOPE` | 8 | itbiMarketStats.ts |
| `MIN_VALUES_FOR_IQR` | 4 | itbiMarketStats.ts |
| `MIN_ROWS_FOR_MAD` | 8 | itbiMarketStats.ts |
| `MAD_K_INF` / `MAD_K_SUP` | 2,5 / 3,0 | itbiMarketStats.ts |
| `RANGE_LOW_P` / `RANGE_HIGH_P` | 0,10 / 0,95 | itbiMarketStats.ts |
| `RADIUS_STEPS_M` | 100, 300 | itbiMarketStats.ts |
| `SOURCE_PENALTY` | 0 / 5 / 10 / 15 | itbiMarketStats.ts |
| `MIN_ESCRITURAS_INDEX_QUARTER` | 30 | itbiMarketStats.ts |
| `MAX_DEFLATION_FACTOR` | 2 | itbiMarketStats.ts |
| `DEFAULT_OUTLIER_MIN` / `MAX` | 774 / 87.269 (gerados, preço da época) | outlierLimits.ts |
| `FAIXA_SEM_CALIBRACAO_PISO` / `TETO` | 907 / 42.013 (preço de hoje) | outlierLimits.ts |
| `FATOR_INDICE_5_ANOS` / `FATOR_MIN_INDICE_5_ANOS` | 1,1721 / 0,9667 | outlierLimits.ts |
| `MIN_ESCRITURAS_3_ANOS` / `MIN_ESCRITURAS_CINTO` | 200 / 30 | outlierLimitsGen.ts |
| `PISO_MARGIN` / `TETO_MARGIN` | 0,85 / 1,15 | outlierLimits.ts |
| `STREET_CALIBRATION_MIN_LINHAS` | 8 | outlierLimits.ts |
| `STREET_CALIBRATION_MIN_ESCRITURAS` | 40 | outlierLimits.ts |
| `ANUNCIOS_MINIMO_ESTATISTICO` | 3 | valuationCalculations.ts |
| `MARKET_GAP_CAP` | 35 | valuationCalculations.ts |
| `ANUNCIO_GAP_ALERT_PCT` | 15 | valuationCalculations.ts |
| `GLOBAL_CAPS` | ±0,35 | valuationCalculations.ts |
| `SPREAD_NORMAL/WIDE/VERY_WIDE_PCT` | 35 / 50 / 65 (P95; com P90: 30 / 40 / 55) | valuationCalculations.ts |
| `SAMPLE_SCORE_CAPS` | ≤2→40, ≤9→55, ≤29→75 | valuationCalculations.ts |
| `MIN_ESCRITURAS_PARECER` | 3 | valuationCalculations.ts |
| `BAIRRO_FALLBACK_PENALTY` | 15 | valuationCalculations.ts |
| `TIPOLOGIA_FALLBACK_PENALTY` | 5 | valuationCalculations.ts |
| `FALLBACK_BAND_PP` | 3 p.p. | priceTrend.ts |
| `MAX_BAND_LOG` | 0,25 | priceTrend.ts |

---

## Apêndice B. Cinto de outliers: tabela completa (317 pares)

Chave = `BAIRRO|Tipologia` (normalizada: maiúsculas, sem acento). Gerada em 2026-10-22 por `bun run cinto docs/calibracao/bloco74-escrituras-p05-2026-10-22.csv docs/calibracao/bloco74b-cidade-p05-2026-10-22.csv` sobre as escrituras individuais da SMF: 102 pares na faixa padrão de 3 anos (P0,5 × 0,85 e P99,5 × 1,15) e 215 na faixa de 5 anos com a regra de largura mínima da seção 2.5. 138 pares com menos de 30 escrituras em 5 anos ficam fora e caem na faixa residencial do bairro (app) ou na faixa da cidade (banco).

Valores em R$/m², em preço do último trimestre do índice (2026-07). O app converte para preço da época antes de filtrar (seção 2.5). Mediana, P0,5, P1 e P99,5 são percentis de escrituras individuais corrigidas, na janela indicada. Escrituras é a contagem da janela. P1 fica só como referência.

Para regenerar: consultas 7.4 e 7.4b, CSVs em `docs/calibracao/`, `bun run cinto <csv 7.4> <csv 7.4b>`, `bun run test`, e refazer esta tabela a partir do arquivo gerado. Ninguém edita à mão.

| Bairro | Tipologia | Piso | Teto | P0,5 | P1 | Mediana | P99,5 | Escrituras | Janela |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| ABOLICAO | Apartamento | 1.131 | 7.240 | 1.330 | 1.333 | 3.322 | 6.296 | 207 | 5 anos |
| ABOLICAO | Casa | 674 | 7.918 | 793 | 903 | 2.852 | 6.885 | 77 | 5 anos |
| AGUA SANTA | Apartamento | 1.021 | 9.883 | 1.201 | 1.250 | 4.969 | 8.594 | 230 | 3 anos |
| AGUA SANTA | Casa | 621 | 8.239 | 730 | 785 | 3.191 | 7.164 | 43 | 5 anos |
| ALTO DA BOA VISTA | Apartamento | 1.476 | 13.487 | 1.736 | 1.736 | 4.630 | 11.728 | 69 | 5 anos |
| ALTO DA BOA VISTA | Casa | 1.558 | 12.091 | 1.833 | 1.842 | 3.398 | 10.514 | 42 | 5 anos |
| ANCHIETA | Apartamento | 734 | 8.275 | 864 | 867 | 3.401 | 7.196 | 70 | 5 anos |
| ANCHIETA | Casa | 662 | 18.509 | 779 | 976 | 2.112 | 16.095 | 95 | 5 anos |
| ANDARAI | Apartamento | 1.618 | 11.846 | 1.904 | 2.137 | 5.088 | 10.301 | 953 | 3 anos |
| ANDARAI | Casa | 910 | 22.806 | 1.070 | 1.484 | 3.914 | 19.831 | 148 | 5 anos |
| ANDARAI | Comercial | 1.879 | 15.841 | 2.210 | 2.333 | 4.028 | 13.775 | 31 | 5 anos |
| ANIL | Apartamento | 1.833 | 10.475 | 2.157 | 2.403 | 5.577 | 9.109 | 585 | 3 anos |
| ANIL | Casa | 623 | 9.686 | 733 | 928 | 3.509 | 8.423 | 242 | 3 anos |
| BANCARIOS | Apartamento | 1.257 | 7.766 | 1.479 | 1.625 | 3.737 | 6.753 | 90 | 5 anos |
| BANCARIOS | Casa | 870 | 7.484 | 1.024 | 1.029 | 2.346 | 6.508 | 74 | 5 anos |
| BANGU | Apartamento | 893 | 8.511 | 1.051 | 1.110 | 3.254 | 7.401 | 265 | 3 anos |
| BANGU | Casa | 501 | 10.480 | 589 | 659 | 2.317 | 9.113 | 467 | 3 anos |
| BANGU | Comercial | 978 | 39.734 | 1.150 | 1.280 | 4.298 | 34.551 | 142 | 5 anos |
| BARRA DA TIJUCA | Apartamento | 3.909 | 35.346 | 4.599 | 5.272 | 12.499 | 30.736 | 9.017 | 3 anos |
| BARRA DA TIJUCA | Casa | 2.020 | 45.856 | 2.376 | 3.048 | 8.700 | 39.875 | 820 | 3 anos |
| BARRA DA TIJUCA | Comercial | 2.258 | 49.643 | 2.656 | 3.221 | 7.760 | 43.168 | 2.181 | 3 anos |
| BARRA OLIMPICA | Apartamento | 3.199 | 15.476 | 3.764 | 3.939 | 8.707 | 13.457 | 935 | 3 anos |
| BARRA OLIMPICA | Comercial | 1.699 | 14.787 | 1.999 | 2.079 | 5.238 | 12.858 | 121 | 5 anos |
| BENFICA | Apartamento | 1.104 | 10.629 | 1.299 | 1.368 | 3.346 | 9.243 | 125 | 5 anos |
| BENFICA | Casa | 783 | 14.484 | 921 | 1.044 | 2.563 | 12.595 | 74 | 5 anos |
| BENFICA | Comercial | 853 | 9.593 | 1.003 | 1.201 | 2.858 | 8.342 | 127 | 5 anos |
| BENTO RIBEIRO | Apartamento | 980 | 10.623 | 1.153 | 1.230 | 3.512 | 9.237 | 202 | 5 anos |
| BENTO RIBEIRO | Casa | 796 | 16.216 | 936 | 1.082 | 3.204 | 14.101 | 257 | 5 anos |
| BONSUCESSO | Apartamento | 1.389 | 11.148 | 1.634 | 1.756 | 5.848 | 9.694 | 860 | 3 anos |
| BONSUCESSO | Casa | 825 | 12.905 | 970 | 987 | 2.934 | 11.222 | 124 | 5 anos |
| BONSUCESSO | Comercial | 940 | 35.294 | 1.106 | 1.138 | 2.582 | 30.690 | 119 | 5 anos |
| BOTAFOGO | Apartamento | 3.717 | 26.088 | 4.373 | 5.162 | 11.808 | 22.685 | 4.097 | 3 anos |
| BOTAFOGO | Casa | 2.366 | 23.892 | 2.784 | 2.985 | 8.051 | 20.776 | 175 | 5 anos |
| BOTAFOGO | Comercial | 1.201 | 51.613 | 1.413 | 1.511 | 11.903 | 44.881 | 291 | 5 anos |
| BRAS DE PINA | Apartamento | 575 | 8.967 | 677 | 1.094 | 4.367 | 7.797 | 357 | 3 anos |
| BRAS DE PINA | Casa | 623 | 18.647 | 733 | 873 | 3.267 | 16.215 | 255 | 5 anos |
| BRAS DE PINA | Comercial | 1.093 | 15.561 | 1.286 | 1.359 | 2.911 | 13.531 | 41 | 5 anos |
| CACHAMBI | Apartamento | 1.455 | 12.339 | 1.712 | 1.968 | 5.406 | 10.730 | 1.460 | 3 anos |
| CACHAMBI | Casa | 1.012 | 16.437 | 1.190 | 1.247 | 4.041 | 14.293 | 244 | 5 anos |
| CACHAMBI | Comercial | 1.236 | 61.556 | 1.454 | 1.528 | 4.531 | 53.527 | 71 | 5 anos |
| CACUIA | Apartamento | 1.725 | 10.451 | 2.029 | 2.172 | 4.600 | 9.088 | 75 | 5 anos |
| CACUIA | Casa | 794 | 9.392 | 934 | 1.099 | 3.451 | 8.167 | 40 | 5 anos |
| CAJU | Apartamento | 978 | 7.012 | 1.151 | 1.264 | 3.161 | 6.097 | 38 | 5 anos |
| CAMORIM | Apartamento | 2.818 | 13.432 | 3.315 | 3.816 | 8.487 | 11.680 | 3.008 | 3 anos |
| CAMORIM | Comercial | 2.304 | 12.073 | 3.737 | 3.737 | 4.607 | 10.498 | 40 | 5 anos |
| CAMPINHO | Apartamento | 1.148 | 6.945 | 1.351 | 1.411 | 3.466 | 6.039 | 141 | 5 anos |
| CAMPINHO | Casa | 622 | 11.861 | 732 | 784 | 2.550 | 10.314 | 56 | 5 anos |
| CAMPO DOS AFONSOS | Apartamento | 2.304 | 6.050 | 2.711 | 2.799 | 4.152 | 5.261 | 243 | 3 anos |
| CAMPO GRANDE | Apartamento | 1.068 | 11.108 | 1.256 | 1.338 | 4.241 | 9.659 | 3.441 | 3 anos |
| CAMPO GRANDE | Casa | 649 | 17.539 | 763 | 859 | 3.000 | 15.251 | 1.917 | 3 anos |
| CAMPO GRANDE | Comercial | 1.222 | 39.447 | 1.438 | 1.523 | 4.998 | 34.302 | 318 | 3 anos |
| CASCADURA | Apartamento | 791 | 8.571 | 930 | 1.167 | 2.972 | 7.453 | 230 | 3 anos |
| CASCADURA | Casa | 604 | 8.722 | 710 | 781 | 2.500 | 7.584 | 139 | 5 anos |
| CASCADURA | Comercial | 1.052 | 18.284 | 1.238 | 1.252 | 3.077 | 15.899 | 41 | 5 anos |
| CATETE | Apartamento | 3.583 | 22.075 | 4.215 | 4.781 | 9.704 | 19.196 | 890 | 3 anos |
| CATETE | Casa | 2.295 | 16.846 | 2.700 | 2.701 | 5.034 | 14.649 | 45 | 5 anos |
| CATETE | Comercial | 1.675 | 32.282 | 1.971 | 2.520 | 9.603 | 28.071 | 142 | 5 anos |
| CATUMBI | Apartamento | 821 | 8.824 | 966 | 1.250 | 3.524 | 7.673 | 141 | 5 anos |
| CATUMBI | Casa | 937 | 6.518 | 1.102 | 1.105 | 2.641 | 5.668 | 36 | 5 anos |
| CAVALCANTI | Apartamento | 649 | 6.656 | 764 | 791 | 3.328 | 5.690 | 109 | 5 anos |
| CAVALCANTI | Casa | 533 | 11.475 | 627 | 661 | 2.228 | 9.978 | 67 | 5 anos |
| CENTRO | Apartamento | 2.147 | 18.669 | 2.526 | 2.725 | 6.939 | 16.234 | 2.050 | 3 anos |
| CENTRO | Comercial | 678 | 22.691 | 798 | 983 | 3.498 | 19.731 | 2.095 | 3 anos |
| CIDADE DE DEUS | Casa | 609 | 7.501 | 717 | 778 | 2.657 | 6.523 | 40 | 5 anos |
| CIDADE NOVA | Apartamento | 1.611 | 9.480 | 1.895 | 1.985 | 4.740 | 7.678 | 89 | 5 anos |
| COCOTA | Apartamento | 1.785 | 10.728 | 2.100 | 2.248 | 4.000 | 9.329 | 117 | 5 anos |
| COCOTA | Casa | 797 | 9.100 | 938 | 1.029 | 2.922 | 7.913 | 48 | 5 anos |
| COELHO NETO | Apartamento | 1.095 | 5.674 | 1.522 | 1.528 | 2.189 | 4.934 | 31 | 5 anos |
| COELHO NETO | Casa | 813 | 9.156 | 957 | 957 | 1.970 | 7.962 | 60 | 5 anos |
| COELHO NETO | Comercial | 848 | 4.000 | 1.077 | 1.085 | 1.695 | 3.478 | 31 | 5 anos |
| COLEGIO | Apartamento | 1.201 | 11.604 | 1.413 | 1.809 | 5.802 | 8.695 | 340 | 5 anos |
| COLEGIO | Casa | 780 | 35.576 | 918 | 959 | 3.569 | 30.936 | 65 | 5 anos |
| COPACABANA | Apartamento | 3.622 | 40.863 | 4.261 | 4.956 | 11.313 | 35.533 | 8.386 | 3 anos |
| COPACABANA | Casa | 1.035 | 90.965 | 1.218 | 1.800 | 11.661 | 79.100 | 60 | 5 anos |
| COPACABANA | Comercial | 988 | 84.116 | 1.162 | 3.830 | 8.526 | 73.144 | 574 | 3 anos |
| CORDOVIL | Apartamento | 671 | 7.216 | 789 | 877 | 3.076 | 6.275 | 148 | 5 anos |
| CORDOVIL | Casa | 646 | 27.831 | 760 | 835 | 2.714 | 24.201 | 81 | 5 anos |
| COSME VELHO | Apartamento | 4.084 | 19.490 | 4.805 | 5.019 | 9.745 | 16.311 | 198 | 5 anos |
| COSME VELHO | Casa | 1.691 | 14.431 | 1.989 | 2.134 | 5.429 | 12.549 | 37 | 5 anos |
| COSMOS | Apartamento | 881 | 7.357 | 1.037 | 1.098 | 4.276 | 6.397 | 619 | 3 anos |
| COSMOS | Casa | 542 | 7.733 | 638 | 665 | 3.701 | 6.724 | 207 | 3 anos |
| CURICICA | Apartamento | 1.743 | 11.083 | 2.050 | 2.326 | 7.782 | 9.637 | 379 | 3 anos |
| CURICICA | Casa | 746 | 9.677 | 878 | 952 | 2.995 | 8.415 | 194 | 5 anos |
| DEL CASTILHO | Apartamento | 1.806 | 9.752 | 2.125 | 2.506 | 6.136 | 8.480 | 612 | 3 anos |
| DEL CASTILHO | Casa | 1.392 | 12.837 | 1.638 | 1.659 | 2.977 | 11.163 | 42 | 5 anos |
| DEL CASTILHO | Comercial | 1.703 | 14.514 | 2.004 | 2.134 | 5.514 | 12.621 | 198 | 5 anos |
| ENCANTADO | Apartamento | 1.116 | 8.819 | 1.313 | 1.459 | 3.442 | 7.669 | 255 | 5 anos |
| ENCANTADO | Casa | 841 | 10.333 | 989 | 1.018 | 2.791 | 8.985 | 113 | 5 anos |
| ENGENHO DA RAINHA | Apartamento | 1.009 | 9.144 | 1.187 | 1.434 | 3.442 | 7.951 | 137 | 5 anos |
| ENGENHO DA RAINHA | Casa | 581 | 13.833 | 684 | 706 | 3.143 | 12.029 | 52 | 5 anos |
| ENGENHO DE DENTRO | Apartamento | 1.100 | 10.136 | 1.294 | 1.502 | 4.710 | 8.814 | 1.086 | 3 anos |
| ENGENHO DE DENTRO | Casa | 785 | 12.302 | 923 | 949 | 3.098 | 10.697 | 242 | 5 anos |
| ENGENHO DE DENTRO | Comercial | 925 | 55.524 | 1.088 | 1.285 | 4.474 | 48.282 | 46 | 5 anos |
| ENGENHO NOVO | Apartamento | 999 | 7.229 | 1.175 | 1.320 | 3.028 | 6.286 | 626 | 3 anos |
| ENGENHO NOVO | Casa | 660 | 8.584 | 777 | 832 | 2.626 | 7.464 | 210 | 5 anos |
| ESTACIO | Apartamento | 1.450 | 9.583 | 1.706 | 1.771 | 4.169 | 8.333 | 260 | 5 anos |
| ESTACIO | Casa | 517 | 6.934 | 608 | 637 | 1.841 | 6.030 | 31 | 5 anos |
| FLAMENGO | Apartamento | 3.801 | 29.604 | 4.472 | 4.853 | 10.712 | 25.743 | 2.570 | 3 anos |
| FLAMENGO | Comercial | 3.563 | 58.751 | 4.192 | 4.257 | 10.667 | 51.088 | 130 | 5 anos |
| FREGUESIA (ILHA) | Apartamento | 1.085 | 8.466 | 1.277 | 1.438 | 3.849 | 7.362 | 216 | 3 anos |
| FREGUESIA (ILHA) | Casa | 811 | 12.619 | 954 | 1.127 | 3.041 | 10.973 | 119 | 5 anos |
| FREGUESIA (JACAREPAGUA) | Apartamento | 1.877 | 11.089 | 2.208 | 2.427 | 5.531 | 9.643 | 2.211 | 3 anos |
| FREGUESIA (JACAREPAGUA) | Casa | 904 | 11.443 | 1.064 | 1.294 | 4.183 | 9.950 | 424 | 3 anos |
| FREGUESIA (JACAREPAGUA) | Comercial | 1.429 | 33.801 | 1.681 | 1.885 | 4.090 | 29.392 | 365 | 3 anos |
| GAMBOA | Apartamento | 1.002 | 14.023 | 1.179 | 1.240 | 3.287 | 12.194 | 86 | 5 anos |
| GARDENIA AZUL | Apartamento | 1.145 | 10.970 | 1.347 | 1.619 | 5.485 | 7.302 | 141 | 5 anos |
| GARDENIA AZUL | Casa | 502 | 9.823 | 591 | 614 | 2.638 | 8.542 | 53 | 5 anos |
| GAVEA | Apartamento | 4.837 | 41.115 | 5.691 | 6.477 | 16.581 | 35.752 | 762 | 3 anos |
| GAVEA | Casa | 1.950 | 31.088 | 2.294 | 3.334 | 11.441 | 27.033 | 80 | 5 anos |
| GAVEA | Comercial | 4.259 | 39.030 | 5.011 | 5.297 | 15.783 | 33.939 | 51 | 5 anos |
| GLORIA | Apartamento | 1.324 | 33.858 | 1.558 | 3.999 | 9.696 | 29.442 | 629 | 3 anos |
| GLORIA | Comercial | 1.733 | 19.065 | 2.039 | 2.272 | 4.461 | 16.578 | 39 | 5 anos |
| GRAJAU | Apartamento | 1.623 | 12.528 | 1.909 | 2.173 | 4.875 | 10.894 | 976 | 3 anos |
| GRAJAU | Casa | 820 | 14.242 | 965 | 1.090 | 3.900 | 12.384 | 232 | 5 anos |
| GUADALUPE | Apartamento | 859 | 8.543 | 1.010 | 1.117 | 3.841 | 7.429 | 127 | 5 anos |
| GUADALUPE | Casa | 745 | 13.956 | 877 | 925 | 2.676 | 12.136 | 152 | 5 anos |
| GUARATIBA | Apartamento | 939 | 7.399 | 1.105 | 1.165 | 4.110 | 6.434 | 999 | 3 anos |
| GUARATIBA | Casa | 570 | 8.995 | 670 | 791 | 4.152 | 7.822 | 573 | 3 anos |
| HIGIENOPOLIS | Apartamento | 1.185 | 6.833 | 1.394 | 1.421 | 3.076 | 5.942 | 253 | 3 anos |
| HIGIENOPOLIS | Casa | 1.035 | 13.874 | 1.218 | 1.374 | 3.400 | 12.064 | 89 | 5 anos |
| HIGIENOPOLIS | Comercial | 1.203 | 10.802 | 1.415 | 1.433 | 2.564 | 9.393 | 44 | 5 anos |
| HONORIO GURGEL | Apartamento | 602 | 10.468 | 708 | 748 | 2.142 | 9.103 | 32 | 5 anos |
| HONORIO GURGEL | Casa | 607 | 9.535 | 714 | 764 | 2.207 | 8.291 | 76 | 5 anos |
| HUMAITA | Apartamento | 4.238 | 23.293 | 4.986 | 5.792 | 11.167 | 20.255 | 669 | 3 anos |
| HUMAITA | Casa | 2.732 | 34.126 | 3.214 | 3.773 | 9.190 | 29.675 | 70 | 5 anos |
| INHAUMA | Apartamento | 1.481 | 10.220 | 1.742 | 1.902 | 6.760 | 8.887 | 220 | 3 anos |
| INHAUMA | Casa | 649 | 12.377 | 764 | 850 | 3.069 | 10.763 | 143 | 5 anos |
| INHOAIBA | Apartamento | 1.242 | 7.102 | 1.461 | 1.490 | 4.742 | 6.176 | 331 | 3 anos |
| INHOAIBA | Casa | 509 | 15.010 | 599 | 664 | 2.882 | 13.052 | 81 | 5 anos |
| IPANEMA | Apartamento | 6.413 | 84.363 | 7.545 | 8.453 | 20.946 | 73.359 | 2.919 | 3 anos |
| IPANEMA | Comercial | 6.639 | 155.930 | 7.810 | 8.052 | 20.588 | 135.591 | 235 | 3 anos |
| IRAJA | Apartamento | 1.368 | 11.536 | 1.609 | 1.789 | 5.731 | 10.031 | 1.448 | 3 anos |
| IRAJA | Casa | 808 | 18.251 | 950 | 984 | 3.473 | 15.870 | 327 | 3 anos |
| IRAJA | Comercial | 1.066 | 10.808 | 1.254 | 1.290 | 3.208 | 9.398 | 37 | 5 anos |
| ITANHANGA | Apartamento | 1.650 | 18.034 | 1.941 | 1.984 | 5.378 | 15.682 | 221 | 5 anos |
| ITANHANGA | Casa | 599 | 16.836 | 705 | 723 | 4.799 | 14.640 | 177 | 5 anos |
| JACAREPAGUA | Apartamento | 1.697 | 15.742 | 1.996 | 2.407 | 7.723 | 13.689 | 4.635 | 3 anos |
| JACAREPAGUA | Casa | 632 | 15.254 | 743 | 882 | 3.843 | 13.264 | 327 | 5 anos |
| JACAREPAGUA | Comercial | 1.531 | 19.430 | 1.801 | 2.402 | 5.626 | 16.896 | 315 | 3 anos |
| JACARE | Apartamento | 581 | 7.836 | 683 | 683 | 3.173 | 6.814 | 121 | 5 anos |
| JACARE | Casa | 646 | 6.047 | 760 | 779 | 1.990 | 5.258 | 49 | 5 anos |
| JARDIM AMERICA | Apartamento | 1.070 | 7.552 | 1.259 | 1.357 | 2.571 | 6.567 | 120 | 5 anos |
| JARDIM AMERICA | Casa | 755 | 12.955 | 888 | 926 | 2.589 | 11.265 | 164 | 5 anos |
| JARDIM BOTANICO | Apartamento | 3.885 | 32.789 | 4.570 | 5.919 | 13.904 | 28.512 | 673 | 3 anos |
| JARDIM BOTANICO | Casa | 2.975 | 55.064 | 3.500 | 4.237 | 14.857 | 47.882 | 171 | 5 anos |
| JARDIM BOTANICO | Comercial | 2.941 | 33.486 | 3.460 | 3.723 | 13.863 | 29.118 | 116 | 5 anos |
| JARDIM CARIOCA | Apartamento | 719 | 11.086 | 846 | 1.636 | 4.872 | 9.640 | 208 | 5 anos |
| JARDIM CARIOCA | Casa | 742 | 13.695 | 873 | 936 | 2.649 | 11.909 | 102 | 5 anos |
| JARDIM CARIOCA | Comercial | 1.688 | 42.927 | 1.986 | 2.038 | 5.741 | 37.328 | 30 | 5 anos |
| JARDIM GUANABARA | Apartamento | 1.683 | 15.303 | 1.980 | 2.225 | 5.693 | 13.307 | 926 | 3 anos |
| JARDIM GUANABARA | Casa | 1.279 | 13.618 | 1.505 | 1.605 | 4.076 | 11.842 | 230 | 3 anos |
| JARDIM GUANABARA | Comercial | 1.263 | 30.667 | 1.486 | 1.705 | 5.719 | 26.667 | 82 | 5 anos |
| JARDIM SULACAP | Apartamento | 1.723 | 9.422 | 2.027 | 2.049 | 4.589 | 8.193 | 302 | 5 anos |
| JARDIM SULACAP | Casa | 893 | 9.885 | 1.050 | 1.104 | 3.200 | 8.596 | 162 | 5 anos |
| JOA | Casa | 1.565 | 35.781 | 1.841 | 1.931 | 8.078 | 31.114 | 39 | 5 anos |
| LAGOA | Apartamento | 6.014 | 47.685 | 7.075 | 7.429 | 15.162 | 41.465 | 938 | 3 anos |
| LARANJEIRAS | Apartamento | 3.566 | 23.842 | 4.195 | 4.781 | 9.746 | 20.732 | 1.959 | 3 anos |
| LARANJEIRAS | Casa | 1.658 | 18.669 | 1.950 | 2.269 | 6.951 | 16.234 | 94 | 5 anos |
| LARANJEIRAS | Comercial | 823 | 36.812 | 968 | 968 | 8.075 | 32.010 | 30 | 5 anos |
| LEBLON | Apartamento | 8.520 | 71.100 | 10.023 | 11.120 | 21.958 | 61.826 | 2.400 | 3 anos |
| LEBLON | Comercial | 7.549 | 94.544 | 8.881 | 9.526 | 27.754 | 82.212 | 200 | 5 anos |
| LEME | Apartamento | 3.619 | 40.214 | 4.258 | 5.034 | 12.214 | 34.969 | 596 | 3 anos |
| LINS DE VASCONCELOS | Apartamento | 886 | 8.677 | 1.042 | 1.185 | 3.026 | 7.545 | 403 | 3 anos |
| LINS DE VASCONCELOS | Casa | 828 | 14.376 | 974 | 1.044 | 3.373 | 12.501 | 146 | 5 anos |
| MADUREIRA | Apartamento | 811 | 7.289 | 954 | 1.063 | 3.207 | 6.338 | 372 | 3 anos |
| MADUREIRA | Casa | 699 | 13.247 | 822 | 890 | 2.471 | 11.519 | 206 | 5 anos |
| MADUREIRA | Comercial | 1.595 | 48.981 | 1.876 | 1.899 | 4.768 | 42.592 | 213 | 5 anos |
| MAGALHAES BASTOS | Apartamento | 1.229 | 6.947 | 1.446 | 1.447 | 2.693 | 6.041 | 30 | 5 anos |
| MAGALHAES BASTOS | Casa | 709 | 6.695 | 834 | 853 | 2.135 | 5.822 | 70 | 5 anos |
| MARACANA | Apartamento | 2.226 | 16.711 | 2.619 | 2.879 | 6.638 | 14.531 | 1.161 | 3 anos |
| MARACANA | Casa | 1.873 | 16.064 | 2.204 | 2.270 | 3.913 | 13.969 | 94 | 5 anos |
| MARACANA | Comercial | 1.887 | 16.811 | 3.050 | 3.053 | 3.773 | 14.618 | 35 | 5 anos |
| MARECHAL HERMES | Apartamento | 765 | 12.003 | 900 | 900 | 5.455 | 10.437 | 327 | 5 anos |
| MARECHAL HERMES | Casa | 774 | 13.409 | 911 | 980 | 3.222 | 11.660 | 190 | 5 anos |
| MARIA DA GRACA | Apartamento | 1.359 | 9.222 | 1.599 | 1.733 | 3.526 | 8.019 | 216 | 5 anos |
| MARIA DA GRACA | Casa | 836 | 12.236 | 983 | 1.064 | 2.497 | 10.640 | 70 | 5 anos |
| MEIER | Apartamento | 1.549 | 10.002 | 1.822 | 1.992 | 4.070 | 8.697 | 1.249 | 3 anos |
| MEIER | Casa | 981 | 16.819 | 1.154 | 1.349 | 4.155 | 14.625 | 321 | 5 anos |
| MEIER | Comercial | 1.720 | 30.715 | 2.024 | 2.067 | 4.426 | 26.709 | 241 | 5 anos |
| MONERO | Apartamento | 2.004 | 13.716 | 2.358 | 2.397 | 4.916 | 11.927 | 189 | 5 anos |
| MONERO | Casa | 1.518 | 15.137 | 1.786 | 1.789 | 4.154 | 13.163 | 47 | 5 anos |
| OLARIA | Apartamento | 1.168 | 10.685 | 1.374 | 1.544 | 3.671 | 9.291 | 386 | 3 anos |
| OLARIA | Casa | 929 | 16.416 | 1.093 | 1.252 | 3.433 | 14.275 | 282 | 5 anos |
| OLARIA | Comercial | 998 | 7.820 | 1.174 | 1.261 | 2.717 | 6.800 | 47 | 5 anos |
| OSVALDO CRUZ | Apartamento | 947 | 9.206 | 1.114 | 1.274 | 3.238 | 8.005 | 137 | 5 anos |
| OSVALDO CRUZ | Casa | 830 | 20.073 | 976 | 1.000 | 3.262 | 17.455 | 159 | 5 anos |
| PACIENCIA | Apartamento | 753 | 7.362 | 886 | 932 | 3.681 | 4.514 | 256 | 5 anos |
| PACIENCIA | Casa | 608 | 6.749 | 715 | 778 | 2.122 | 5.869 | 83 | 5 anos |
| PADRE MIGUEL | Apartamento | 961 | 6.410 | 1.130 | 1.131 | 2.727 | 5.574 | 87 | 5 anos |
| PADRE MIGUEL | Casa | 731 | 7.518 | 860 | 902 | 2.191 | 6.537 | 178 | 5 anos |
| PADRE MIGUEL | Comercial | 772 | 8.947 | 908 | 911 | 1.639 | 7.780 | 33 | 5 anos |
| PAQUETA | Apartamento | 1.437 | 12.628 | 1.691 | 1.838 | 4.982 | 10.981 | 85 | 5 anos |
| PAQUETA | Casa | 1.278 | 14.684 | 1.504 | 1.587 | 4.851 | 12.769 | 80 | 5 anos |
| PARADA DE LUCAS | Apartamento | 786 | 10.957 | 925 | 925 | 5.462 | 9.528 | 244 | 3 anos |
| PARQUE ANCHIETA | Apartamento | 963 | 13.196 | 1.133 | 1.165 | 2.790 | 11.475 | 43 | 5 anos |
| PARQUE ANCHIETA | Casa | 736 | 10.490 | 866 | 908 | 2.149 | 9.122 | 110 | 5 anos |
| PARQUE COLUMBIA | Apartamento | 653 | 10.164 | 768 | 877 | 5.082 | 6.202 | 69 | 5 anos |
| PAVUNA | Apartamento | 780 | 9.796 | 918 | 981 | 3.957 | 8.518 | 255 | 5 anos |
| PAVUNA | Casa | 589 | 10.480 | 693 | 733 | 2.553 | 9.113 | 266 | 5 anos |
| PECHINCHA | Apartamento | 1.684 | 9.583 | 1.981 | 2.135 | 4.780 | 8.333 | 1.620 | 3 anos |
| PECHINCHA | Casa | 580 | 11.254 | 682 | 872 | 3.504 | 9.786 | 254 | 3 anos |
| PECHINCHA | Comercial | 1.243 | 12.706 | 1.462 | 1.787 | 3.805 | 11.049 | 203 | 5 anos |
| PEDRA DE GUARATIBA | Casa | 554 | 7.443 | 652 | 730 | 2.985 | 6.472 | 167 | 5 anos |
| PENHA CIRCULAR | Apartamento | 861 | 9.911 | 1.013 | 1.300 | 3.003 | 8.618 | 373 | 3 anos |
| PENHA CIRCULAR | Casa | 693 | 9.126 | 815 | 960 | 2.670 | 7.936 | 214 | 5 anos |
| PENHA CIRCULAR | Comercial | 622 | 12.610 | 732 | 786 | 1.780 | 10.965 | 73 | 5 anos |
| PENHA | Apartamento | 1.012 | 10.773 | 1.190 | 1.249 | 4.090 | 9.368 | 553 | 3 anos |
| PENHA | Casa | 709 | 8.860 | 834 | 955 | 2.538 | 7.704 | 251 | 5 anos |
| PENHA | Comercial | 1.029 | 21.092 | 1.210 | 1.250 | 4.703 | 18.341 | 183 | 5 anos |
| PIEDADE | Apartamento | 1.004 | 9.626 | 1.181 | 1.228 | 3.640 | 8.370 | 382 | 3 anos |
| PIEDADE | Casa | 681 | 8.415 | 801 | 818 | 2.441 | 7.317 | 209 | 3 anos |
| PILARES | Apartamento | 1.053 | 8.451 | 1.239 | 1.410 | 3.155 | 7.349 | 219 | 5 anos |
| PILARES | Casa | 728 | 11.935 | 857 | 904 | 3.394 | 10.378 | 118 | 5 anos |
| PILARES | Comercial | 1.195 | 17.233 | 1.406 | 1.672 | 4.076 | 14.985 | 120 | 5 anos |
| PITANGUEIRAS | Apartamento | 2.259 | 10.134 | 2.658 | 2.687 | 5.067 | 8.255 | 74 | 5 anos |
| PITANGUEIRAS | Casa | 848 | 10.044 | 998 | 1.016 | 2.903 | 8.734 | 46 | 5 anos |
| PORTUGUESA | Apartamento | 1.531 | 10.957 | 1.801 | 2.104 | 4.838 | 9.528 | 247 | 5 anos |
| PORTUGUESA | Casa | 980 | 12.872 | 1.153 | 1.172 | 3.892 | 11.193 | 163 | 5 anos |
| PRACA DA BANDEIRA | Apartamento | 1.880 | 11.894 | 2.212 | 2.371 | 5.647 | 10.343 | 245 | 3 anos |
| PRACA DA BANDEIRA | Casa | 1.301 | 14.045 | 1.530 | 1.552 | 4.129 | 12.213 | 40 | 5 anos |
| PRACA DA BANDEIRA | Comercial | 1.165 | 13.691 | 1.371 | 1.423 | 2.686 | 11.905 | 38 | 5 anos |
| PRACA SECA | Apartamento | 895 | 9.827 | 1.053 | 1.129 | 2.679 | 8.545 | 740 | 3 anos |
| PRACA SECA | Casa | 581 | 6.243 | 684 | 739 | 2.221 | 5.429 | 241 | 3 anos |
| PRAIA DA BANDEIRA | Apartamento | 1.588 | 9.428 | 1.868 | 1.915 | 4.714 | 7.623 | 93 | 5 anos |
| QUINTINO BOCAIUVA | Apartamento | 940 | 7.480 | 1.106 | 1.249 | 3.289 | 6.504 | 311 | 5 anos |
| QUINTINO BOCAIUVA | Casa | 742 | 8.649 | 873 | 892 | 2.316 | 7.521 | 229 | 5 anos |
| RAMOS | Apartamento | 1.111 | 9.436 | 1.307 | 1.371 | 4.176 | 8.205 | 415 | 3 anos |
| RAMOS | Casa | 847 | 17.276 | 997 | 1.193 | 3.335 | 15.023 | 234 | 5 anos |
| RAMOS | Comercial | 729 | 27.429 | 858 | 955 | 2.416 | 23.851 | 50 | 5 anos |
| REALENGO | Apartamento | 740 | 6.932 | 871 | 915 | 3.572 | 6.028 | 223 | 3 anos |
| REALENGO | Casa | 636 | 8.823 | 748 | 806 | 1.907 | 7.672 | 206 | 3 anos |
| RECREIO DOS BANDEIRANTES | Apartamento | 2.381 | 16.927 | 2.801 | 3.220 | 7.134 | 14.719 | 6.633 | 3 anos |
| RECREIO DOS BANDEIRANTES | Casa | 1.516 | 19.204 | 1.783 | 2.567 | 6.828 | 16.699 | 700 | 3 anos |
| RECREIO DOS BANDEIRANTES | Comercial | 2.032 | 17.765 | 2.391 | 2.434 | 5.372 | 15.448 | 541 | 3 anos |
| RIACHUELO | Apartamento | 1.127 | 9.819 | 1.326 | 1.464 | 3.700 | 8.538 | 297 | 3 anos |
| RIACHUELO | Casa | 927 | 10.382 | 1.091 | 1.099 | 2.435 | 9.028 | 102 | 5 anos |
| RIBEIRA | Apartamento | 1.850 | 11.883 | 2.177 | 2.298 | 5.496 | 10.333 | 195 | 5 anos |
| RICARDO DE ALBUQUERQUE | Casa | 502 | 11.625 | 591 | 592 | 2.421 | 10.109 | 67 | 5 anos |
| RIO COMPRIDO | Apartamento | 1.248 | 12.180 | 1.468 | 1.585 | 5.663 | 10.591 | 1.066 | 3 anos |
| RIO COMPRIDO | Casa | 711 | 14.324 | 837 | 894 | 2.520 | 12.456 | 108 | 5 anos |
| RIO COMPRIDO | Comercial | 814 | 7.994 | 958 | 1.135 | 3.997 | 6.018 | 77 | 5 anos |
| ROCHA MIRANDA | Apartamento | 963 | 8.055 | 1.133 | 1.155 | 3.329 | 7.004 | 140 | 5 anos |
| ROCHA MIRANDA | Casa | 506 | 20.038 | 595 | 634 | 2.753 | 17.424 | 137 | 5 anos |
| ROCHA | Apartamento | 1.142 | 8.084 | 1.343 | 1.385 | 3.207 | 7.030 | 258 | 5 anos |
| ROCHA | Casa | 713 | 10.672 | 839 | 895 | 2.485 | 9.280 | 76 | 5 anos |
| SAMPAIO | Apartamento | 996 | 7.744 | 1.172 | 1.233 | 2.832 | 6.734 | 124 | 5 anos |
| SAMPAIO | Casa | 735 | 6.611 | 865 | 876 | 2.381 | 5.749 | 46 | 5 anos |
| SANTA CRUZ | Apartamento | 827 | 7.337 | 973 | 1.047 | 3.885 | 6.380 | 2.271 | 3 anos |
| SANTA CRUZ | Casa | 599 | 37.844 | 705 | 709 | 2.715 | 32.908 | 135 | 5 anos |
| SANTA CRUZ | Comercial | 1.282 | 28.569 | 1.508 | 1.524 | 3.282 | 24.843 | 46 | 5 anos |
| SANTA TERESA | Apartamento | 1.802 | 19.551 | 2.120 | 2.257 | 6.082 | 17.001 | 556 | 3 anos |
| SANTA TERESA | Casa | 949 | 31.670 | 1.116 | 1.272 | 4.400 | 27.539 | 168 | 5 anos |
| SANTISSIMO | Apartamento | 1.055 | 5.878 | 1.241 | 1.313 | 3.913 | 5.111 | 335 | 3 anos |
| SANTISSIMO | Casa | 661 | 8.435 | 778 | 839 | 3.902 | 7.335 | 177 | 5 anos |
| SANTO CRISTO | Apartamento | 2.665 | 18.083 | 3.135 | 4.769 | 9.820 | 15.724 | 2.742 | 3 anos |
| SANTO CRISTO | Casa | 626 | 7.246 | 736 | 776 | 2.002 | 6.301 | 50 | 5 anos |
| SANTO CRISTO | Comercial | 997 | 21.257 | 1.173 | 1.216 | 8.816 | 18.484 | 41 | 5 anos |
| SAO CONRADO | Apartamento | 2.741 | 46.118 | 3.225 | 4.251 | 12.077 | 40.103 | 434 | 3 anos |
| SAO CONRADO | Casa | 863 | 45.217 | 1.015 | 1.408 | 7.856 | 39.319 | 64 | 5 anos |
| SAO CONRADO | Comercial | 2.635 | 28.875 | 3.100 | 3.148 | 8.466 | 25.109 | 55 | 5 anos |
| SAO CRISTOVAO | Apartamento | 1.796 | 13.227 | 2.113 | 2.332 | 7.939 | 11.502 | 1.582 | 3 anos |
| SAO CRISTOVAO | Casa | 841 | 13.074 | 989 | 1.071 | 3.277 | 11.369 | 136 | 5 anos |
| SAO CRISTOVAO | Comercial | 1.018 | 14.239 | 1.198 | 1.198 | 5.059 | 12.382 | 178 | 5 anos |
| SAO FRANCISCO XAVIER | Apartamento | 1.412 | 10.224 | 1.661 | 1.900 | 7.256 | 8.890 | 477 | 3 anos |
| SAUDE | Comercial | 1.054 | 17.778 | 1.240 | 1.272 | 2.544 | 15.459 | 80 | 5 anos |
| SENADOR CAMARA | Apartamento | 745 | 5.816 | 876 | 995 | 2.447 | 5.057 | 195 | 5 anos |
| SENADOR CAMARA | Casa | 630 | 8.156 | 741 | 781 | 2.396 | 7.092 | 146 | 5 anos |
| SENADOR VASCONCELOS | Apartamento | 870 | 5.148 | 1.023 | 1.135 | 2.574 | 3.862 | 46 | 5 anos |
| SENADOR VASCONCELOS | Casa | 648 | 6.733 | 762 | 817 | 2.537 | 5.855 | 106 | 5 anos |
| TANQUE | Apartamento | 1.360 | 11.208 | 1.600 | 1.671 | 3.885 | 9.746 | 333 | 3 anos |
| TANQUE | Casa | 614 | 13.187 | 722 | 880 | 2.766 | 11.467 | 177 | 5 anos |
| TANQUE | Comercial | 1.162 | 18.766 | 1.367 | 1.534 | 4.005 | 16.318 | 64 | 5 anos |
| TAQUARA | Apartamento | 1.559 | 11.753 | 1.834 | 1.945 | 4.679 | 10.220 | 2.149 | 3 anos |
| TAQUARA | Casa | 750 | 12.481 | 882 | 1.071 | 3.200 | 10.853 | 425 | 3 anos |
| TAQUARA | Comercial | 1.199 | 22.762 | 1.411 | 1.645 | 4.446 | 19.793 | 311 | 5 anos |
| TAUA | Apartamento | 1.408 | 10.440 | 1.657 | 1.810 | 3.793 | 9.078 | 222 | 3 anos |
| TAUA | Casa | 590 | 12.191 | 694 | 725 | 2.847 | 10.601 | 101 | 5 anos |
| TIJUCA | Apartamento | 1.854 | 15.076 | 2.181 | 2.521 | 6.077 | 13.110 | 5.707 | 3 anos |
| TIJUCA | Casa | 1.193 | 18.694 | 1.404 | 1.475 | 5.108 | 16.256 | 251 | 3 anos |
| TIJUCA | Comercial | 1.736 | 29.256 | 2.042 | 2.119 | 5.609 | 25.440 | 509 | 3 anos |
| TODOS OS SANTOS | Apartamento | 1.439 | 10.827 | 1.693 | 1.905 | 5.469 | 9.415 | 1.006 | 3 anos |
| TODOS OS SANTOS | Casa | 1.182 | 16.201 | 1.390 | 1.447 | 3.499 | 14.088 | 163 | 5 anos |
| TODOS OS SANTOS | Comercial | 1.574 | 18.063 | 1.852 | 2.077 | 4.668 | 15.707 | 249 | 5 anos |
| TOMAS COELHO | Apartamento | 991 | 8.674 | 1.166 | 1.274 | 4.337 | 5.095 | 144 | 5 anos |
| TOMAS COELHO | Casa | 522 | 8.815 | 614 | 635 | 2.290 | 7.665 | 55 | 5 anos |
| TURIACU | Apartamento | 1.034 | 6.990 | 1.216 | 1.238 | 2.542 | 6.078 | 57 | 5 anos |
| TURIACU | Casa | 592 | 9.358 | 696 | 746 | 2.341 | 8.137 | 42 | 5 anos |
| URCA | Apartamento | 6.690 | 31.027 | 7.871 | 8.327 | 13.838 | 26.980 | 216 | 5 anos |
| URCA | Casa | 4.644 | 32.885 | 5.464 | 5.497 | 12.225 | 28.596 | 36 | 5 anos |
| VARGEM GRANDE | Apartamento | 2.303 | 9.396 | 2.709 | 2.816 | 5.542 | 8.170 | 373 | 3 anos |
| VARGEM GRANDE | Casa | 936 | 11.356 | 1.101 | 1.433 | 5.646 | 9.875 | 224 | 5 anos |
| VARGEM PEQUENA | Apartamento | 1.988 | 8.937 | 2.339 | 2.359 | 4.833 | 7.771 | 330 | 3 anos |
| VARGEM PEQUENA | Casa | 932 | 16.271 | 1.097 | 1.403 | 4.745 | 14.149 | 283 | 3 anos |
| VASCO DA GAMA | Apartamento | 1.142 | 9.864 | 1.343 | 1.741 | 4.932 | 8.104 | 131 | 5 anos |
| VASCO DA GAMA | Casa | 742 | 15.128 | 873 | 1.070 | 3.667 | 13.155 | 43 | 5 anos |
| VAZ LOBO | Apartamento | 550 | 8.715 | 647 | 1.145 | 3.141 | 7.578 | 236 | 5 anos |
| VAZ LOBO | Casa | 693 | 10.940 | 815 | 854 | 2.815 | 9.513 | 60 | 5 anos |
| VICENTE DE CARVALHO | Apartamento | 1.097 | 9.944 | 1.291 | 1.328 | 4.900 | 8.647 | 287 | 5 anos |
| VICENTE DE CARVALHO | Casa | 1.131 | 18.685 | 1.331 | 1.373 | 2.846 | 16.248 | 100 | 5 anos |
| VICENTE DE CARVALHO | Comercial | 1.782 | 16.511 | 2.097 | 2.251 | 6.208 | 14.357 | 137 | 5 anos |
| VIDIGAL | Apartamento | 2.271 | 55.721 | 2.672 | 2.720 | 6.973 | 48.453 | 48 | 5 anos |
| VIGARIO GERAL | Apartamento | 913 | 5.357 | 1.074 | 1.095 | 2.127 | 4.658 | 48 | 5 anos |
| VIGARIO GERAL | Casa | 774 | 17.463 | 911 | 915 | 2.784 | 15.185 | 55 | 5 anos |
| VILA DA PENHA | Apartamento | 1.466 | 10.527 | 1.725 | 1.795 | 4.456 | 9.154 | 610 | 3 anos |
| VILA DA PENHA | Casa | 1.045 | 12.273 | 1.229 | 1.397 | 3.407 | 10.672 | 187 | 5 anos |
| VILA DA PENHA | Comercial | 867 | 13.036 | 1.020 | 1.057 | 5.269 | 11.336 | 97 | 5 anos |
| VILA ISABEL | Apartamento | 1.221 | 13.072 | 1.436 | 1.609 | 4.782 | 11.367 | 1.893 | 3 anos |
| VILA ISABEL | Casa | 930 | 13.579 | 1.094 | 1.241 | 3.961 | 11.808 | 291 | 5 anos |
| VILA ISABEL | Comercial | 1.574 | 21.298 | 1.852 | 1.859 | 4.356 | 18.520 | 191 | 5 anos |
| VILA KOSMOS | Apartamento | 1.274 | 9.324 | 1.499 | 1.512 | 3.442 | 8.108 | 102 | 5 anos |
| VILA KOSMOS | Casa | 795 | 22.476 | 935 | 1.004 | 3.171 | 19.544 | 119 | 5 anos |
| VILA VALQUEIRE | Apartamento | 1.294 | 11.407 | 1.522 | 1.737 | 4.404 | 9.919 | 564 | 3 anos |
| VILA VALQUEIRE | Casa | 583 | 17.837 | 686 | 905 | 3.590 | 15.510 | 345 | 5 anos |
| VILA VALQUEIRE | Comercial | 2.371 | 16.333 | 2.789 | 3.035 | 5.193 | 14.203 | 38 | 5 anos |
| VISTA ALEGRE | Apartamento | 1.524 | 11.627 | 1.793 | 1.859 | 4.309 | 10.110 | 134 | 5 anos |
| VISTA ALEGRE | Casa | 1.050 | 18.694 | 1.235 | 1.294 | 3.879 | 16.256 | 70 | 5 anos |
| ZUMBI | Apartamento | 2.035 | 10.702 | 2.394 | 2.723 | 5.351 | 8.309 | 92 | 5 anos |

---

## Apêndice C. Arquivos e documentos de referência

| Arquivo | Papel |
|---|---|
| `supabase/functions/_shared/itbiMarketStats.ts` | Núcleo estatístico. Fonte única. |
| `supabase/functions/_shared/outlierLimits.ts` | Cinto de outlier: tabela gerada de 317 pares, constantes da cidade e dos fatores do índice, conversão para preço da época, calibração por rua. |
| `supabase/functions/_shared/priceTrend.ts` | Regressão log de tendência. |
| `src/lib/logradouroSearch.ts` | Expansão de variantes de grafia. |
| `src/utils/valuationCalculations.ts` | Gap, caps, valores finais, score de confiança. |
| `src/utils/priceIndex.ts` | Leitura do índice de preços. |
| `src/components/valuation/Step1Location.tsx` | Orquestração da coleta e do cálculo na avaliação. |
| `supabase/functions/public-itbi-stats/index.ts` | API pública com a mesma metodologia. |
| `src/hooks/useKPIStats.ts` | KPIs do Dashboard (ponderado). |
| `src/hooks/useITBITransactions.ts` | Ranking e detalhe de microrregiões. |
| `src/utils/__tests__/itbiMarketStats.test.ts` | Cobertura de testes do núcleo. |
| `src/hooks/useHistoricalTransactionAnalysis.ts` | Análise histórica de 5 anos, liquidez, tendência e projeção. |
| `supabase/functions/parecer-nucleo/index.ts` | Parecer técnico (segunda opinião). |
| `supabase/functions/_shared/itbiIngestion.ts` | Regras de aceitação da carga (`LIMITES_INGESTAO`, `validarFeatureItbi`, `mesclarDuplicatasItbi`), usadas pelas duas cargas. |
| `supabase/functions/_shared/bairrosRio.ts` | Lista oficial de bairros (código, nome com acento) e `resolverNomeBairro`. |
| `supabase/functions/_shared/outlierLimitsGen.ts`, `scripts/gerar-cinto-outliers.ts` | Geração reproduzível de `OUTLIER_LIMITS_TABLE`, das constantes e do SQL de carga da `itbi_cinto` a partir dos CSVs das consultas 7.4 e 7.4b (`bun run cinto`). |
| `supabase/functions/sync-itbi-prefeitura/index.ts` | Carga completa: `valor_m2`, tipologia, data, trilha em `etl_log`. |
| `supabase/functions/sync-itbi-daily/index.ts` | Carga diária do mês corrente e anterior, mesmas regras de aceitação. |

Documentos complementares (histórico): `docs/auditoria-motor-avaliacao.md` (auditoria do motor, achados A1 a A17, calibração de 2026-09-02, fallback por raio); `docs/roteiro-alinhamento-metodologia-itbi.md` (histórico do alinhamento com a Prime Circle, caso da Avenida do Pepê, recalibração do cinto); `docs/calibracao-consultas.sql` (consultas 7.1 a 7.11; 7.4 e 7.4b regeneram o Apêndice B); `docs/calibracao/bloco711-filtro-ingestao-2026-09-03.md` (prova do filtro de R$ 100 mil e decisão); `docs/calibracao/cobertura-api-x-base-2026-09-03.md` (conferência bairro a bairro contra a API); `docs/calibracao/base-2026-09-03-recarga-30mil.md` (as duas cargas de 17h); `docs/calibracao/bloco73-analise-2026-09-03.md` (MAD par a par e a decisão da salvaguarda); `docs/handoff-2026-09-02.md` (mudanças de 2026-09-02 e roteiro de testes).
