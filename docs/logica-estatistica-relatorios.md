# Godoy Prime Analytics — Especificação da lógica estatística

**Versão do código descrita:** `main` em `640b0e1` (2026-09-03, inclui as 47 alterações feitas via Lovable em 2026-09-03), mais as quatro correções de coerência aplicadas em seguida (seção 13.1).
**Finalidade:** permitir que o desenvolvedor da Prime Circle reproduza, número a número, o que o Analytics calcula em consultas, avaliações e pesquisas de mercado, e localize exatamente onde os dois sistemas divergem. O corpo (seções 1 a 13) é descritivo: descreve o que o código faz, não o que deveria fazer. A seção 14 traz o roteiro de comparação e a seção 15 registra ressalvas e pontos não calibrados.

Convenções: referências `arquivo:linha` apontam para o commit acima. "Escrituras" = `SUM(total_transacoes)`. "Registros" ou "linhas" = `COUNT(*)`. Toda fórmula "ponderada" usa `total_transacoes` como peso, com `max(1, total_transacoes)` quando nulo.

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

72 pares em 3 anos; 6 pares sem nenhuma escritura em 3 anos mantêm a calibração anterior de 5 anos com P99 (marcados `janela: "5 anos"`). Limites globais: piso mínimo 1.000, teto máximo 60.000.

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

### 2.9 Normalização de logradouro

Front-end: `src/lib/logradouroSearch.ts` gera variantes de grafia para filtros `ilike` (GENERAL/GAL, OLYNTHO/OLINTO, PILLAR/PILAR, AVN/AV, remoção de número e de prefixo de tipo de via). Banco: função SQL `normalizar_logradouro_busca(texto)` (migration `20260903141055`): maiúsculas, sem acentos, só `[A-Z0-9]`, abreviações de tipo de via e patentes/títulos unificadas (AV, RUA, EST, PRACA, TV, ALA, LGO, ROD; GENERAL, CORONEL, TENENTE, CAPITAO, MAJOR, MARECHAL, ALMIRANTE, BRIGADEIRO, COMANDANTE, DOUTOR, PROFESSOR, ENGENHEIRO, DESENHISTA …). A seção 12 lista a regra completa.

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

### 13.1 Correções de coerência aplicadas em 2026-09-03

Encontradas durante a escrita deste documento e corrigidas no mesmo dia:

1. **Exports do painel e resumo da Sofia truncados em 1000 linhas.** As consultas não tinham `.limit()` e o PostgREST devolve no máximo 1000 linhas por requisição; o "backup completo" e a média da cidade usavam só as 1000 primeiras. Agora paginam em blocos de 1000 até esgotar (`Dashboard.tsx`, `chat-mercado/index.ts`).
2. **Tabela de Microrregiões sem filtro de percentual transferido.** Passou a exigir `percentual_transferido >= 90` como todas as outras telas (`useMicrobairroDetalhado`).
3. **Ranking de microrregiões com média e mediana simples de linhas.** Passou a ponderar por escrituras (`useMicrobairroRanking`, helper `resumoPonderado`, aplicado em paralelo pelo Lovable no mesmo dia); a mediana ponderada é o valor em que a soma acumulada dos pesos atinge metade do total. As consultas de ranking e da tabela de Microrregiões passaram de `LIMIT 10000` para `LIMIT 5000`.
4. **Análise histórica sem filtro de percentual transferido**, nas quatro consultas de tabela e na RPC `itbi_transacoes_raio` (migration `20260903160000`, `CREATE OR REPLACE`, precisa ser aplicada). Cache local invalidado (v17).

Também foi removida uma segunda função `useKPIStats` que vivia em `useITBITransactions.ts`, sem uso, com média simples e sem filtro de percentual.

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
