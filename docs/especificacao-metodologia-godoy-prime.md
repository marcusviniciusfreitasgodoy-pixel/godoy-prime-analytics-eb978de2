# Especificação de Metodologia ITBI — Godoy Prime Analytics

**Documento de handoff para desenvolvimento externo**
Versão 1.0 — snapshot da base e do código em **03/09/2026**
Engine version: **3** (`ENGINE_VERSION` em `_shared/itbiMarketStats.ts`)

---

## Parte 0 — Como usar este documento

### 0.1 Objetivo

Permitir que um sistema externo **reproduza exatamente** os números que o Godoy Prime Analytics apresenta em três áreas:

1. **Avaliação** (motor de valuation, 6 etapas, laudo em PDF);
2. **Pesquisa de Mercado** (busca por rua/bairro/microbairro, comparativos, exportações);
3. **Painel Analítico / Dashboard e Microrregiões** (KPIs, rankings, evolução).

Duas implementações só produzem o mesmo número quando concordam em **quatro** coisas, nesta ordem: (1) o que é uma linha, (2) quais linhas entram, (3) qual é o peso de cada linha, (4) qual estatística é aplicada. Este documento fixa as quatro.

### 0.2 Glossário

| Termo | Definição operacional |
|---|---|
| **Registro / linha agregada** | Uma linha de `itbi_transactions`. É o agregado mensal da Prefeitura por `logradouro × mês × uso × tipologia`. **Não é uma venda.** |
| **Escritura / transação real** | Uma venda individual. Vive dentro de uma linha agregada, contada em `total_transacoes`. |
| **`valor_m2`** | Razão entre a **média** do valor e a **média** da área do grupo agregado. É um valor médio, não o valor de uma unidade. |
| **Peso (`w`)** | `MAX(1, total_transacoes)`. Toda estatística de preço é ponderada por ele. |
| **Percentil ponderado** | Percentil calculado como se cada linha fosse repetida `w` vezes. |
| **Cinto de outlier** | Piso e teto absolutos de R$/m², por bairro × tipologia, aplicados **na consulta SQL**, antes de qualquer estatística. |
| **Corte estatístico** | Cerca calculada sobre a própria amostra (MAD em log ou IQR de Tukey), aplicada **depois** do cinto. |
| **Janela móvel** | Últimos N meses contados a partir de hoje. N ∈ {12, 24, 36, 48, 60}; padrão 12. |
| **Deflação / correção temporal** | Trazer cada linha para o trimestre de referência via índice de preços próprio. |
| **Fallback geográfico** | Sequência rua → raio 100 m → raio 300 m → bairro, usada quando a rua não tem amostra. |

### 0.3 A regra de ouro

> **Linha ≠ transação.** `COUNT(*)` subestima o mercado em cerca de 4× (30.011 linhas ↔ 125.867 escrituras na base atual). Todo relatório exibe **dois** números separados: "Registros ITBI (agregações mensais)" = `COUNT(*)` e "Escrituras Reais (transações)" = `SUM(total_transacoes)`.

Consequência direta: **qualquer média, mediana ou percentil de preço calculado sem peso está errado.** Este é o erro nº 1 na comparação entre sistemas.

### 0.4 Snapshot da base usado neste documento

| Métrica | Valor em 03/09/2026 |
|---|---|
| Linhas em `itbi_transactions` | 30.011 |
| Escrituras (`SUM(total_transacoes)`) | 125.867 |
| Período coberto | 15/01/2020 a 15/05/2026 |
| Linhas com `uso = 'Residencial'` | 30.011 (100%) |

Todos os números de conferência da Parte 6 foram apurados neste snapshot.

---

## Parte 1 — Modelo de dados e definição da amostra

### 1.1 Colunas usadas

| Coluna | Uso |
|---|---|
| `logradouro` | Chave de busca por rua. Grafia oficial da Prefeitura (abreviada, sem acento). |
| `bairro` | Chave de agregação. **Pode vir acentuado** (`JACAREPAGUÁ`). Normalizar antes de comparar. |
| `data_transacao` | Sempre o dia 15 do mês de referência. Define a janela. |
| `uso` | Filtro obrigatório: `'Residencial'`. |
| `tipologia` | `Apartamento` \| `Casa` \| `Comercial`. Coberturas são agregadas em `Apartamento`. |
| `valor_m2` | Métrica principal. |
| `valor_transacao` | Valor médio do grupo. Usado no volume financeiro. |
| `area_m2` | Área média do grupo. |
| `total_transacoes` | **Peso.** Nunca ignorar. |
| `percentual_transferido` | Filtro obrigatório: `>= 90`. Exclui transferências parciais de fração ideal. |

### 1.2 Filtros mínimos obrigatórios (em toda consulta ITBI)

```sql
WHERE uso = 'Residencial'
  AND percentual_transferido >= 90
  AND valor_m2 IS NOT NULL
```

Filtros seguintes, quando aplicáveis, nesta ordem lógica:

```sql
  AND valor_m2 BETWEEN :piso AND :teto        -- cinto de outlier (Parte 2.3)
  AND data_transacao >= :inicio_janela
  AND data_transacao <= :fim_janela
  AND tipologia = :tipologia                  -- quando conhecida
  AND bairro ILIKE :bairro                    -- quando escopo = bairro
  AND (logradouro ILIKE '%v1%' OR ... )       -- quando escopo = logradouro (Parte 1.4)
```

Ordenação **explícita e determinística** (senão o `LIMIT` produz amostras diferentes entre execuções):

```sql
ORDER BY data_transacao DESC, logradouro ASC, tipologia ASC
LIMIT 5000
```

### 1.3 Limite de linhas — armadilha silenciosa

`MAX_ROWS = 5000`. O PostgREST **trunca em 1.000 linhas por padrão, sem erro**. Um sistema que não define o limite explicitamente recebe uma amostra parcial e produz números menores, sem qualquer aviso. Quando a consulta retorna exatamente `MAX_ROWS` linhas, o metadado `truncado = true` é gravado e a amostra deve ser declarada parcial.

> **Divergência conhecida a corrigir no Analytics:** os hooks `useKPIStats.ts` (linhas 113, 145, 170, 192) e `useITBITransactions.ts` (linhas 99, 214, 331, 344) ainda usam `.limit(10000)`. O padrão do produto é 5.000. Para reprodução exata, o sistema externo deve usar **5.000** e ambos os lados devem convergir para esse valor.

### 1.4 Normalização de logradouro e variantes de grafia

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

O mesmo conjunto de regras existe no banco, na função `normalizar_logradouro_busca`, para que a canonização no servidor e no cliente coincidam.

### 1.5 Escopo de condomínio

Quando o imóvel pertence a um condomínio com `ruas_internas` cadastradas, a busca por logradouro é substituída por um `OR` de `ILIKE` sobre **todas** as ruas internas, e o filtro de bairro é **mantido** (nomes de ruas internas são genéricos e colidem entre bairros). Vias públicas de grande porte (ex.: Av. das Américas) nunca podem constar em `ruas_internas`.

---

## Parte 2 — Motor estatístico (núcleo compartilhado)

Todo o conteúdo desta parte está implementado em **um único arquivo sem dependências**, `supabase/functions/_shared/itbiMarketStats.ts`, reexportado por `src/utils/itbiMarketStats.ts`. Ele é consumido pela avaliação, pela função pública `public-itbi-stats` e pelo parecer técnico. O sistema externo deve replicar este arquivo, não reimplementá-lo por área.

### 2.1 Média ponderada

```
media_ponderada = Σ(valor_m2ᵢ × wᵢ) / Σ(wᵢ)      onde wᵢ = MAX(1, total_transacoesᵢ)
```

```sql
SELECT ROUND(
  SUM(valor_m2 * GREATEST(1, COALESCE(total_transacoes,1)))
  / SUM(GREATEST(1, COALESCE(total_transacoes,1)))
) AS media_ponderada
FROM itbi_transactions WHERE ...;
```

**Magnitude do erro se omitida:** Barra da Tijuca, últimos 12 meses — ponderada **R$ 12.066/m²** × simples R$ 10.950/m² (**+10,2%**). Jacarepaguá: 7.234 × 6.842 (**+5,7%**).

### 2.2 Mediana e percentis ponderados

Convenção **posicional** (não interpolada), equivalente a expandir cada linha `w` vezes e indexar o array resultante.

```
n = Σ wᵢ                                    (peso total)
valueAtExpandedIndex(itens_ordenados, k):
    cum = 0
    para cada item em ordem crescente de valor:
        cum += item.w
        se k < cum: retorna item.v
    retorna último valor

weightedQuantile(itens, p):
    k = min(n - 1, max(0, floor(n × p)))
    retorna valueAtExpandedIndex(itens, k)

weightedMedian(itens):
    mid = floor(n / 2)
    se n é ímpar: retorna valueAtExpandedIndex(itens, mid)
    senão:        retorna (valueAtExpandedIndex(itens, mid-1) + valueAtExpandedIndex(itens, mid)) / 2
```

Os itens são sempre `{v: valor_m2, w: peso}` **ordenados de forma crescente por `v`**, com `v` não finito descartado.

Percentis usados no produto: **P1** e **P99,5** (calibração do cinto), **P10** (mínimo da faixa), **P25/P75** (IQR), **P50** (mediana / valor provável), **P95** (máximo da faixa).

Equivalente SQL de conferência (expansão explícita):

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

### 2.3 Cinto de outlier por bairro × tipologia

**O que é:** um piso e um teto absolutos de R$/m², aplicados **na cláusula `WHERE` da consulta**, antes de qualquer estatística. Substituem o antigo teto fixo global de 40.000, que cortava mercado legítimo no Leblon e não cortava nada em Santa Cruz.

**Regra de calibração vigente (2026-09-03, global):**

| Parâmetro | Valor |
|---|---|
| Janela de calibração | **3 anos móveis** |
| Percentil inferior | **P1 ponderado** por `total_transacoes` |
| Percentil superior | **P99,5 ponderado** por `total_transacoes` |
| Margem inferior (`PISO_MARGIN`) | **0,85** |
| Margem superior (`TETO_MARGIN`) | **1,15** |
| Mínimo de escrituras para calibrar | **100** (relaxado para ≥55 na 2ª rodada) |
| Fallback de janela | 5 anos, apenas quando não há **nenhuma** escritura em 3 anos |
| Fallback global (`DEFAULT_OUTLIER_MIN/MAX`) | **1.000 / 60.000** |

```
piso = MAX(1000,  ROUND(P1_ponderado(3 anos)    × 0,85))
teto = MIN(60000, ROUND(P99,5_ponderado(3 anos) × 1,15))
```

> **Divergência de nomenclatura a registrar:** no código o campo da tabela chama-se `p99`, mas **armazena o P99,5**. O sistema externo deve calibrar com **P99,5**, não com P99. Renomear o campo é um débito técnico aberto.

**Calibração por logradouro (`getStreetOutlierLimits`):** quando a própria rua tem `≥ 8` linhas e `≥ 40` escrituras, o piso e o teto são recalculados com **P1 e P99 ponderados da própria rua** (mesmas margens 0,85/1,15). Isso impede que ruas atípicas dentro do bairro — José Higino, Rua Iposeira — percam transações legítimas para o cinto do bairro. Sem amostra suficiente, cai no cinto do bairro.

**Chave da tabela:** `"BAIRRO NORMALIZADO|Tipologia"`, com o bairro em maiúsculas e sem acento, e a tipologia em `Apartamento` \| `Casa`. Sem entrada correspondente, usa o fallback global.

#### Tabela completa de calibração — 78 pares

Chave = `BAIRRO|Tipologia`. 72 pares calibrados em janela de 3 anos, 6 em fallback de 5 anos (sem escrituras nos últimos 3 anos). A coluna **P99,5** corresponde ao campo `p99` no código.

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

### 2.4 Janela móvel

```
WINDOW_MONTHS_OPTIONS = [12, 24, 36, 48, 60]
DEFAULT_WINDOW_MONTHS = 12
MAX_WINDOW_MONTHS     = 60
```

**Regra de consulta:** a busca no banco traz **sempre 60 meses**. O recorte para a janela escolhida é feito em memória. Isso permite que o usuário troque o período sem refazer a consulta e garante que todas as janelas partam exatamente da mesma amostra bruta.

```
buildRollingWindow(N, hoje):
    inicio = UTC(hoje.ano, hoje.mes - N, hoje.dia)
    fim    = hoje
```

**Expansão automática por amostra insuficiente** (`selectRollingWindowRows`):

```
solicitada = normalizeWindowMonths(N)              // valor inválido → 12
para cada m em [12,24,36,48,60] com m >= solicitada:
    subconjunto = linhas com data_transacao entre inicio(m) e hoje
    se |subconjunto| >= MIN_ROWS_SCOPE (8):  usa este m e para
retorna a última janela testada (60) se nenhuma foi suficiente
```

Metadados sempre gravados: `janela_meses` (efetiva), `janela_meses_solicitada`, `janela_expandida` (booleano). Quando `janela_expandida = true`, a UI e o PDF **precisam** informar que o período foi ampliado.

**Janela legada por anos fechados** (`selectWindowRows`, ainda usada em relatórios históricos): 5 anos fechados; o ano corrente só entra quando os anos fechados têm menos de **30 linhas** (`MIN_ROWS_CLOSED_WINDOW`) **ou** menos de **100 escrituras** (`MIN_TX_CLOSED_WINDOW`).

### 2.5 Corte estatístico de outlier

Três métodos, selecionáveis por configuração (`settings.outlier_filter_method`). **O método só decide o que é descartado; a faixa reportada é sempre P10/P95 dos sobreviventes.**

**a) `mad` (padrão) — mediana e MAD em escala logarítmica, assimétrico**

```
positivas = linhas com valor_m2 > 0
se |positivas| < MIN_ROWS_FOR_MAD (8): não corta
logs = {v: ln(valor_m2), w: peso}, ordenado por v
med   = weightedMedian(logs)
desvios = {v: |ln(valor_m2) - med|, w: peso}, ordenado por v
scale = 1,4826 × weightedMedian(desvios)
se scale <= 0: não corta
lower = exp(med - 2,5 × scale)        // MAD_K_INF = 2,5
upper = exp(med + 3,0 × scale)        // MAD_K_SUP = 3,0
```

A assimetria é deliberada: é mais rigoroso embaixo (erro de digitação de valor) do que em cima (imóvel premium legítimo).

**b) `iqr` — cercas de Tukey ponderadas, com banda mínima de segurança**

```
se Σw < MIN_VALUES_FOR_IQR (4): não corta
q1 = P25 ponderado; q3 = P75 ponderado; med = P50 ponderado
iqr_efetivo = MAX(q3 - q1, med × 0,20)      // banda mínima de 20% da mediana
lower = q1 - 1,5 × iqr_efetivo
upper = q3 + 1,5 × iqr_efetivo
```

A banda mínima de 20% evita que ruas homogêneas (IQR próximo de zero) descartem quase toda a amostra.

**c) `percentile` — sem corte.** A faixa P10/P95 já é o próprio recorte.

**Salvaguarda anti-colapso (vale para todos):** se os sobreviventes somarem **menos de 3 escrituras**, o corte é descartado e a amostra inteira é mantida. Nenhum corte pode reduzir a amostra a nada.

### 2.6 Correção temporal (deflação pelo índice de preços)

Fonte: materialized view `itbi_price_index`, com `{trimestre, ln_mediana, escrituras}` — `ln_mediana` é a mediana ponderada de `ln(valor_m2)` no trimestre.

```
utilizáveis = pontos com escrituras >= MIN_ESCRITURAS_INDEX_QUARTER (30) e ln_mediana finito
referência  = trimestre mais recente <= trimestre(hoje) entre os utilizáveis
para cada linha:
    tri = trimestre(data_transacao)                  // primeiro dia do trimestre
    se tri não tem índice utilizável: linha inalterada
    fator = clamp(exp(ln_mediana_ref - ln_mediana_tri), 1/2, 2)   // MAX_DEFLATION_FACTOR = 2
    valor_m2       *= fator
    valor_transacao *= fator
```

Sem trimestre de referência disponível, a deflação não é aplicada e `deflacionado = false` é gravado. Quando aplicada, o rodapé de metodologia exibe "Corrigido pelo índice para <trimestre>".

**Efeito sobre a leitura dos números:** com deflação, o P95 pode ficar **acima do maior valor bruto registrado**, porque escrituras antigas foram trazidas para o preço de hoje. Isso não é erro.

### 2.7 Fallback geográfico

Ordem de proximidade: `logradouro` → `raio100` → `raio300` → `bairro`.

```
MIN_ROWS_SCOPE = 8         // linhas agregadas a partir das quais um escopo é "suficiente"
isScopeSufficient(rows) = rows.length >= 8
```

```
1. Busca por logradouro (com as variantes da Parte 1.4). Se suficiente → usa.
2. Se o fallback por raio está habilitado:
   a. obtém o ponto de referência do logradouro (RPC itbi_ponto_logradouro);
   b. para raio em [100, 300] m: RPC itbi_amostra_raio; para no primeiro suficiente.
3. pickFallbackSample(candidatos): primeiro suficiente; se nenhum, o de MAIOR número
   de linhas (empate favorece o mais próximo); null se todos vazios.
4. Só quando o passo 3 devolve null, usa o bairro inteiro.
```

**Fallback de tipologia (dentro de cada escopo):** tenta primeiro com a tipologia do imóvel; se a amostra tiver menos de `MIN_ROWS_FOR_TIPOLOGIA = 8` linhas, tenta sem filtro de tipologia e grava `tipologia_fallback = true`.

**Penalidade de confiança por origem** (`SOURCE_PENALTY`, pontos subtraídos do score):

| Origem | Penalidade |
|---|---|
| `logradouro` | 0 |
| `raio100` | −5 |
| `raio300` | −10 |
| `bairro` | −15 |

### 2.8 Tendência de preço (regressão log)

Substitui o crescimento "reta entre o primeiro e o último ano", que era refém de um ano atípico nas pontas.

```
pontos = {ano, valor} com valor > 0, ordenados por ano; n = |pontos|
se n < 2: método "insuficiente", taxa 0
x = anos; y = ln(valor)
slope = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)²
taxa_anual = exp(slope) - 1

se n == 2:  banda = ln(1 + 3/100)                        // FALLBACK_BAND_PP = 3 p.p.
senão:      se  = sqrt( SSE / (n-2) / Σ(x-x̄)² )
            banda = MIN(0,25, t95(n-2) × se)             // MAX_BAND_LOG = 0,25
taxa_baixa = exp(slope - banda) - 1
taxa_alta  = exp(slope + banda) - 1
```

`t95` = t de Student bicaudal 95%: `[12,706 · 4,303 · 3,182 · 2,776 · 2,571 · 2,447 · 2,365 · 2,306 · 2,262 · 2,228]` para 1–10 graus de liberdade; **1,96** acima disso.

### 2.9 Metadados de reprodutibilidade

Toda avaliação persiste `valuations.itbi_metadata` com o objeto abaixo. Um sistema externo que grave os mesmos campos permite auditoria linha a linha.

```
engine_version, data_source, raio_m, ponto_referencia,
bairros_incluidos[], janela_inicio, janela_fim, ano_corrente_incluido,
tipologia_filtro, tipologia_fallback, outlier_method, piso_m2, teto_m2,
linhas_agregadas, linhas_descartadas, escrituras_validas, truncado,
deflacionado, trimestre_referencia,
janela_meses, janela_meses_solicitada, janela_expandida, calculado_em
```

---

## Parte 3 — Avaliação (motor de valuation)

### 3.1 Pipeline completo

```
Etapa 0  Identificação: tipo de imóvel, finalidade
Etapa 1  Localização    ← toda a estatística ITBI acontece aqui
Etapa 2  Dados básicos  ← área, seleção da base de referência
Etapa 3  Questionário   ← 5 categorias de características + documentação
Etapa 4  Resultados     ← faixa final, score de confiança
Etapa 5  Recomendação   ← estratégia de precificação
```

**Etapa 1, sequência exata:**

```
1.  tipologia = mapTipoImovelToTipologia(tipoImovel)
       contém "casa" → "Casa"; contém "apartamento"/"cobertura" → "Apartamento"; vazio → null
2.  (piso, teto) = getOutlierLimits(bairro, tipologia)          [Parte 2.3]
3.  janela de consulta = buildRollingWindow(60)                 [sempre 60 meses]
4.  consulta com os filtros da Parte 1.2 + piso/teto + ORDER BY + LIMIT 5000
5.  fallback de escopo e de tipologia                           [Parte 2.7]
6.  selection = selectRollingWindowRows(linhas, janelaEscolhida) [Parte 2.4]
7.  deflation = deflateRows(selection.rows, indicePrecos)        [Parte 2.6]
8.  bounds = computeBounds(linhas, método)                       [Parte 2.5]
9.  sobreviventes = linhas dentro de bounds (com salvaguarda de 3 escrituras)
10. min_m2 = P10 ponderado(sobreviventes)
    med_m2 = mediana ponderada(sobreviventes)
    max_m2 = P95 ponderado(sobreviventes)
    media_m2 = média ponderada(sobreviventes)        [exibição, não referência]
    transaction_count = Σ peso de TODAS as linhas válidas (antes do corte)
    avg_valor_transacao = Σ(valor_transacao × peso) / Σ peso, sobre as linhas válidas
11. todos arredondados para inteiro
```

> Atenção a duas assimetrias intencionais: `transaction_count` é contado **antes** do corte de outliers, enquanto `escrituras_validas` (nos metadados) é contado **depois**. E `avg_valor_transacao` usa as linhas válidas, não os sobreviventes.

### 3.2 Anúncios — sinal, nunca base

Anúncio é **preço pedido**; ITBI é **preço fechado**. Misturá-los na base inflava o valor provável (achado A3 da auditoria). Hoje:

- **A base de referência é 100% ITBI.** `min_m2`, `med_m2` e `max_m2` combinados são exatamente os do ITBI.
- Até **5 anúncios** podem ser lançados manualmente (valor total + área + fonte). O R$/m² de cada um é `valor_total / area_m2`; o conjunto produz mínimo, mediana e máximo simples (não ponderados — cada anúncio é uma observação única).
- Os anúncios alimentam apenas o **Gap de Mercado**:

```
ANUNCIOS_MINIMO_ESTATISTICO = 3

se não há anúncios:              gap = null, alinhamento = SEM_DADOS
se 1 ou 2 anúncios:              gap = null, alinhamento = AMOSTRA_INSUFICIENTE
se >= 3 anúncios:
    gap_original = ((anuncio.med_m2 - itbi.med_m2) / itbi.med_m2) × 100
    gap = clamp(gap_original, -35, +35)             // MARKET_GAP_CAP = 35
```

**Classificação do alinhamento** (sobre `|gap|`): ≤10 `EQUILIBRADO` · ≤20 `MODERADO` · ≤35 `DESALINHADO` · >35 `CRITICO`.
**Direção:** `> +5% → UP` · `< −5% → DOWN` · caso contrário `STABLE`.
**Alerta de recomendação:** `ANUNCIO_GAP_ALERT_PCT = 15`.

### 3.3 Ajuste por características

5 categorias, cada uma com teto e piso próprios, diferenciados por tipo de imóvel:

| Categoria | Casa (min / max) | Apartamento (min / max) |
|---|---|---|
| A — Posição / Vista / Luz | −12% / **+15%** | −12% / +12% |
| B — Conservação | −8% / **+10%** | −8% / +8% |
| C — Conforto | −6% / **+10%** | −6% / +6% |
| D — Segurança | −6% / +6% | −6% / +6% |
| E — Funcionalidade | −4% / **+8%** | −6% / +6% |

```
por categoria: soma dos weight_value das respostas "sim"
               depois clamp(soma, cap_min, cap_max) da categoria
total = Σ categorias limitadas + bonus_terreno       // bonus_terreno só para casas
total = clamp(total, -0,35, +0,35)                   // GLOBAL_CAPS, ambos os tipos
auto_capped = true quando o cap global foi acionado
```

Categorias sem cap customizado usam `category_cap_min` / `category_cap_max` da tabela `valuation_characteristics`.

### 3.4 Valores finais

```
fator = area_m2 × (1 + ajuste_total) × fator_documentacao

pessimista = MIN( min_m2×fator, med_m2×fator, max_m2×fator )
provavel   = med_m2 × fator                              // sempre a mediana, sem reordenar
otimista   = MAX( min_m2×fator, med_m2×fator, max_m2×fator )
```

**Sem compressão de spread e sem clamp.** A versão anterior limitava o spread a 35% por construção, o que tornava a Regra 3 (avaliação formal) matematicamente inalcançável. A faixa hoje é a que os dados sustentam.

```
spread_% = ((otimista - pessimista) / provavel) × 100
```

**Limiares de spread**, calibrados sobre 1.106 ruas com amostra (mediana 22,4%, P75 30,9%, P90 40,5%):

```
SPREAD_NORMAL_PCT     = 30      // até o P75 das ruas
SPREAD_WIDE_PCT       = 40      // até o P90
SPREAD_VERY_WIDE_PCT  = 55
```

### 3.5 Score de confiança (0–100)

Mede **a qualidade dos dados de entrada**, não se o valor provável está "certo". Começa em 100 e aplica, nesta ordem:

| # | Critério | Efeito |
|---|---|---|
| 1 | \|ajuste\| > 40% | −15 |
|  | \|ajuste\| > 35% | −8 |
|  | \|ajuste\| > 25% | −4 |
| 2 | spread > 55% | −18 |
|  | spread > 40% | −10 |
|  | spread > 30% | −4 |
| 3 | fator_documentação < 0,85 | −20 |
|  | fator_documentação < 0,95 | −8 |
| 4 | liquidez ≥ 70 | **+10** |
|  | liquidez ≥ 50 | **+5** |
|  | liquidez < 30 | −5 |
| 5 | gap de mercado = null (sem anúncios) | −10 |
|  | \|gap\| ≤ 15% | **+3** |
|  | \|gap\| ≤ 25% | 0 |
|  | \|gap\| ≤ 35% | −3 |
|  | \|gap\| > 35% | −5 |
| 6 | origem da amostra | −0 / −5 / −10 / −15 (Parte 2.7) |
|  | fallback de tipologia | −5 |

```
score = clamp(score, 0, 100)

// Teto por tamanho da amostra (escrituras válidas, APÓS o corte) — aplicado por último:
escrituras <=  2  →  score = min(score, 40)
escrituras <=  9  →  score = min(score, 55)
escrituras <= 29  →  score = min(score, 75)
```

Uma rua com uma única escritura nunca pode ser classificada como "Alta Confiança".

**Faixas de rótulo no PDF:** ≥80 excelente (verde, ALTA) · ≥60 bom (amarelo, MÉDIA-ALTA) · ≥40 moderado (laranja, MÉDIA) · <40 fraco (vermelho, BAIXA).

**Parecer indicativo:** abaixo de `MIN_ESCRITURAS_PARECER = 3` escrituras, o parecer é emitido mas marcado como indicativo.

### 3.6 P95 × P99 — por que o topo do ITBI é o que é

Ambos são percentis **ponderados por escrituras**:

- **P95** — 95% das escrituras da amostra fecharam nesse valor ou abaixo; corta os 5% mais caros.
- **P99** — corta apenas o 1% mais caro; em amostras pequenas fica praticamente colado no máximo bruto e passa a ser um único negócio, não uma faixa.

O produto usa **P95** como "Preço Máximo" (`RANGE_HIGH_P = 0.95`) porque é o topo que a amostra sustenta estatisticamente. O que ele mede é o **valor de escritura**, não o preço de anúncio. Em imóveis premium o preço pedido é sistematicamente superior — por subdeclaração e porque o ITBI não distingue unidade reformada, andar alto ou vista. Esse prêmio não pode ser inventado a partir do dado oficial: ele entra pela via dos anúncios (Parte 3.2) ou por base personalizada, sempre com a fonte registrada no laudo.

### 3.7 Base personalizada

Quando o avaliador sobrescreve manualmente o preço base, o novo valor substitui `med_m2` e **os limites são propagados proporcionalmente** (`min_m2` e `max_m2` mantêm a mesma razão em relação à mediana original), preservando o spread. A avaliação é marcada como base personalizada e sai da base oficial.

---

## Parte 4 — Pesquisa de Mercado

### 4.1 Duas camadas — e a divergência entre elas

| | Camada de busca (app) | Motor oficial (`public-itbi-stats`) |
|---|---|---|
| Arquivos | `useTransactionSearch.ts`, `useStreetComparison.ts`, `EmbeddedAdvancedSearch.tsx` | `_shared/itbiMarketStats.ts` |
| Cinto de outlier | **apenas teto** (`.lte('valor_m2', getOutlierLimit(bairro))`) | piso **e** teto por bairro × tipologia |
| Corte estatístico | **nenhum** | MAD em log (padrão) |
| Faixa reportada | média e mediana ponderadas | P10 / mediana / P95 ponderados |
| Deflação | não | sim |
| "Dados insuficientes" | array vazio → "Nenhum dado disponível" | mensagem explícita |

O sistema externo deve saber **qual das duas** está reproduzindo. Divergências de poucos por cento entre "Pesquisa" e "Avaliação" no mesmo endereço vêm daqui, e são conhecidas.

### 4.2 Filtros da busca

```sql
uso = 'Residencial'  (ou 'Comercial' conforme a tipologia escolhida)
valor_m2 IS NOT NULL
valor_m2 <= :teto_do_bairro
percentual_transferido >= 90
data_transacao >= :inicio_janela
-- opcionais: bairro, tipologia, logradouro ILIKE, valorMin/Max,
--            areaMin/Max, valorM2Min/Max
-- apenasIndividuais: total_transacoes = 1
LIMIT 5000     (useStreetComparison usa 2000 por rua)
```

### 4.3 Opções de período

**12 (padrão), 24, 36, 48 e 60 meses.** As opções de 3 e 6 meses foram removidas por produzirem amostra estatisticamente frágil. Valor inválido é normalizado para 12 (`normalizeWindowMonths`).

> Exceção conhecida: `Microbairros.tsx` chama `useStreetComparison` com **72 meses** para o comparativo de ruas — fora do conjunto padrão.

### 4.4 Indicadores exibidos

| Indicador | Fórmula |
|---|---|
| Registros ITBI | `COUNT(*)` das linhas filtradas |
| Escrituras Reais | `SUM(total_transacoes)` |
| `preco_medio_m2` (ranking) | `Σ(valor_m2 × w) / Σ w`, arredondado |
| `media_m2` (comparativo de ruas) | `Σ(valor_m2 × w) / Σ w` |
| `mediana_m2` (comparativo de ruas) | mediana ponderada posicional (acumula peso até `Σw / 2`) |
| `variacao_periodo` | `((media_atual − media_anterior) / media_anterior) × 100`, comparando a janela atual com a janela imediatamente anterior de **mesmo tamanho** (de `2×N` meses atrás até `N` meses atrás) |
| Volume financeiro | `Σ(valor_transacao × w)` |

### 4.5 Regras de "Dados insuficientes"

A função pública retorna `{ success: true, stats: null, message: "Dados insuficientes para esta localização" }` em três situações: nenhuma linha após os filtros; janela selecionada vazia; `calculateITBIData` devolveu `null`. Ranking de microbairro exige **mínimo de 3 transações** para exibir uma entrada. Nunca exibir número quando a amostra não o sustenta.

### 4.6 Exportação

Formato padrão: **XLSX com identidade visual** (Navy `#0C2340` / Gold `#D4AF37`); CSV e PDF também disponíveis. Colunas mínimas: microbairro/logradouro, **registros**, **escrituras reais**, `preco_medio_m2`. O cabeçalho da exportação repete os filtros aplicados e as **datas efetivas** da janela — não apenas o rótulo "12 meses".

---

## Parte 5 — Painel Analítico e Microrregiões

### 5.1 KPIs do Dashboard (`useKPIStats.ts` — ponderado, correto)

| Card | Janela | Fórmula |
|---|---|---|
| **Preço Médio (YTD)** | do início do ano corrente até hoje | `Σ(valor_m2 × w) / Σ w`, com breakdown Apartamento / Casa |
| **Liquidez (12m)** | 12 meses móveis | `Σ total_transacoes`, com breakdown por tipologia |
| **Variação Anual (YoY)** | 12 meses móveis vs. os 12 meses imediatamente anteriores (**janela simétrica**) | `((atual − anterior) / anterior) × 100` |
| **Região Mais Valorizada (Ano)** | ano corrente | agrupamento por microbairro (Barra) ou por logradouro (demais bairros), média ponderada, **mínimo 3 transações** |

**Fallback de amostra do YTD:** se o ano corrente tiver menos de **30 registros** (`MIN_REGISTROS_ANO_ATUAL`) **ou** menos de **100 escrituras** (`MIN_TRANSACOES_REAIS`), o card cai para a janela móvel de 12 meses. A UI deve declarar qual janela foi usada.

### 5.2 Microrregiões (`useMicrobairroDetalhado` — ponderado, correto)

Janela fixa de **12 meses**. Agregação por microbairro com `Σ(valor_m2 × w) / Σ w`. O valor de referência do bairro é a **média ponderada de toda a amostra**, nunca `(apartamento + casa) / 2`. Rótulo obrigatório: "últimos 12 meses (valores ponderados por escrituras)".

**Microbairros da Barra da Tijuca:** 8 regiões, classificadas por `CASE` sobre o logradouro (`classificarMicrobairroBarra`).

### 5.3 Divergências abertas no Analytics (declarar ao desenvolvedor)

Estes pontos existem hoje no Analytics e **não** devem ser replicados; ambos os sistemas devem convergir para a forma ponderada:

| Local | Problema |
|---|---|
| `useITBITransactions.ts` — `useMicrobairroRanking` (linhas 126–174) | Média e mediana **simples**: empilha `valor_m2` uma vez por linha e faz `Σ/n`. `total_transacoes` é usado só no contador de liquidez. Cada agregado mensal entra com peso igual, independente de representar 1 ou 12 escrituras. |
| `useITBITransactions.ts` — `useKPIStats` (linhas 300–447) | Segunda implementação, **código morto** (sem imports), também não ponderada. Fonte de confusão. |
| `useKPIStats.ts` (113, 145, 170, 192) e `useITBITransactions.ts` (99, 214, 331, 344) | `.limit(10000)` em vez de `.limit(5000)`. |
| `Microbairros.tsx:59` | `useStreetComparison(..., 72, ...)` — janela de 72 meses fora do padrão 12–60. |
| `Dashboard.tsx:92-104` | Exportação consulta sem `.limit()` explícito. |
| `_shared/outlierLimits.ts` | Campo `p99` armazena **P99,5**. |

---

## Parte 6 — Casos de conferência (baseline de aceite)

Todos apurados em **03/09/2026** sobre a base descrita na Parte 0.4. Filtros comuns a todas as consultas: `uso = 'Residencial' AND percentual_transferido >= 90 AND valor_m2 IS NOT NULL`. Percentis calculados por expansão de peso (`generate_series`). Tolerância de aceite: **±1%** em médias e medianas, **exato** em contagens.

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

**Maior R$/m² já registrado nesta rua em 7 anos: R$ 9.362.** Nenhuma escritura acima de 9.400, em nenhum ano e em nenhuma janela. Uma faixa P10 8.450 / mediana 9.086 / P95 9.800 é exatamente o que a amostra sustenta — o P95 fica ligeiramente acima do maior bruto por efeito da deflação (Parte 2.6). Qualquer sistema que apresente R$ 14.000/m² para esta rua **não está usando valor de escritura**.

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

Piso 5.189 / teto 26.609 (tabela da Parte 2.3).

| Escopo | Registros | Escrituras | Média pond. |
|---|---:|---:|---:|
| Sem cinto | 321 | 1.937 | 11.177 |
| Com cinto | 321 | 1.937 | 11.177 |

Resultado idêntico — o cinto **não corta mercado legítimo** num bairro bem calibrado. É uma rede de segurança contra erro de digitação, não um filtro de mercado. Se o sistema externo obtiver números diferentes entre as duas linhas, seu cinto está mal calibrado.

---

## Parte 7 — Checklist de aceite

Marcar item a item. O alinhamento só é declarado quando **todos** estão verdes.

**Amostra**
- [ ] Relatório exibe **Registros** e **Escrituras Reais** como números separados e rotulados.
- [ ] Filtros `uso = 'Residencial'`, `percentual_transferido >= 90`, `valor_m2 IS NOT NULL` aplicados em toda consulta.
- [ ] `LIMIT 5000` explícito, com `ORDER BY` determinístico.
- [ ] Bairro normalizado (maiúsculas, sem acento, espaços colapsados) antes de comparar.
- [ ] Busca por logradouro expande tipo de via, títulos/patentes e variantes de grafia (Parte 1.4).
- [ ] Caso 2a reproduz 27 registros / 69 escrituras buscando por "Desenhista Luiz Guimarães".
- [ ] Caso 3 reproduz 5 registros / 12 escrituras buscando por "Avenida General Olyntho Pilar".

**Estatística**
- [ ] Toda média de preço é ponderada por `total_transacoes`.
- [ ] Mediana e percentis são ponderados, com a convenção posicional da Parte 2.2.
- [ ] Cinto de outlier por bairro × tipologia carregado com os 78 pares da Parte 2.3, usando **P99,5** (não P99) no teto.
- [ ] Calibração por logradouro ativa quando a rua tem ≥8 linhas e ≥40 escrituras.
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
- [ ] Caps por categoria e cap global de ±35% conforme a Parte 3.3.
- [ ] Score de confiança com as 6 penalidades e o teto por tamanho de amostra (40/55/75).
- [ ] Metadados da Parte 2.9 persistidos em toda avaliação.

**Fallback**
- [ ] Ordem rua → 100 m → 300 m → bairro, com `MIN_ROWS_SCOPE = 8`.
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

## Anexo A — Constantes do motor (referência rápida)

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

## Anexo B — Arquivos de referência

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

## Anexo C — Documentos complementares (histórico)

- `docs/auditoria-motor-avaliacao.md` — auditoria completa do motor, 17 achados numerados (A1–A17) e plano de correção em 3 fases.
- `docs/roteiro-alinhamento-metodologia-itbi.md` — histórico do alinhamento entre os dois sistemas, incluindo o caso da Avenida do Pepê.
- `docs/calibracao-consultas.sql` — consultas de calibração (7.1 a 7.8). A consulta **7.4** regenera a tabela de 78 pares quando a base muda.
