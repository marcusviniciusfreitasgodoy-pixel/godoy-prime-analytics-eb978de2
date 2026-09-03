# Especificação de Metodologia ITBI — Godoy Prime Analytics

**Versão 2.0, consolidada (2026-09-03).** Substitui e unifica dois documentos escritos no mesmo dia: a "Especificação de Metodologia ITBI, documento de handoff" (v1.0, gerada via Lovable) e a "Especificação da lógica estatística" (gerada na auditoria). Nenhum dos dois continua válido separadamente.

**Código descrito:** `main` em `d780b57` (2026-09-03), `ENGINE_VERSION` 3.
**Finalidade:** permitir que o desenvolvedor da Prime Circle reproduza, número a número, o que o Analytics calcula em consultas, avaliações e pesquisas de mercado, e localize exatamente onde os dois sistemas divergem.

Como ler: as seções 1 a 13 são descritivas (o que o código faz, não o que deveria fazer). A seção 14 traz o roteiro de comparação e o checklist de aceite; a 15, as ressalvas do auditor; a 16, os casos de conferência com números reais da base; os apêndices, as constantes, a tabela completa do cinto de outliers e os arquivos de referência.

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

| Métrica | Valor em 03/09/2026 |
|---|---|
| Linhas em `itbi_transactions` | 30.011 |
| Escrituras (`SUM(total_transacoes)`) | 125.867 |
| Período coberto | 15/01/2020 a 15/05/2026 |
| Linhas com `uso = 'Residencial'` | 30.011 (100%) |

Todos os números da seção 16 foram apurados neste snapshot (consultas executadas via Lovable em 2026-09-03).


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

**Magnitude do erro se omitida:** Barra da Tijuca, últimos 12 meses — ponderada **R$ 12.066/m²** × simples R$ 10.950/m² (**+10,2%**). Jacarepaguá: 7.234 × 6.842 (**+5,7%**).

Magnitude do erro se a ponderação for omitida (12 meses, 2026-09-03): Barra da Tijuca, ponderada R$ 12.066/m² contra simples R$ 10.950/m² (+10,2 %); Jacarepaguá, 7.234 contra 6.842 (+5,7 %).

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

Arquivo: `supabase/functions/_shared/outlierLimits.ts` (reexportado por `src/lib/outlierLimits.ts`). Tabela estática `OUTLIER_LIMITS_TABLE` com 78 pares `"BAIRRO|Tipologia"` (bairro normalizado: maiúsculas, sem acento, espaços colapsados; tipologia `Apartamento` ou `Casa`).

Calibração vigente (2026-09-03): para cada par, janela móvel de **3 anos**, linhas residenciais com `percentual_transferido >= 90` e `valor_m2` preenchido; percentis ponderados por escrituras:

```
piso = round(P1  ponderado × 0,85)
teto = round(P99,5 ponderado × 1,15)
```

72 pares em 3 anos; 6 pares sem nenhuma escritura em 3 anos mantêm a calibração anterior de 5 anos com P99 (marcados `janela: "5 anos"`). Limites globais: piso mínimo 1.000, teto máximo 60.000. A tabela completa dos 78 pares está no Apêndice B. No código o campo do percentil superior chama-se `p995` (renomeado de `p99` em 2026-09-03). A tabela é regenerada pela consulta 7.4 de `docs/calibracao-consultas.sql` quando a base muda.

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
| Magnitude do ajuste | |ajuste| > 40 % −15; > 35 % −8; > 25 % −4 |
| Spread P10–P95 | > 55 % −18; > 40 % −10; > 30 % −4 |
| Documentação | fator < 0,85 −20; < 0,95 −8 |
| Liquidez (score 0–100 da análise histórica, seção 7) | ≥ 70 +10; ≥ 50 +5; < 30 −5 |
| Gap de anúncios | null −10; |gap| ≤ 15 +3; ≤ 25 0; ≤ 35 −3; > 35 −5 |
| Origem da amostra | rua 0; raio 100 m −5; raio 300 m −10; bairro −15; tipologia relaxada −5 |
| Clamp | [0, 100] |
| Teto por escrituras válidas | ≤ 2 → máx 40; ≤ 9 → máx 55; ≤ 29 → máx 75 |

Nível: ≥ 85 verde; ≥ 70 amarelo alto; ≥ 55 amarelo médio; < 55 vermelho.

### 3.6 Recomendação (`generateRecommendation`, ordem de avaliação)

1. documentação `incompleta` → **Avaliação Bloqueada**
2. escrituras válidas < 3 → **Amostra Insuficiente** (valor indicativo)
3. fator de documentação < 0,80 → **Consultar Especialista Jurídico** (ganho potencial `provavel × (1 - fator)`)
4. spread > 40 % e confiança < 55 → **Requerer Avaliação Técnica Formal**
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

Não recalcula: repete o estado. Mostra "Transações" = `transaction_count` (escrituras antes do corte), "Valor médio por m² (mediana)" = `med_m2`, os três valores, spread, confiança, gap e a tabela anual da análise histórica (transações, mínimo, médio, máximo por ano). Texto de metodologia impresso: "valores de referência (P10, mediana e P95 do R$/m², ponderados pelo número de escrituras) calculados exclusivamente com dados oficiais de transações; anúncios não entram na base". Classificação de spread no PDF: ≤ 22 % "precisão alta", ≤ 30 % "boa", ≤ 40 % "moderada", acima "baixa".

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

Cinto: **só teto** do bairro (`getOutlierLimit`, maior teto entre as tipologias), sem piso. Filtros comuns: `uso = 'Residencial'`, `bairro ILIKE`, `valor_m2 IS NOT NULL`, `percentual_transferido >= 90`, `LIMIT 10000`.

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

**Tabela e cards:** últimos 12 meses; `uso = 'Residencial'`, `bairro ILIKE`, `valor_m2 IS NOT NULL`, só teto, `percentual_transferido >= 90` (adicionado em 2026-09-03), `logradouro IS NOT NULL`, `LIMIT 10000`. Agrupa por logradouro:

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

Cache local (`historicalAnalysisCache.ts`, chave versão v16) só no escopo rua; não cacheia se houver 2 ou mais anos recentes zerados numa série com mais de 200 escrituras.

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
          área fora de [20; 5000] m²; valor fora de [100 mil; 200 milhões]; valor/área fora de [500; 300 000]
valor_m2 = valor / area
data_transacao = 'ano-mês-15' (dia 15 fixo; sem mês: 'ano-06-15')
bairro = nome da API em maiúsculas (ou mapa de código → nome)
uso = 'Comercial' se o texto contém "não residencial"/"comercial", senão 'Residencial'
tipologia = Apartamento (apartamento|apto|flat|cobertura) | Casa (casa|sobrado|residencia) | Terreno | Comercial (sala|loja|escritório) | padrão Apartamento
```

`sync-itbi-daily` reimporta o mês corrente e o anterior e chama `refresh_itbi_price_index()`. Geocodificação (`lat`, `lng`, `geom`) e `microbairro` são preenchidos por funções separadas, depois da carga; `logradouro_norm` pela função SQL da seção 2.9.

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
- [ ] Caso 2a reproduz 27 registros / 69 escrituras buscando por "Desenhista Luiz Guimarães".
- [ ] Caso 3 reproduz 5 registros / 12 escrituras buscando por "Avenida General Olyntho Pilar".

**Estatística**
- [ ] Toda média de preço é ponderada por `total_transacoes`.
- [ ] Mediana e percentis são ponderados, com a convenção posicional da seção 2.3.
- [ ] Cinto de outlier por bairro × tipologia carregado com os 78 pares do Apêndice B, usando **P99,5** (não P99) no teto.
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
- [ ] Caso 2c (série anual) reproduz os 7 anos dentro de ±1%.
- [ ] Caso 4 reproduz as 10 médias ponderadas dentro de ±1%.
- [ ] Caso 5 reproduz resultado idêntico com e sem cinto.

**Transparência**
- [ ] "Dados insuficientes" é exibido no lugar de número frágil.
- [ ] Período mostrado com as **datas efetivas**, não só o rótulo.
- [ ] Badge explicando que o ITBI é base agregada e registra valor de escritura, não preço de anúncio.

---


---

## 15. Ressalvas (opinião do auditor, separada do corpo descritivo)

Estas observações não descrevem o código; avaliam decisões. Estão aqui para que a comparação com a Prime Circle não trate como calibrado o que não foi.

1. **Janela padrão de 12 meses (mudada em 2026-09-03) não foi calibrada.** A calibração de 2026-09-02 (seção 10 do relatório de auditoria) mediu spread, k do MAD e limites em 5 anos fechados. Com 12 meses e mediana de 3 escrituras por linha, a maioria das ruas cai abaixo de 8 linhas e a janela expande sozinha para 24, 36 ou mais; o "12 meses" da tela é, na prática, "o menor período com 8 linhas". Isso é razoável, mas precisa ser dito ao usuário e medido: quantas avaliações realmente fecham em 12 meses.
2. **Faixa P10–P95 (mudada em 2026-09-03) com limiares de spread calibrados para P10–P90.** Os cortes 30/40/55 % de spread vieram da distribuição P10–P90 das ruas. P95 alarga a faixa por construção, então mais avaliações caem em "spread largo" e perdem confiança sem que o mercado tenha mudado. Recalibrar os limiares com a consulta 7.5 usando P95, ou voltar a P90.
3. **Piso e teto por logradouro no site público** (`getStreetOutlierLimits`) usam a amostra da rua para filtrar a amostra da rua. Com 8 linhas, P1 é o mínimo e P99 é o máximo: o filtro ou não corta nada ou corta dado real. O motor interno não faz isso; o site faz. Os dois deveriam ser iguais.
4. **Cinto recalibrado em 3 anos com P99,5.** Decisão defensável (tetos envelhecem), mas tomada para resolver um caso (Avenida do Pepe) e aplicada globalmente sem medir o efeito nos outros 77 pares. O metadado `janela` na tabela permite auditar.
5. **Fallback por raio está desligado e não validado.** A cobertura de geocodificação (consulta 7.9) e o spread por escopo (7.10) foram rodados pelo Lovable, mas os números não foram registrados no repositório. Não ligar sem eles.
6. **Confiança e recomendação não foram testadas contra vendas reais.** Os pesos da tabela 3.5 são heurísticos. Só o backtest da seção 14.3 diz se "85 pontos" significa alguma coisa.
7. **Anúncios como sinal:** o limiar de alerta de 15 % foi mantido por falta de amostra (4 avaliações com gap). A mediana observada foi negativa (anúncios abaixo do ITBI), o oposto da premissa do texto da recomendação.
8. **Coerência entre telas.** A tabela da seção 13 mostra janelas, filtros e estatísticas diferentes por tela: 12 meses móveis nos painéis, anos inteiros na busca avançada, 5 anos fechados na análise histórica, 60 meses no parecer técnico; média ponderada na maioria das telas, mediana no motor, média simples de linhas no ranking de microrregiões. Não é erro em si, mas "o número do Analytics" depende da tela. As quatro incoerências de filtro e de ponderação encontradas foram corrigidas (13.1); as diferenças de janela e de estatística central entre telas permanecem por desenho.

---

## 16. Casos de conferência (baseline de aceite)

Todos apurados em 2026-09-03, via consultas executadas pelo Lovable sobre a base descrita na seção 1.1 (os números não foram reexecutados pela auditoria; servem como baseline a confirmar na primeira rodada de comparação). Filtros comuns a todas as consultas: `uso = 'Residencial' AND percentual_transferido >= 90 AND valor_m2 IS NOT NULL`. Percentis calculados por expansão de peso (`generate_series`). Tolerância de aceite: **±1%** em médias e medianas, **exato** em contagens.

### Caso 1 — Avenida do Pepê (Barra da Tijuca), 5 janelas

Este é o caso que explicou a divergência histórica entre os dois sistemas: o "39" reportado externamente era **contagem de linhas da série inteira** (2020–2026), enquanto o Analytics contava **escrituras** em outra janela. A coincidência numérica era acidental.

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
| 12 m | 5 | 12 | 19.771 | 19.404 | 17.695 | 22.193 | 17.695 | 22.193 |
| 24 m | 13 | 42 | 18.533 | 19.361 | 14.182 | 22.099 | 13.040 | 22.193 |
| 36 m | 20 | 62 | 17.837 | 17.768 | 14.587 | 20.320 | 13.040 | 22.193 |
| 48 m | 24 | 75 | 17.322 | 17.480 | 13.919 | 20.320 | 12.595 | 22.193 |
| 60 m | 29 | 89 | 16.746 | 16.548 | 13.595 | 20.320 | 12.595 | 22.193 |

Leitura: a média ponderada cai monotonicamente conforme a janela abre — comportamento esperado num mercado em alta. **Um sistema que reporta "39" para esta rua está contando linhas de 60+ meses e chamando de transações.**

### Caso 2 — Rua Desenhista Luiz Guimarães (Barra da Tijuca)

**2a. Grafia na base** — prova de que a expansão de variantes é obrigatória:

| Grafia gravada | Registros | Escrituras |
|---|---:|---:|
| `RUA DESEN LUIZ GUIMARAES` | 27 | 69 |

Buscar por "Desenhista Luiz Guimarães" ou "Desenhista Luis Guimarães" **sem** as regras `DESENHISTA↔DESEN` e `LUIZ↔LUIS` retorna **zero linhas**.

**2b. Últimos 12 meses, Apartamento:** 4 registros, 8 escrituras.

| Mês | Escrituras | R$/m² | Valor |
|---|---:|---:|---:|
| 05/2026 | 2 | 9.360 | 1.235.568 |
| 01/2026 | 2 | 8.811 | 969.260 |
| 10/2025 | 2 | 9.362 | 1.235.817 |
| 09/2025 | 2 | 8.307 | 946.971 |

**2c. Série anual completa (média ponderada):**

| Ano | Registros | Escrituras | Média ponderada |
|---|---:|---:|---:|
| 2020 | 3 | 10 | 7.592 |
| 2021 | 7 | 20 | 7.839 |
| 2022 | 4 | 11 | 8.156 |
| 2023 | 5 | 11 | 8.152 |
| 2024 | 3 | 7 | 7.914 |
| 2025 | 3 | 6 | 8.766 |
| 2026 | 2 | 4 | 9.086 |

**Maior R$/m² já registrado nesta rua em 7 anos: R$ 9.362.** Nenhuma escritura acima de 9.400, em nenhum ano e em nenhuma janela. Uma faixa P10 8.450 / mediana 9.086 / P95 9.800 é exatamente o que a amostra sustenta — o P95 fica ligeiramente acima do maior bruto por efeito da deflação (seção 2.6). Qualquer sistema que apresente R$ 14.000/m² para esta rua **não está usando valor de escritura**.

### Caso 3 — General Olyntho Pilar (variantes de grafia)

| Grafia gravada | Bairro | Registros | Escrituras | Média pond. | Período |
|---|---|---:|---:|---:|---|
| `AVN GAL OLYNTHO PILLAR` | BARRA DA TIJUCA | 5 | 12 | 8.486 | 07/2021 – 08/2025 |

Requer simultaneamente `AVENIDA↔AVN`, `GENERAL↔GAL` e `PILAR↔PILLAR`. Nos últimos 12 meses esta rua **não tem transações** — o volume agregado que aparecia antes vinha do fallback para o bairro inteiro. Nesse caso o relatório deve declarar a origem `bairro` e aplicar a penalidade de −15 no score.

### Caso 4 — Controle global (fora da Barra), últimos 12 meses

Prova de que as regras são globais, não específicas da Barra da Tijuca.

| Bairro | Registros | Escrituras | Média **ponderada** | Média simples (errada) | Erro |
|---|---:|---:|---:|---:|---:|
| Copacabana | 328 | 1.958 | **11.123** | 11.195 | −0,6% |
| Barra da Tijuca | 323 | 1.616 | **12.066** | 10.950 | **+10,2%** |
| Recreio dos Bandeirantes | 281 | 1.160 | **6.893** | 6.832 | +0,9% |
| Tijuca | 262 | 1.050 | **6.096** | 6.156 | −1,0% |
| Jacarepaguá | 94 | 842 | **7.234** | 6.842 | **+5,7%** |
| Ipanema | 100 | 692 | **21.511** | 21.445 | +0,3% |
| Camorim | 40 | 578 | **6.916** | 6.849 | +1,0% |
| Botafogo | 137 | 562 | **11.493** | 11.704 | −1,8% |
| Campo Grande | 155 | 482 | **3.380** | 3.267 | +3,5% |
| Leblon | 134 | 426 | **23.032** | 23.249 | −0,9% |

O erro da média simples não é constante nem tem sinal previsível: depende de como as escrituras se distribuem entre agregados grandes e pequenos. Em Barra e Jacarepaguá é grande porque poucos agregados concentram muitas escrituras de alto valor.

### Caso 5 — Cinto de outlier, Copacabana | Apartamento, 12 meses

Piso 5.189 / teto 26.609 (Apêndice B).

| Escopo | Registros | Escrituras | Média pond. |
|---|---:|---:|---:|
| Sem cinto | 321 | 1.937 | 11.177 |
| Com cinto | 321 | 1.937 | 11.177 |

Resultado idêntico — o cinto **não corta mercado legítimo** num bairro bem calibrado. É uma rede de segurança contra erro de digitação, não um filtro de mercado. Se o sistema externo obtiver números diferentes entre as duas linhas, seu cinto está mal calibrado.

---

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
| `SPREAD_NORMAL/WIDE/VERY_WIDE_PCT` | 30 / 40 / 55 | valuationCalculations.ts |
| `SAMPLE_SCORE_CAPS` | ≤2→40, ≤9→55, ≤29→75 | valuationCalculations.ts |
| `MIN_ESCRITURAS_PARECER` | 3 | valuationCalculations.ts |
| `BAIRRO_FALLBACK_PENALTY` | 15 | valuationCalculations.ts |
| `TIPOLOGIA_FALLBACK_PENALTY` | 5 | valuationCalculations.ts |
| `FALLBACK_BAND_PP` | 3 p.p. | priceTrend.ts |
| `MAX_BAND_LOG` | 0,25 | priceTrend.ts |

---

## Apêndice B. Cinto de outliers: tabela completa (78 pares)

Chave = `BAIRRO|Tipologia`. 72 pares calibrados em janela de 3 anos, 6 em fallback de 5 anos (sem escrituras nos últimos 3 anos). A coluna P99,5 corresponde ao campo `p995` no código.

| Bairro | Tipologia | Piso | Teto | P1 | P99,5 | Escrituras | Janela |
|---|---|---:|---:|---:|---:|---:|---|
| AGUA SANTA | Apartamento | 1.856 | 5.206 | 2.183 | 4.527 | 123 | 5 anos |
| ANDARAI | Apartamento | 2.139 | 7.766 | 2.517 | 6.753 | 537 | 3 anos |
| ANIL | Apartamento | 3.053 | 6.955 | 3.592 | 6.048 | 371 | 3 anos |
| BANGU | Casa | 1.012 | 3.979 | 1.191 | 3.460 | 88 | 3 anos |
| BARRA DA TIJUCA | Apartamento | 5.239 | 23.852 | 6.164 | 20.741 | 5.956 | 3 anos |
| BARRA DA TIJUCA | Casa | 4.374 | 13.561 | 5.146 | 11.792 | 156 | 3 anos |
| BARRA OLIMPICA | Apartamento | 4.814 | 11.003 | 5.663 | 9.568 | 411 | 3 anos |
| BONSUCESSO | Apartamento | 1.818 | 5.779 | 2.139 | 5.025 | 137 | 3 anos |
| BOTAFOGO | Apartamento | 6.352 | 22.770 | 7.473 | 19.800 | 2.456 | 3 anos |
| BRAS DE PINA | Apartamento | 1.788 | 5.579 | 2.104 | 4.851 | 108 | 5 anos |
| CACHAMBI | Apartamento | 2.458 | 8.378 | 2.892 | 7.285 | 802 | 3 anos |
| CAMORIM | Apartamento | 4.260 | 11.520 | 5.012 | 10.017 | 1.730 | 3 anos |
| CAMPO DOS AFONSOS | Apartamento | 2.263 | 5.134 | 2.662 | 4.464 | 154 | 3 anos |
| CAMPO GRANDE | Apartamento | 1.870 | 5.660 | 2.200 | 4.922 | 1.228 | 3 anos |
| CAMPO GRANDE | Casa | 1.173 | 3.748 | 1.380 | 3.259 | 311 | 3 anos |
| CATETE | Apartamento | 4.959 | 14.537 | 5.834 | 12.641 | 538 | 3 anos |
| CENTRO | Apartamento | 3.442 | 11.150 | 4.050 | 9.696 | 91 | 3 anos |
| COLEGIO | Apartamento | 2.049 | 4.717 | 2.411 | 4.102 | 174 | 5 anos |
| COPACABANA | Apartamento | 5.189 | 26.609 | 6.105 | 23.138 | 6.343 | 3 anos |
| CURICICA | Apartamento | 3.111 | 8.580 | 3.660 | 7.461 | 243 | 3 anos |
| DEL CASTILHO | Apartamento | 3.481 | 6.987 | 4.095 | 6.076 | 421 | 3 anos |
| ENGENHO DE DENTRO | Apartamento | 1.635 | 7.038 | 1.923 | 6.120 | 497 | 3 anos |
| ENGENHO NOVO | Apartamento | 2.031 | 5.265 | 2.389 | 4.578 | 200 | 3 anos |
| FLAMENGO | Apartamento | 6.264 | 18.073 | 7.369 | 15.716 | 428 | 3 anos |
| FREGUESIA (ILHA) | Apartamento | 2.291 | 6.484 | 2.695 | 5.638 | 98 | 3 anos |
| FREGUESIA (JACAREPAGUA) | Apartamento | 2.958 | 7.900 | 3.480 | 6.870 | 1.537 | 3 anos |
| FREGUESIA (JACAREPAGUA) | Casa | 1.355 | 5.757 | 1.594 | 5.006 | 112 | 5 anos |
| GAVEA | Apartamento | 8.306 | 26.463 | 9.772 | 23.011 | 438 | 3 anos |
| GLORIA | Apartamento | 5.250 | 13.511 | 6.176 | 11.749 | 129 | 3 anos |
| GRAJAU | Apartamento | 1.822 | 7.492 | 2.143 | 6.515 | 432 | 3 anos |
| GUARATIBA | Casa | 1.293 | 3.051 | 1.521 | 2.653 | 111 | 3 anos |
| HUMAITA | Apartamento | 7.585 | 24.103 | 8.923 | 20.959 | 297 | 3 anos |
| INHOAIBA | Apartamento | 1.684 | 3.609 | 1.981 | 3.138 | 171 | 5 anos |
| IPANEMA | Apartamento | 7.744 | 48.073 | 9.111 | 41.803 | 2.069 | 3 anos |
| IRAJA | Apartamento | 2.060 | 6.657 | 2.423 | 5.789 | 564 | 3 anos |
| JACAREPAGUA | Apartamento | 4.048 | 10.770 | 4.762 | 9.365 | 3.709 | 3 anos |
| JARDIM BOTANICO | Apartamento | 7.021 | 24.080 | 8.260 | 20.939 | 337 | 3 anos |
| JARDIM GUANABARA | Apartamento | 2.699 | 8.264 | 3.175 | 7.186 | 310 | 3 anos |
| JARDIM SULACAP | Apartamento | 1.913 | 5.440 | 2.251 | 4.730 | 102 | 3 anos |
| LAGOA | Apartamento | 8.401 | 29.512 | 9.883 | 25.663 | 476 | 3 anos |
| LARANJEIRAS | Apartamento | 4.904 | 19.724 | 5.770 | 17.151 | 888 | 3 anos |
| LEBLON | Apartamento | 11.192 | 59.408 | 13.167 | 51.659 | 1.428 | 3 anos |
| LEME | Apartamento | 7.597 | 20.649 | 8.938 | 17.956 | 384 | 3 anos |
| LINS DE VASCONCELOS | Apartamento | 2.155 | 7.036 | 2.535 | 6.118 | 177 | 3 anos |
| MADUREIRA | Apartamento | 1.624 | 5.958 | 1.911 | 5.181 | 71 | 3 anos |
| MARACANA | Apartamento | 3.704 | 11.991 | 4.358 | 10.427 | 746 | 3 anos |
| MARECHAL HERMES | Apartamento | 1.869 | 5.600 | 2.199 | 4.870 | 114 | 3 anos |
| MEIER | Apartamento | 2.366 | 7.644 | 2.784 | 6.647 | 602 | 3 anos |
| OLARIA | Apartamento | 2.077 | 6.033 | 2.443 | 5.246 | 112 | 3 anos |
| PARADA DE LUCAS | Apartamento | 1.556 | 6.210 | 1.830 | 5.400 | 129 | 3 anos |
| PECHINCHA | Apartamento | 2.818 | 5.929 | 3.315 | 5.156 | 918 | 3 anos |
| PENHA | Apartamento | 1.836 | 6.918 | 2.160 | 6.016 | 188 | 3 anos |
| PENHA CIRCULAR | Apartamento | 1.922 | 4.685 | 2.261 | 4.074 | 110 | 3 anos |
| PIEDADE | Apartamento | 1.791 | 5.150 | 2.107 | 4.478 | 81 | 3 anos |
| PRACA DA BANDEIRA | Apartamento | 3.268 | 8.305 | 3.845 | 7.222 | 104 | 3 anos |
| PRACA SECA | Apartamento | 1.470 | 4.257 | 1.730 | 3.702 | 410 | 3 anos |
| RAMOS | Apartamento | 2.028 | 5.766 | 2.386 | 5.014 | 88 | 3 anos |
| RECREIO DOS BANDEIRANTES | Apartamento | 3.910 | 13.516 | 4.600 | 11.753 | 3.777 | 3 anos |
| RECREIO DOS BANDEIRANTES | Casa | 2.550 | 7.843 | 3.000 | 6.820 | 102 | 3 anos |
| RIACHUELO | Apartamento | 1.968 | 6.129 | 2.315 | 5.330 | 86 | 3 anos |
| RIO COMPRIDO | Apartamento | 2.070 | 8.366 | 2.435 | 7.275 | 145 | 3 anos |
| SANTA CRUZ | Apartamento | 1.784 | 3.724 | 2.099 | 3.238 | 146 | 3 anos |
| SANTA TERESA | Apartamento | 2.971 | 8.712 | 3.495 | 7.576 | 55 | 3 anos |
| SANTO CRISTO | Apartamento | 2.908 | 9.757 | 3.421 | 8.484 | 514 | 5 anos |
| SAO CONRADO | Apartamento | 6.129 | 30.167 | 7.211 | 26.232 | 271 | 3 anos |
| SAO CRISTOVAO | Apartamento | 3.654 | 9.776 | 4.299 | 8.501 | 101 | 3 anos |
| SAO FRANCISCO XAVIER | Apartamento | 2.371 | 6.351 | 2.789 | 5.523 | 391 | 3 anos |
| TANQUE | Apartamento | 2.153 | 5.827 | 2.533 | 5.067 | 118 | 3 anos |
| TAQUARA | Apartamento | 2.224 | 6.612 | 2.617 | 5.750 | 969 | 3 anos |
| TIJUCA | Apartamento | 2.626 | 11.446 | 3.089 | 9.953 | 3.663 | 3 anos |
| TODOS OS SANTOS | Apartamento | 2.673 | 7.608 | 3.145 | 6.616 | 646 | 3 anos |
| VARGEM GRANDE | Apartamento | 3.856 | 6.929 | 4.536 | 6.025 | 132 | 3 anos |
| VARGEM PEQUENA | Apartamento | 3.393 | 7.185 | 3.992 | 6.248 | 139 | 3 anos |
| VARGEM PEQUENA | Casa | 1.964 | 6.052 | 2.310 | 5.263 | 92 | 3 anos |
| VICENTE DE CARVALHO | Apartamento | 2.021 | 5.810 | 2.378 | 5.052 | 88 | 3 anos |
| VILA DA PENHA | Apartamento | 2.436 | 7.214 | 2.866 | 6.273 | 275 | 3 anos |
| VILA ISABEL | Apartamento | 2.358 | 8.850 | 2.774 | 7.696 | 992 | 3 anos |
| VILA VALQUEIRE | Apartamento | 1.805 | 6.840 | 2.123 | 5.948 | 194 | 3 anos |

---

## Apêndice C. Arquivos e documentos de referência

| Arquivo | Papel |
|---|---|
| `supabase/functions/_shared/itbiMarketStats.ts` | Núcleo estatístico. Fonte única. |
| `supabase/functions/_shared/outlierLimits.ts` | Cinto de outlier: tabela dos 78 pares + calibração por rua. |
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
| `supabase/functions/sync-itbi-prefeitura/index.ts` | Ingestão: filtros de carga, `valor_m2`, tipologia, data. |

Documentos complementares (histórico): `docs/auditoria-motor-avaliacao.md` (auditoria do motor, achados A1 a A17, calibração de 2026-09-02, fallback por raio); `docs/roteiro-alinhamento-metodologia-itbi.md` (histórico do alinhamento com a Prime Circle, caso da Avenida do Pepê, recalibração do cinto); `docs/calibracao-consultas.sql` (consultas 7.1 a 7.10; a 7.4 regenera o Apêndice B); `docs/handoff-2026-09-02.md` (mudanças de 2026-09-02 e roteiro de testes).
