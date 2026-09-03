# Especificação de Metodologia ITBI — Godoy Prime Analytics

**Versão 2.6, consolidada (2026-09-03).** Substitui e unifica dois documentos escritos no mesmo dia: a "Especificação de Metodologia ITBI, documento de handoff" (v1.0, gerada via Lovable) e a "Especificação da lógica estatística" (gerada na auditoria). Nenhum dos dois continua válido separadamente. A v2.1 reescreveu a seção 15 como plano de ação. A v2.2 incorpora a segunda rodada de consultas (2026-09-03, 15h): recarga da base com perda da geocodificação, baselines da seção 16 reexecutados, spread P90 × P95 medido, corte do cinto de 3 anos por par, e as correções decorrentes (sync preservando geocodificação, limiares de spread recalibrados para P95). A v2.3 registra a terceira rodada: geocodificação recuperada (99,6 %), base no último mês da Prefeitura, cinto regenerado em Centro, Flamengo, Santo Cristo e Glória, trilha de auditoria da carga completa e o achado do filtro de bairro sem acento nas consultas de calibração. A v2.4 regenera o cinto inteiro (59 pares com 100 ou mais escrituras em 3 anos, consulta 7.4 sem filtro por nome) e registra a consulta 7.10, que fecha a decisão do fallback por raio. A v2.5 fecha o cinto: os 18 pares de amostra pequena regenerados com a consulta 7.4b (janela de 5 anos e regra de largura mínima), Barra Olímpica removida da tabela e a hipótese do filtro de ingestão de R$ 100 mil registrada como pendência 12. A v2.6 confirma essa hipótese com a consulta 7.11 e a contagem na API da Prefeitura, baixa o piso de valor da ingestão para R$ 30 mil num módulo compartilhado pelas duas cargas, corrige a carga diária (que não gravava peso nem percentual) e deixa escrito o protocolo da recarga que ainda falta.

**Código descrito:** `main` após o PR #20 (2026-09-03), `ENGINE_VERSION` 3. O export "código atual" recebido em 2026-09-03 é idêntico a este commit no código-fonte; só os arquivos de documentação diferem, por ter sido gerado antes da consolidação.
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

| Métrica | 2026-09-03, manhã (v1.0) | 2026-09-03, 15h (recarga) |
|---|---|---|
| Linhas em `itbi_transactions` | 30.011 | **31.472** |
| Escrituras (`SUM(total_transacoes)`) | 125.867 | **134.555** |
| Período coberto | 15/01/2020 a 15/05/2026 | 15/01/2020 a **15/07/2026** |
| Linhas com `uso = 'Residencial'` | 100 % | 100 % |
| Linhas com `geom` | 30.011 | **0** na recarga; **31.369 (99,6 %)** após o backfill das 15:59 (30.137 por `logradouros_geo`, 1.232 por fallback de logradouro sem bairro, 131 nulas em ruas de volume marginal) |

**Incidente de 2026-09-03.** A tabela foi truncada e reimportada entre 15:06 e 15:08 UTC, sem registro em `etl_log`, trazendo dois meses novos de dados e apagando a geocodificação de todas as linhas (`geom`, `lat`, `lng` nulos). Causa: a sincronização completa (`sync-itbi-prefeitura` com `clearExisting`) apagava as linhas do período antes de reinserir. A função foi corrigida no mesmo dia (seção 12) e reimplantada; as coordenadas foram recuperadas pelo backfill a partir de `logradouros_geo` (99,6 %). Último mês na base e na Prefeitura: 07/2026 (`detect-latest-itbi-month`, `isOutdated: false`). Quem disparou a carga não pôde ser determinado: a função não gravava em `etl_log` e os logs de edge function do período já tinham expirado; desde o PR #17 toda execução grava usuário, modo, `clearExisting` e período em `etl_log`, e o botão de sincronização nasce com a recarga desligada. Os números da seção 16 foram reexecutados sobre a base recarregada e são os vigentes; os da v1.0 ficam registrados entre parênteses para rastreabilidade.

**Segunda ressalva sobre esta base (17h).** A recarga das 15h aplicou o filtro de ingestão que descarta transações abaixo de R$ 100 mil (seção 12), e a carga que gerou a base da manhã provavelmente não. Na Zona Oeste isso apagou até metade do mercado (pendência 12 da seção 15.1: Santa Cruz ficou com 85 escrituras em 5 anos e a Prefeitura tem outras 186 entre R$ 50 mil e R$ 100 mil). O piso foi corrigido no código para R$ 30 mil, mas a base ainda não foi recarregada com ele. Enquanto isso não acontece, todo número desta especificação para bairros baratos (Santa Cruz, Campo Grande, Guaratiba, Inhoaíba, Paciência, Bangu, Cosmos, e casas em Irajá e Engenho de Dentro) descreve uma amostra truncada por cima do mercado real. Os casos da seção 16 (Barra, Copacabana, Tijuca, Botafogo, Ipanema, Leblon) não estão nessa lista; Centro, com kitnets, pode estar.

---

## 2. Primitivas comuns (módulo compartilhado)

Arquivo: `supabase/functions/_shared/itbiMarketStats.ts`, reexportado para o app por `src/utils/itbiMarketStats.ts`. Roda idêntico no navegador e nas edge functions. Testes em `src/utils/__tests__/itbiMarketStats.test.ts`.

### 2.1 Constantes

| Constante | Valor | Uso |
|---|---|---|
| `ENGINE_VERSION` | 3 | gravado nos metadados de cada avaliação |
| `WINDOW_MONTHS_OPTIONS` | 12, 24, 36, 48, 60 | opções de janela móvel |
| `DEFAULT_WINDOW_MONTHS` | **12** | janela padrão da avaliação e do site público |
| `MAX_WINDOW_MONTHS` | 60 | a consulta ao banco traz sempre 60 meses; o recorte é feito em memória |
| `MIN_ROWS_FOR_TIPOLOGIA` | 8 | abaixo disso o filtro de tipologia é relaxado |
| `MIN_ROWS_SCOPE` | 8 | abaixo disso um escopo (rua, raio) ou uma janela é "insuficiente" |
| `MIN_ROWS_FOR_MAD` | 8 | mínimo de linhas para aplicar o corte MAD |
| `MAD_K_INF` / `MAD_K_SUP` | 2,5 / 3,0 | cercas do MAD em escala log (inferior mais rigorosa) |
| `MIN_VALUES_FOR_IQR` | 4 | mínimo de escrituras para aplicar Tukey |
| `RANGE_LOW_P` / `RANGE_HIGH_P` | 0,10 / **0,95** | percentis da faixa exibida (mínimo e máximo) |
| `MAX_ROWS` | 5000 | limite de toda consulta (o PostgREST trunca em 1000 sem `limit`) |
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

Arquivo: `supabase/functions/_shared/outlierLimits.ts` (reexportado por `src/lib/outlierLimits.ts`). Tabela estática `OUTLIER_LIMITS_TABLE` com 77 pares `"BAIRRO|Tipologia"` (bairro normalizado: maiúsculas, sem acento, espaços colapsados; tipologia `Apartamento` ou `Casa`).

Calibração vigente (2026-09-03): para cada par, janela móvel de **3 anos**, linhas residenciais com `percentual_transferido >= 90` e `valor_m2` preenchido; percentis ponderados por escrituras:

```
piso = round(P1  ponderado × 0,85)
teto = round(P99,5 ponderado × 1,15)
```

59 pares com 100 ou mais escrituras em 3 anos (`janela: "3 anos"`), regenerados em 2026-09-03 (4ª rodada, consulta 7.4 agrupando por bairro sem filtrar por nome).

**Regra de amostra pequena** (18 pares com menos de `SMALL_SAMPLE_ESCRITURAS` = 100 escrituras em 3 anos; 5ª rodada, consulta 7.4b): o par usa a **janela de 5 anos** e o cinto ganha uma largura mínima em torno da mediana ponderada:

```
piso = max(1.000,  round(min(P1 × 0,85;   mediana / 2)))
teto = min(60.000, round(max(P99,5 × 1,15; mediana × 2)))      # SMALL_SAMPLE_WIDTH = 2
```

Motivo: com 37 a 211 escrituras, o P99,5 ponderado é o próprio máximo observado (em Santa Cruz, P5, mediana e P99,5 ficam entre 3.068 e 3.182: uma amostra de um único empreendimento). `P99,5 × 1,15` nesses pares deixa de filtrar erro e passa a filtrar mercado, cortando em silêncio a primeira venda legítima de um prédio novo. A largura mínima de 2× (e 1/2×) bloqueia o erro típico de digitação (dígito a mais, 10×) e delega o restante ao corte MAD (seção 2.7), que é a segunda rede. Nos 18 pares a regra de largura mínima prevaleceu no teto em todos e no piso em 12; Guaratiba Casa bate no piso global. Barra Olímpica saiu da tabela: a migration `20260521155956` reclassificou o bairro como Barra da Tijuca e a base não tem nenhuma linha com esse nome. Limites globais: piso mínimo 1.000, teto máximo 60.000. A tabela completa dos 77 pares está no Apêndice B. No código o campo do percentil superior chama-se `p995` (renomeado de `p99` em 2026-09-03). A tabela é regenerada pelas consultas 7.4 (pares grandes) e 7.4b (pares pequenos) de `docs/calibracao-consultas.sql` quando a base muda.

Resolução `getOutlierLimits(bairro, tipologia)`:
1. par exato bairro × tipologia → `{piso, teto, calibrado: true}`;
2. senão, se o bairro tem algum par: `piso = min(pisos do bairro)`, `teto = max(tetos do bairro)`;
3. senão `{1000, 60000, calibrado: false}`.

Mapeamento de tipologia: contém "casa" → `Casa`; contém "apartamento", "cobertura" ou "flat" → `Apartamento`; outro → sem tipologia (cai no passo 2).

**Piso e teto por logradouro** (`getStreetOutlierLimits`, usado **apenas** pelo site público, seção 9): com a amostra bruta da rua (60 meses, entre 1.000 e 60.000), se houver ≥ 8 linhas e ≥ 40 escrituras, `piso = max(1000, round(P1 ponderado × 0,85))`, `teto = min(60000, round(P99 ponderado × 1,15))`; senão usa os limites do bairro. O percentil aqui é calculado por soma acumulada de pesos `>= N·p` (ligeiramente diferente do `floor(N·p)` da seção 2.3).

O cinto é aplicado **na consulta SQL** (`valor_m2 >= piso AND valor_m2 <= teto`), antes de qualquer estatística.

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

Após o corte: se as linhas sobreviventes somarem **menos de 3 escrituras**, o corte é ignorado e a amostra inteira é mantida.

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
AND valor_m2 <= teto(bairro)            -- só TETO, sem piso; sem bairro: 60.000
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
bairro = UPPER(TRIM(bairro))            -- igualdade exata, não ILIKE
AND uso = 'Residencial'
AND percentual_transferido >= 90
AND valor_m2 IS NOT NULL
AND data_transacao BETWEEN hoje - 60 meses AND hoje
[AND logradouro ILIKE '%logradouro%']   -- sem variantes de grafia
[AND tipologia ILIKE '%tipologia%']     -- quando informada e diferente de "Todos"
```

Piso e teto:
- **sem logradouro:** limites do bairro × tipologia aplicados no SQL;
- **com logradouro:** consulta entre 1.000 e 60.000, depois `getStreetOutlierLimits` (seção 2.5): se a rua tem ≥ 8 linhas e ≥ 40 escrituras, piso/teto = P1/P99 ponderados da própria rua com margens; senão limites do bairro. O corte é feito em memória.

Depois: `selectRollingWindowRows(linhas, janela_meses)` (padrão 12, expansão automática), `deflateRows` com `itbi_price_index`, `calculateITBIData` com método **`mad` fixo** (não lê a configuração da organização).

Resposta: `min_m2` (P10), `med_m2` (mediana), `media_ponderada_m2`, `mediana_ponderada_m2`, `max_m2` (P95), `transaction_count` (escrituras antes do corte) e `meta` (inclui `limites_escopo` = `logradouro` | `bairro` e `limites_bairro`). Sem linhas: `stats: null` e mensagem "Dados insuficientes para esta localização".

Sugestões de rua (`action: 'suggestions'`): até 100 linhas `ILIKE` no bairro, agregadas por `logradouro` somando `total_transacoes`; condomínios de `condominios_mapeamento` primeiro, depois por escrituras desc; 10 resultados.

Diferenças em relação ao motor interno: filtro de bairro por igualdade (não `ILIKE`), logradouro sem variantes de grafia, sem cadeia rua → raio → bairro, sem relaxamento de tipologia, piso/teto por rua (só aqui), método sempre MAD.

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

As regras de aceitação vivem em `supabase/functions/_shared/itbiIngestion.ts` (`validarFeatureItbi`) e são as mesmas nas duas cargas. `sync-itbi-daily` reimporta o mês corrente e o anterior por upsert na chave natural (`logradouro, bairro, data_transacao, uso, tipologia`) e chama `refresh_itbi_price_index()`. Até 2026-09-03 a carga diária não aplicava filtro nenhum e não gravava `total_transacoes` nem `percentual_transferido`: cada linha nova dos dois meses mais recentes entrava com peso 1 e percentual 100 (os defaults da tabela), até a carga completa passar de novo pelo mês. Desde o PR #20 grava peso e percentual e rejeita o que a carga completa rejeita; os limites usados ficam registrados em `etl_log.detalhes.limites_ingestao` a cada carga completa. `sync-itbi-prefeitura` (carga completa por bairro ou de toda a cidade) também faz upsert na chave natural; com `clearExisting`, **desde 2026-09-03** não apaga nada antes de inserir: as linhas existentes são atualizadas preservando `lat`, `lng`, `geom`, `microbairro` e `geocodificado_via`, e só depois as linhas do período que a Prefeitura deixou de publicar (não tocadas pela sincronização, `updated_at` anterior ao início) são removidas. Antes dessa data a função apagava o período inteiro e reinseria, o que perdia a geocodificação (incidente da seção 1.1). Toda execução grava em `etl_log` (`fonte = sync_itbi_prefeitura`): usuário e e-mail do JWT, modo (bairro ou todos), `clear_existing`, período, contagens da API, registros válidos, inseridos, obsoletos removidos e status final. Geocodificação (`lat`, `lng`, `geom`) e `microbairro` são preenchidos por funções separadas, depois da carga; `logradouro_norm` pela função SQL da seção 2.9.

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
| corte de outlier | MAD em log, k 2,5/3,0, ≥ 8 linhas; cinto P1×0,85 / P99,5×1,15 por bairro | método, parâmetros, ordem |
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
- [ ] Cinto de outlier por bairro × tipologia carregado com os 77 pares do Apêndice B, usando **P99,5** (não P99) no teto e a regra de largura mínima nos 18 pares de amostra pequena.
- [ ] Calibração de piso e teto por logradouro (≥ 8 linhas e ≥ 40 escrituras) **só no site público**; o motor interno usa o cinto do bairro (ver ressalva 3 da seção 15).
- [ ] Corte MAD em log com `k_inf = 2,5` e `k_sup = 3,0`, mínimo de 8 linhas.
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

### 15.1 Pendências no Analytics, por prioridade

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
| 13 | Alta | **Recarga da base com o filtro novo, em ordem.** A base vigente foi carregada com o piso de 100 mil; as linhas descartadas só entram com uma carga completa. Uma recarga muda medianas, pisos e tetos dos bairros baratos e cria linhas novas sem geocodificação. | Sequência, sem pular etapa: (1) implantar `main` com o PR #20; (2) carga completa de todos os bairros, 2020 a 2026, com a recarga do período (`clearExisting`) **desligada** (o upsert só acrescenta e atualiza; nada é apagado); (3) `backfill_itbi_geom_from_logradouros` para as linhas novas; (4) `refresh_itbi_price_index()`; (5) `classify-microbairros` na Barra; (6) rodar 7.4 e 7.4b e regenerar o Apêndice B; (7) rodar 7.3 sobre a tabela nova; (8) reapurar a seção 16 e a seção 1.1. Quem dispara é decisão do dono (pendência 11). | `etl_log` com uma linha `sync_itbi_prefeitura` cujos `detalhes.limites_ingestao.valorMin` = 30000; escrituras totais acima de 134.555; Santa Cruz com mais de 85 escrituras em 5 anos; `geom` nulo em menos de 1 % das linhas. |
| 14 | Fechada no código | **Carga diária sem peso e sem percentual.** `sync-itbi-daily` não lia `total_transações` nem `média_percentual_transferido` da API: linhas novas dos dois meses mais recentes entravam com `total_transacoes = 1` e `percentual_transferido = 100`, e sem nenhum filtro de faixa. Consequência: o mês corrente pesava menos do que o mercado, e escrituras parciais passavam pelo filtro de 90 %. A carga completa corrigia ao passar de novo pelo mês, então o dano fica restrito ao intervalo entre as duas. | Feito no PR #20: a carga diária usa `validarFeatureItbi` e grava peso e percentual. | Linhas com `data_transacao` no mês corrente: `total_transacoes` com valores acima de 1 depois da primeira execução diária. |

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

Piso 5.189 / teto 26.609 na tabela vigente quando a consulta rodou; a 4ª rodada trouxe o par para piso 5.034 / teto 24.569 (Apêndice B). Como nenhuma linha de Copacabana em 12 meses passa de 24.569, o resultado abaixo não muda.

| Escopo | Registros | Escrituras | Média pond. |
|---|---:|---:|---:|
| Sem cinto | 403 | 2.416 | 11.182 |
| Com cinto | 403 | 2.416 | 11.182 |

Resultado idêntico: o cinto não corta mercado legítimo num bairro bem calibrado. É uma rede de segurança contra erro de digitação, não um filtro de mercado. Se o sistema externo obtiver números diferentes entre as duas linhas, seu cinto está mal calibrado. Contraponto na mesma rodada: em Glória, Santo Cristo, Centro e Flamengo o cinto de então cortava entre 4,6 % e 17,2 % das escrituras; os quatro foram regenerados no mesmo dia (pendência 5 da seção 15.1, fechada), e a 7.3 precisa ser reexecutada sobre a tabela final antes de esses bairros servirem de baseline.

---

## Apêndice A. Constantes do motor (referência rápida)

| Constante | Valor | Onde |
|---|---|---|
| `ENGINE_VERSION` | 3 | itbiMarketStats.ts |
| `MAX_ROWS` | 5000 | itbiMarketStats.ts |
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
| `DEFAULT_OUTLIER_MIN` / `MAX` | 1.000 / 60.000 | outlierLimits.ts |
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

## Apêndice B. Cinto de outliers: tabela completa (77 pares)

Chave = `BAIRRO|Tipologia` (normalizada: maiúsculas, sem acento). Estado de 2026-09-03, 5ª rodada: 59 pares com 100 ou mais escrituras em 3 anos calibrados em 3 anos com P1 × 0,85 e P99,5 × 1,15; 18 pares de amostra pequena calibrados em 5 anos com a regra de largura mínima da seção 2.5 (detalhe na segunda tabela). A coluna P99,5 corresponde ao campo `p995` no código. Leblon atinge o teto global de 60.000. Atenção ao regenerar: a base grava os bairros com acento (`GLÓRIA`, `BARRA OLÍMPICA`, `JACAREPAGUÁ`); a consulta 7.4 deve agrupar por `bairro` sem filtrar por nome, e a normalização acontece só na chave da tabela (pendência 5 da seção 15.1).

| Bairro | Tipologia | Piso | Teto | P1 | P99,5 | Escrituras | Janela |
|---|---|---:|---:|---:|---:|---:|---|
| AGUA SANTA | Apartamento | 1.595 | 6.380 | 2.111 | 4.527 | 127 | 5 anos (largura mínima) |
| ANDARAI | Apartamento | 2.189 | 7.737 | 2.575 | 6.728 | 573 | 3 anos |
| ANIL | Apartamento | 3.011 | 6.790 | 3.542 | 5.904 | 387 | 3 anos |
| BANGU | Casa | 1.034 | 4.134 | 1.498 | 3.460 | 56 | 5 anos (largura mínima) |
| BARRA DA TIJUCA | Apartamento | 5.251 | 22.312 | 6.178 | 19.402 | 6.277 | 3 anos |
| BARRA DA TIJUCA | Casa | 4.561 | 13.132 | 5.366 | 11.419 | 168 | 3 anos |
| BONSUCESSO | Apartamento | 1.821 | 6.058 | 2.142 | 5.268 | 167 | 3 anos |
| BOTAFOGO | Apartamento | 6.079 | 22.334 | 7.152 | 19.421 | 3.036 | 3 anos |
| BRAS DE PINA | Apartamento | 1.726 | 7.338 | 2.030 | 4.877 | 116 | 5 anos (largura mínima) |
| CACHAMBI | Apartamento | 2.137 | 8.059 | 2.514 | 7.008 | 864 | 3 anos |
| CAMORIM | Apartamento | 4.232 | 11.354 | 4.979 | 9.873 | 1.712 | 3 anos |
| CAMPO DOS AFONSOS | Apartamento | 2.435 | 5.134 | 2.865 | 4.464 | 135 | 3 anos |
| CAMPO GRANDE | Apartamento | 2.003 | 5.449 | 2.356 | 4.738 | 617 | 3 anos |
| CAMPO GRANDE | Casa | 1.158 | 3.726 | 1.362 | 3.240 | 185 | 3 anos |
| CATETE | Apartamento | 4.853 | 14.959 | 5.709 | 13.008 | 677 | 3 anos |
| CENTRO | Apartamento | 3.151 | 13.440 | 3.707 | 11.687 | 1.305 | 3 anos |
| COLEGIO | Apartamento | 1.734 | 6.938 | 2.516 | 4.160 | 174 | 5 anos (largura mínima) |
| COPACABANA | Apartamento | 5.034 | 24.569 | 5.922 | 21.364 | 6.822 | 3 anos |
| CURICICA | Apartamento | 3.057 | 9.220 | 3.596 | 8.017 | 251 | 3 anos |
| DEL CASTILHO | Apartamento | 3.317 | 6.969 | 3.902 | 6.060 | 449 | 3 anos |
| ENGENHO DE DENTRO | Apartamento | 1.633 | 7.076 | 1.921 | 6.153 | 520 | 3 anos |
| ENGENHO NOVO | Apartamento | 1.998 | 5.000 | 2.350 | 4.348 | 214 | 3 anos |
| FLAMENGO | Apartamento | 6.488 | 22.604 | 7.633 | 19.656 | 2.052 | 3 anos |
| FREGUESIA (ILHA) | Apartamento | 1.961 | 8.018 | 2.307 | 5.759 | 139 | 5 anos (largura mínima) |
| FREGUESIA (JACAREPAGUA) | Apartamento | 2.819 | 7.894 | 3.316 | 6.864 | 1.659 | 3 anos |
| FREGUESIA (JACAREPAGUA) | Casa | 1.275 | 7.110 | 1.500 | 5.168 | 117 | 5 anos (largura mínima) |
| GAVEA | Apartamento | 7.800 | 25.878 | 9.177 | 22.503 | 503 | 3 anos |
| GLORIA | Apartamento | 5.256 | 20.080 | 6.184 | 17.461 | 412 | 3 anos |
| GRAJAU | Apartamento | 2.816 | 7.511 | 3.313 | 6.531 | 472 | 3 anos |
| GUARATIBA | Casa | 1.000 | 3.724 | 1.642 | 2.653 | 54 | 5 anos (largura mínima) |
| HUMAITA | Apartamento | 7.585 | 22.708 | 8.924 | 19.746 | 355 | 3 anos |
| INHOAIBA | Apartamento | 1.259 | 5.036 | 1.932 | 2.816 | 37 | 5 anos (largura mínima) |
| IPANEMA | Apartamento | 7.563 | 50.837 | 8.898 | 44.206 | 2.246 | 3 anos |
| IRAJA | Apartamento | 2.021 | 6.664 | 2.378 | 5.795 | 600 | 3 anos |
| JACAREPAGUA | Apartamento | 3.400 | 10.778 | 4.000 | 9.372 | 3.814 | 3 anos |
| JARDIM BOTANICO | Apartamento | 7.006 | 23.058 | 8.242 | 20.050 | 359 | 3 anos |
| JARDIM GUANABARA | Apartamento | 2.755 | 8.135 | 3.241 | 7.074 | 337 | 3 anos |
| JARDIM SULACAP | Apartamento | 1.907 | 7.724 | 2.243 | 4.507 | 81 | 5 anos (largura mínima) |
| LAGOA | Apartamento | 8.380 | 29.450 | 9.859 | 25.609 | 519 | 3 anos |
| LARANJEIRAS | Apartamento | 4.374 | 18.851 | 5.146 | 16.392 | 1.381 | 3 anos |
| LEBLON | Apartamento | 11.239 | 60.000 | 13.222 | 53.625 | 1.523 | 3 anos |
| LEME | Apartamento | 7.571 | 20.510 | 8.907 | 17.835 | 425 | 3 anos |
| LINS DE VASCONCELOS | Apartamento | 2.152 | 7.036 | 2.532 | 6.118 | 199 | 3 anos |
| MADUREIRA | Apartamento | 1.546 | 6.184 | 1.994 | 5.181 | 132 | 5 anos (largura mínima) |
| MARACANA | Apartamento | 3.676 | 11.584 | 4.325 | 10.073 | 794 | 3 anos |
| MARECHAL HERMES | Apartamento | 1.974 | 7.894 | 2.799 | 4.859 | 211 | 5 anos (largura mínima) |
| MEIER | Apartamento | 2.315 | 7.545 | 2.723 | 6.561 | 648 | 3 anos |
| OLARIA | Apartamento | 2.077 | 6.592 | 2.443 | 5.732 | 123 | 3 anos |
| PARADA DE LUCAS | Apartamento | 1.556 | 6.106 | 1.830 | 5.310 | 136 | 3 anos |
| PECHINCHA | Apartamento | 2.804 | 5.967 | 3.299 | 5.189 | 1.002 | 3 anos |
| PENHA CIRCULAR | Apartamento | 1.936 | 4.486 | 2.278 | 3.901 | 108 | 3 anos |
| PENHA | Apartamento | 1.958 | 6.918 | 2.304 | 6.016 | 210 | 3 anos |
| PIEDADE | Apartamento | 1.782 | 7.426 | 2.096 | 4.478 | 165 | 5 anos (largura mínima) |
| PRACA DA BANDEIRA | Apartamento | 3.284 | 8.211 | 3.864 | 7.140 | 110 | 3 anos |
| PRACA SECA | Apartamento | 1.454 | 4.356 | 1.710 | 3.788 | 439 | 3 anos |
| RAMOS | Apartamento | 1.816 | 7.262 | 2.401 | 5.014 | 139 | 5 anos (largura mínima) |
| RECREIO DOS BANDEIRANTES | Apartamento | 3.743 | 13.501 | 4.404 | 11.740 | 3.536 | 3 anos |
| RECREIO DOS BANDEIRANTES | Casa | 2.680 | 10.718 | 4.403 | 6.820 | 200 | 5 anos (largura mínima) |
| RIACHUELO | Apartamento | 1.633 | 6.532 | 2.231 | 5.330 | 112 | 5 anos (largura mínima) |
| RIO COMPRIDO | Apartamento | 1.941 | 8.449 | 2.283 | 7.347 | 511 | 3 anos |
| SANTA CRUZ | Apartamento | 1.534 | 6.136 | 2.303 | 3.182 | 85 | 5 anos (largura mínima) |
| SANTA TERESA | Apartamento | 2.959 | 9.329 | 3.481 | 8.112 | 257 | 3 anos |
| SANTO CRISTO | Apartamento | 1.640 | 11.721 | 1.929 | 10.192 | 581 | 3 anos |
| SAO CONRADO | Apartamento | 6.104 | 29.925 | 7.181 | 26.022 | 280 | 3 anos |
| SAO CRISTOVAO | Apartamento | 2.707 | 9.860 | 3.185 | 8.574 | 488 | 3 anos |
| SAO FRANCISCO XAVIER | Apartamento | 2.307 | 6.203 | 2.714 | 5.394 | 408 | 3 anos |
| TANQUE | Apartamento | 2.240 | 5.771 | 2.635 | 5.018 | 126 | 3 anos |
| TAQUARA | Apartamento | 2.149 | 7.007 | 2.528 | 6.093 | 1.080 | 3 anos |
| TIJUCA | Apartamento | 2.590 | 11.446 | 3.047 | 9.953 | 3.967 | 3 anos |
| TODOS OS SANTOS | Apartamento | 2.554 | 7.660 | 3.005 | 6.661 | 682 | 3 anos |
| VARGEM GRANDE | Apartamento | 3.856 | 6.918 | 4.536 | 6.016 | 137 | 3 anos |
| VARGEM PEQUENA | Apartamento | 3.393 | 7.146 | 3.992 | 6.214 | 146 | 3 anos |
| VARGEM PEQUENA | Casa | 1.602 | 7.562 | 1.885 | 5.263 | 182 | 5 anos (largura mínima) |
| VICENTE DE CARVALHO | Apartamento | 2.048 | 8.192 | 2.531 | 5.167 | 167 | 5 anos (largura mínima) |
| VILA DA PENHA | Apartamento | 2.480 | 7.213 | 2.918 | 6.272 | 287 | 3 anos |
| VILA ISABEL | Apartamento | 2.287 | 8.936 | 2.690 | 7.770 | 1.079 | 3 anos |
| VILA VALQUEIRE | Apartamento | 1.827 | 6.760 | 2.149 | 5.878 | 208 | 3 anos |


Detalhe dos 18 pares de amostra pequena (consulta 7.4b, `docs/calibracao/bloco74-19pares-3e5anos-2026-09-03.csv`). "Esc. 3a" e "Esc. 5a" são as escrituras nas duas janelas; a coluna "Regra" diz qual termo prevaleceu no teto e no piso.

| Bairro | Tipologia | Mediana | Esc. 3a | Esc. 5a | Piso anterior → novo | Teto anterior → novo | Regra (piso; teto) |
|---|---|---:|---:|---:|---|---|---|
| AGUA SANTA | Apartamento | 3.190 | 53 | 127 | 1.856 → 1.595 | 5.206 → 6.380 | mediana/2; mediana×2 |
| BANGU | Casa | 2.067 | 42 | 56 | 1.012 → 1.034 | 3.979 → 4.134 | mediana/2; mediana×2 |
| BRAS DE PINA | Apartamento | 3.669 | 61 | 116 | 1.788 → 1.726 | 5.579 → 7.338 | P1×0,85; mediana×2 |
| COLEGIO | Apartamento | 3.469 | 24 | 174 | 2.049 → 1.734 | 4.717 → 6.938 | mediana/2; mediana×2 |
| FREGUESIA (ILHA) | Apartamento | 4.009 | 95 | 139 | 2.291 → 1.961 | 6.484 → 8.018 | P1×0,85; mediana×2 |
| FREGUESIA (JACAREPAGUA) | Casa | 3.555 | 68 | 117 | 1.355 → 1.275 | 5.757 → 7.110 | P1×0,85; mediana×2 |
| GUARATIBA | Casa | 1.862 | 54 | 54 | 1.293 → 1.000 | 3.051 → 3.724 | mediana/2; mediana×2 |
| INHOAIBA | Apartamento | 2.518 | 37 | 37 | 1.684 → 1.259 | 3.609 → 5.036 | mediana/2; mediana×2 |
| JARDIM SULACAP | Apartamento | 3.862 | 64 | 81 | 1.913 → 1.907 | 5.440 → 7.724 | P1×0,85; mediana×2 |
| MADUREIRA | Apartamento | 3.092 | 68 | 132 | 1.624 → 1.546 | 5.958 → 6.184 | mediana/2; mediana×2 |
| MARECHAL HERMES | Apartamento | 3.947 | 98 | 211 | 1.869 → 1.974 | 5.600 → 7.894 | mediana/2; mediana×2 |
| PIEDADE | Apartamento | 3.713 | 82 | 165 | 1.791 → 1.782 | 5.150 → 7.426 | P1×0,85; mediana×2 |
| RAMOS | Apartamento | 3.631 | 79 | 139 | 2.028 → 1.816 | 5.766 → 7.262 | mediana/2; mediana×2 |
| RECREIO DOS BANDEIRANTES | Casa | 5.359 | 95 | 200 | 2.550 → 2.680 | 7.843 → 10.718 | mediana/2; mediana×2 |
| RIACHUELO | Apartamento | 3.266 | 79 | 112 | 1.968 → 1.633 | 6.129 → 6.532 | mediana/2; mediana×2 |
| SANTA CRUZ | Apartamento | 3.068 | 85 | 85 | 1.784 → 1.534 | 3.724 → 6.136 | mediana/2; mediana×2 |
| VARGEM PEQUENA | Casa | 3.781 | 86 | 182 | 1.964 → 1.602 | 6.052 → 7.562 | P1×0,85; mediana×2 |
| VICENTE DE CARVALHO | Apartamento | 4.096 | 83 | 167 | 2.021 → 2.048 | 5.810 → 8.192 | mediana/2; mediana×2 |

Guaratiba Casa, Inhoaíba e Santa Cruz têm a mesma amostra nas duas janelas: nenhuma escritura com mais de 3 anos sobreviveu à carga (pendência 12 da seção 15.1).

---

## Apêndice C. Arquivos e documentos de referência

| Arquivo | Papel |
|---|---|
| `supabase/functions/_shared/itbiMarketStats.ts` | Núcleo estatístico. Fonte única. |
| `supabase/functions/_shared/outlierLimits.ts` | Cinto de outlier: tabela dos 77 pares (regra de amostra pequena incluída) + calibração por rua. |
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
| `supabase/functions/_shared/itbiIngestion.ts` | Regras de aceitação da carga (`LIMITES_INGESTAO`, `validarFeatureItbi`), usadas pelas duas cargas. |
| `supabase/functions/sync-itbi-prefeitura/index.ts` | Carga completa: `valor_m2`, tipologia, data, trilha em `etl_log`. |
| `supabase/functions/sync-itbi-daily/index.ts` | Carga diária do mês corrente e anterior, mesmas regras de aceitação. |

Documentos complementares (histórico): `docs/auditoria-motor-avaliacao.md` (auditoria do motor, achados A1 a A17, calibração de 2026-09-02, fallback por raio); `docs/roteiro-alinhamento-metodologia-itbi.md` (histórico do alinhamento com a Prime Circle, caso da Avenida do Pepê, recalibração do cinto); `docs/calibracao-consultas.sql` (consultas 7.1 a 7.11; 7.4 e 7.4b regeneram o Apêndice B); `docs/calibracao/bloco711-filtro-ingestao-2026-09-03.md` (prova do filtro de R$ 100 mil e decisão); `docs/handoff-2026-09-02.md` (mudanças de 2026-09-02 e roteiro de testes).
