# Auditoria do Motor de Avaliação — Godoy Prime Analytics

Data: 2026-09-02 · Base auditada: `main` no commit `7815639` · Público-alvo: desenvolvedor responsável pela correção.

Este documento é o resultado de uma leitura completa do código que calcula valores na ferramenta de avaliação, cruzada com as regras do `CONTEXT.md` e com o comportamento dos demais módulos que consomem a mesma base ITBI. Cada achado traz arquivo e linha para localização direta.

Limitação declarada: **não tive acesso de leitura ao banco de produção** (a chave publicável é bloqueada por RLS, o que é correto). Onde a magnitude de um problema depende dos dados, deixo a consulta SQL que o desenvolvedor deve rodar e o critério de decisão. Nada abaixo é afirmação sobre a distribuição real dos dados; é afirmação sobre o que o código faz com eles.

---

## Status de aplicação (atualizado em 2026-09-02)

| Fase | Itens | Estado | Onde |
|---|---|---|---|
| 1 | 1–5 | **Aplicada** | PR #2, merge `f148c02` |
| 2 | 6–13 | **Aplicada** | PR #3, merge `bf813c5` |
| 3 | 14, 15 (como opção), 16, 18 | **Aplicada** | PR #4 |
| 3 | 17 (seeds e RPC nas migrations) | **Pendente: exige acesso ao banco** | ver seção 8 |

O que ainda depende de decisão ou de dados, mesmo com as três fases aplicadas:

- **Migrations a aplicar no Lovable Cloud**: `20260902140000_valuations_itbi_metadata.sql` (coluna de rastreabilidade) e `20260902150000_itbi_price_index.sql` (índice de preços materializado + função de refresh). Até lá o motor funciona sem metadados persistidos e sem correção temporal, e registra isso.
- **Edge functions a reimplantar**: `public-itbi-stats`, `parecer-nucleo`, `sync-itbi-daily` (todas passam a importar de `supabase/functions/_shared/`).
- **Calibrações com a base** (seção 7): `k` do método MAD, limiares de spread (`SPREAD_*` em `valuationCalculations.ts`), limiar de gap de anúncios (`ANUNCIO_GAP_ALERT_PCT`) e piso/teto por bairro × tipologia. Os valores atuais são pontos de partida documentados, não resultados.
- **Método de corte padrão passou a ser MAD em log** (k = 2,5 / 3,0) após a calibração da seção 10. Organizações que já salvaram `outlier_filter_method` mantêm a escolha; selecionar MAD em Configurações.
- **Caps do questionário** seguem no código (`CATEGORY_CAPS`/`GLOBAL_CAPS`); mover para o banco exige versionar o seed (item 17).
- **Migrations aplicadas e edge functions reimplantadas** em 2026-09-02 (via Lovable): `itbi_price_index` com 26 trimestres, `valuations.itbi_metadata` presente, `public-itbi-stats` respondendo com `engine_version: 3` e `deflacionado: true`.

---

## 1. Veredito

O motor **não é seguro para decisão de preço no estado atual**, por três motivos independentes:

1. **O número principal (R$/m² mediano) é calculado sobre uma amostra errada.** Sem janela temporal, sem tipologia, com teto fixo de R$ 40.000/m² para todos os bairros e com truncamento não determinístico em 500 linhas. Quatro defeitos, cada um de uma linha, todos em `src/components/valuation/Step1Location.tsx`.
2. **A faixa pessimista/otimista, o score de confiança e a recomendação são em grande parte artefatos de constantes, não leitura do mercado.** O spread é matematicamente limitado a 35%, o que torna a "Regra 3" (exigir laudo NBR 14653) inalcançável. O score de confiança não usa o tamanho da amostra: uma rua com **uma** escritura recebe "Boa Confiança".
3. **Não há rastro metodológico.** A avaliação salva não registra método de outlier, janela, fonte (rua ou bairro), nem quantas linhas entraram. O mesmo endereço pode dar números diferentes no site público, na ferramenta interna, no painel e no parecer da IA, e nenhum dos quatro diz por quê.

O que está certo e deve ser preservado: ponderar por `total_transacoes`; exigir `percentual_transferido >= 90`; separar engines Casa e Apartamento; não usar `html2canvas`; a Regra 7 que bloqueia "Pronto para vender" com gap alto; e o princípio editorial da seção 8 do `CONTEXT.md`. O motor foi escrito antes das convenções que o resto do sistema adotou e nunca foi trazido ao padrão.

---

## 2. Como o motor calcula hoje (pipeline)

| Etapa | Onde | O que faz |
|---|---|---|
| 1. Busca de mercado | `Step1Location.tsx:92-150` `fetchMarketRows` | `itbi_transactions` com `uso=Residencial`, `percentual_transferido>=90`, `valor_m2<=40000`, `limit(500)`. Primeiro por logradouro (cross-bairro, `ilike %termo%`), fallback para o bairro inteiro. |
| 2. Estatística base | `Step1Location.tsx:298-365` `calculateITBIData` | Expande cada linha `total_transacoes` vezes; aplica IQR (Tukey 1,5× com banda mínima de 20% da mediana) ou P10/P90 conforme `company_settings.outlier_filter_method`; devolve `min_m2`, `med_m2` (mediana), `max_m2`, `transaction_count`. |
| 3. Combinação com anúncios | `valuationCalculations.ts:79-158` | 70% ITBI + 30% anúncios (mín. 3 anúncios). Gap de mercado limitado a ±35%. |
| 4. Seleção de base | `valuationCalculations.ts:567-598` | Corretor escolhe mín/mediana/máx/custom; mín e máx são reescalados proporcionalmente. |
| 5. Ajuste por características | `valuationCalculations.ts:191-265` | Soma de pesos por categoria A–E com caps por categoria (hardcoded) e cap global ±35%. Bônus de terreno para casas. |
| 6. Valores finais | `valuationCalculations.ts:274-313` | Comprime o spread em 50%, depois limita pessimista a −20% e otimista a +15% do provável. Multiplica por fator de documentação. |
| 7. Confiança e recomendação | `valuationCalculations.ts:323-564` | Score 0–100 a partir de ajuste, spread, documentação, liquidez e gap. Sete regras de recomendação em cascata. |
| 8. Liquidez e projeção | `useHistoricalTransactionAnalysis.ts` | 5 anos fechados, média anual (não mediana) com IQR por ano, crescimento linear entre primeiro e último ano, projeção composta a 1/2/3 anos com ±3 p.p. |

A linha de `itbi_transactions` **não é uma escritura**. É o agregado mensal da Prefeitura por logradouro × mês × uso × tipologia (`sync-itbi-prefeitura/index.ts:296-380`, `onConflict` na linha 402): `valor_transacao` é a média do grupo, `area_m2` é a média do grupo, `valor_m2` é a razão das duas médias, `total_transacoes` é o número de escrituras do grupo, `percentual_transferido` é a média do grupo. Tudo que vem depois precisa respeitar isso.

---

## 3. Verificação das cinco afirmações recebidas no chat

| # | Afirmação | Veredito | Evidência | Observação |
|---|---|---|---|---|
| 1 | Teto fixo de R$ 40.000/m² no motor trunca o segmento premium | **Confirmada** | `Step1Location.tsx:104` `.lte("valor_m2", 40000)`. `OUTLIER_LIMITS` nos demais hooks: Leblon 80.000, Ipanema 70.000, Lagoa/Gávea/J. Botânico 50.000. O importador aceita até 300.000 (`sync-itbi-prefeitura:352`). | Não há piso no motor: aceita R$ 500/m². O hook histórico tem `OUTLIER_MIN_LIMITS` (linha 85); o motor não. |
| 2 | O motor é o único lugar sem filtro de data | **Confirmada** | `fetchMarketRows` não filtra `data_transacao`. `useKPIStats`, `useEvolutionData`, `useHistoricalTransactionAnalysis`, `public-itbi-stats:106`, `parecer-nucleo:238` filtram. | O `CONTEXT.md` §5.1 define janela de 5 anos como regra dura. |
| 3 | `limit(500)` sem `order()` torna a avaliação não reprodutível | **Confirmada** | `Step1Location.tsx:105`. Sem `ORDER BY` o Postgres não garante quais 500 linhas retornam. | Para rua raramente passa de 500 linhas; para o fallback de bairro (Barra) passa com folga. É exatamente no caso de amostra grande que o resultado fica arbitrário. |
| 4 | Não filtra tipologia, mas ajusta por tipologia | **Confirmada** | `fetchMarketRows` filtra só `uso`. A coluna `tipologia` existe e é chave de agregação. `useKPIStats:222-236` separa apartamento e casa. `parecer-nucleo:250` filtra. | O ajuste fino Casa/Apartamento (caps distintos, bônus de terreno) está sendo aplicado sobre uma base que mistura os dois. |
| 5 | Expandir por peso destrói a variância e a banda de 20% é curativo | **Parcialmente confirmada** | Expansão em `Step1Location.tsx:309-318`; banda em `:272-273`. | A direção está certa: o IQR é calculado sobre médias de grupos, cuja dispersão é menor que a das escrituras. A fórmula "1/√k" está simplificada demais (as médias de grupos diferentes também variam entre si) e a magnitude só pode ser medida com os dados. O que importa: para quantis, expandir por peso e usar quantil ponderado dão o mesmo resultado; o erro não é a expansão, é aplicar cercas de Tukey a agregados como se fossem escrituras, e depois remendar com uma constante. |

Correção de ênfase sobre a afirmação 5: o chat sugeriu que a subdeclaração no ITBI é um viés direcional para baixo. No Rio, o ITBI incide sobre o **maior** entre o valor declarado e a avaliação da Prefeitura, então o valor que chega em `média_valor_transação` não é simplesmente "o que o comprador quis declarar". Há viés, mas a direção deve ser calibrada com os dados, não assumida. Mantenho a recomendação de cercas assimétricas, mas com os parâmetros vindos da base.

---

## 4. Achados adicionais (não cobertos pelo chat)

Severidade: **Alta** muda o número mostrado ao cliente ou a recomendação; **Média** compromete rastreabilidade ou consistência entre telas; **Baixa** higiene.

### A1. O spread é limitado a 35% por construção, e isso mata a Regra 3 — Alta
`calculateFinalValues` (`valuationCalculations.ts:294-306`) força `pessimista >= 0,80 × provável` e `otimista <= 1,15 × provável`. Logo `spread = (otimista − pessimista)/provável <= 35%` sempre. Consequências verificáveis:
- `generateRecommendation` Regra 3 (`:470`, `spread > 40 && score < 55`) é **código morto**. A recomendação "Requerer Avaliação Técnica Formal (NBR 14653-2)" nunca é emitida.
- Em `calculateConfidenceScore` (`:347-353`), as penalidades `spread > 40` e `spread > 35` nunca disparam. Só `> 30 → −4` dispara, e dispara quase sempre.
- Para a maioria das ruas a faixa exibida é exatamente −20%/+15%, independentemente da dispersão real. A "faixa" é uma constante disfarçada de estatística.

### A2. O score de confiança ignora o tamanho da amostra — Alta
`calculateConfidenceScore` (`:323-404`) recebe ajuste, spread, documentação, gap e liquidez. **Não recebe `transaction_count`.** Simulação com o código atual para uma rua com uma única linha agregada de uma escritura, sem anúncios: liquidez 30 (`useHistoricalTransactionAnalysis:373`) → −5; gap nulo → −10; spread 35 → −4; **score 81 = "Boa Confiança"**. Isso viola frontalmente o `CONTEXT.md` §8 ("exibir Dados insuficientes em vez de número enganoso"). O tooltip do motor (`ValuationEngine.tsx:406`) diz "Mínimo: 3 transações"; o código aceita 1 (`CONTEXT.md` §5.4 também diz 1). Escolha um e faça o código obedecer.

### A3. Blend 70/30 com anúncios infla o "provável" e contradiz a própria recomendação — Alta
Anúncio é preço pedido; ITBI é preço fechado. `calculateCombinedPrices` (`:118-120`) mistura 30% de preço pedido no valor provável. Com gap de 20%, o provável sobe 6%. Em seguida a Regra 4 (`:487-502`) diz ao corretor "use o valor ITBI (provável) como referência", mas o provável já contém 30% dos anúncios que a mesma regra chama de inflados. Ou os anúncios entram como **sinal** (gap, alinhamento, recomendação) e não como **base**, ou o texto da recomendação precisa mudar. Recomendo a primeira opção.

### A4. Quatro definições diferentes de "valor de referência" para o mesmo endereço — Alta
| Onde | Janela | Estatística central | Corte de outlier | Tipologia | Limite de linhas |
|---|---|---|---|---|---|
| Motor interno (`Step1Location`) | nenhuma | mediana ponderada | IQR expandido + banda 20%, teto 40k | não | 500 sem order |
| Site público (`public-itbi-stats`) | 12 meses | **média** ponderada (campo chamado `med_m2`, linha 178) | P10/P90, sem teto por bairro | sim, se informada | **nenhum `.limit`** → truncamento silencioso em 1000 (anti-padrão do `CONTEXT.md` §11) |
| Painel KPI (`useKPIStats`) | ano corrente / 12m | média ponderada | teto por bairro | separa apto/casa | 10.000 |
| Parecer IA (`parecer-nucleo`) | `periodo_meses` | média e mediana ponderadas | IQR **sem** ponderação, sem banda | sim | 5.000 |

Um lead que faz a avaliação gratuita no site e depois é atendido pelo corretor com a ferramenta interna vê dois números diferentes para o mesmo imóvel, com metodologias diferentes, e ninguém consegue explicar a diferença.

### A5. `min_m2`/`max_m2` mudam de significado conforme o toggle — Média
No modo IQR, `min_m2` e `max_m2` são o menor e o maior **sobrevivente** (`Step1Location.tsx:337-338`), ou seja, dois pontos extremos. No modo percentil são P10/P90. Trocar o toggle em Configurações não muda só a agressividade do corte; muda o que "Preço Mínimo" e "Preço Máximo" significam na tela do corretor (`Step2BasicData`). Padronize em percentis ponderados (P10/P90 ou P25/P75) e nomeie na UI.

### A6. Fonte dos dados (rua ou bairro) não é persistida nem exibida — Média
`fetchMarketRows` devolve `source: "logradouro" | "bairro"`, mas o valor só vai para `console.log` (`:170-179`). `ITBIData` não tem o campo, `valuations` não tem a coluna. O PDF diz "transações na mesma região" tanto para a rua quanto para o bairro inteiro. O corretor não sabe se o número é da Rua X ou de toda a Barra da Tijuca.

### A7. Rastreabilidade metodológica ausente na avaliação salva — Média
Payload em `Step5Recommendation.tsx:161-224`. Não persiste: método de outlier, janela temporal, fonte (rua/bairro), número de linhas agregadas, versão do motor, data do snapshot ITBI. `outlier_filter_method` é lido de `company_settings` **no momento do cálculo**; trocar a configuração muda o resultado de uma reavaliação sem registro. Para um produto que cita NBR 14653-2, isto é o flanco mais exposto.

### A8. Caps do banco são ignorados pelo código — Média
`calculateTotalAdjustment` (`:216-236`) usa `CATEGORY_CAPS` hardcoded para A–E; `category_cap_max/min` da tabela `valuation_characteristics` só seriam usados para categorias fora de A–E (não existem). Um admin que edita caps no banco não altera nada. Além disso, `GLOBAL_CAPS.apartamento = ±35%` (`:181`) mas o badge da UI mostra "Cap ±30%" para apartamento (`Step4Results.tsx:24`) e o comentário do código diz ±30%. Três valores para a mesma regra.

### A9. Liquidez usada no cálculo vem de um escopo diferente do exibido — Média
`ValuationEngine.tsx:127` chama `useHistoricalTransactionAnalysis` com escopo padrão `'rua'`; `Step4Results.tsx:30` exibe o gráfico com escopo `'raio500'` (que na verdade é raio de **100 m**, ver `useHistoricalTransactionAnalysis.ts:124`). O `liquidityScore` que entra no score de confiança é o da rua; o que o corretor vê no gráfico é o do raio. Podem discordar. O nome `raio500` para 100 m é uma armadilha para manutenção.

### A10. Crescimento de preço é uma reta entre dois pontos — Média
`priceGrowth` (`useHistoricalTransactionAnalysis.ts:408-413`) usa só o primeiro e o último ano com dados, dividido pelo número de anos: crescimento linear médio, sensível a um único ano atípico nas pontas. A projeção (`:567-620`) então compõe essa taxa por 3 anos com ±3 p.p. fixos. Um ano ruim em 2021 ou 2025 muda a projeção inteira. Use regressão de `ln(preço)` sobre os anos disponíveis (mínimo 3 anos com n adequado) e intervalo derivado do erro padrão, não ±3 fixo. Também: a média anual usa **média** (`:325`), o motor usa **mediana**; a série histórica e a base não são comparáveis.

### A11. Dez cópias da tabela de limites, três variantes — Média
`OUTLIER_LIMITS` existe em 9 arquivos de `src/`. Sete têm 13 bairros, dois (`useITBITransactions`, `EmbeddedAdvancedSearch`) têm 23, e `useTransactionMapData.ts` tem valores **totalmente diferentes** (Barra 50.000, Leblon 100.000, sem `DEFAULT`, fallback 50.000). A mesma transação é outlier no painel e não é no mapa. `OUTLIER_MIN_LIMITS` só existe no hook histórico. Vire uma tabela `outlier_limits(bairro, tipologia, piso, teto, atualizado_em)` no banco, lida por uma função única.

### A12. Três implementações de IQR — Média
`Step1Location` (ponderado por expansão, banda 20%, sem janela), `useHistoricalTransactionAnalysis` (ponderado por expansão, sem banda, por ano, com piso/teto), `parecer-nucleo` (sem ponderação, sem banda, com janela e tipologia). Uma função em SQL ou uma edge function única, com teste de regressão.

### A13. `transaction_count` conta linhas antes do corte — Baixa
`Step1Location.tsx:313` soma `total_transacoes` de todas as linhas, inclusive as que o IQR descarta. O "n" exibido e salvo inclui transações que não entraram na mediana.

### A14. Busca por rua com `ilike %termo%` sem guarda de vizinhança — Baixa/Média
`buildStreetSearchTerms` gera termos como o nome sem prefixo e busca em **todos** os bairros (`createBaseQuery(false)`). Termos curtos ou genéricos podem casar ruas homônimas em bairros de nível de preço muito diferente. O hook histórico registra `crossBairro`/`bairrosEncontrados`; o motor não registra nada. Use `buildLogradouroOrConditions` de `src/lib/logradouroSearch.ts` (já existe, já trata patentes e abreviações) e registre os bairros que entraram.

### A15. Filtro `percentual_transferido` aplicado sobre média do grupo — Baixa
O importador descarta o grupo inteiro quando a **média** do percentual transferido é < 90 (`sync-itbi-prefeitura:332`). Um mês com nove escrituras integrais e uma de 10% tem média 91 e passa; um com oito integrais e duas de 50% tem média 90 e passa no limite; um com sete integrais e três de 50% tem 85 e joga fora sete escrituras boas. Como a Prefeitura só entrega a média, o dado individual não é recuperável; mas o corte poderia ser mais suave (por exemplo 80) com peso reduzido em vez de descarte, e o valor deve ser guardado mesmo abaixo do corte para permitir recalibração.

### A16. Regra 4 dispara para quase toda avaliação com anúncios — Baixa/Média
`trend > 5 && score >= 70` (`:487`). Preço pedido acima do fechado em mais de 5% é o normal do mercado, não um alerta. Com 3+ anúncios, quase toda avaliação recebe "Anúncios Acima do Mercado / aguardar 30 dias" antes de chegar em "Pronto para Comercializar". Calibre o limiar com o gap típico da base (provavelmente 10–20%) e mostre o gap como informação, não como bloqueio.

### A17. Objetos do banco fora das migrations — Média (crítico para o desenvolvedor externo)
Não estão em `supabase/migrations/`: a RPC `itbi_transacoes_raio` (usada pelo escopo de raio), `get_user_activity_summary`, e o **seed das 26 características base e dos fatores de documentação** (`valuation_characteristics`, `valuation_documentation_factors`). Só os 20 itens extras de casa/apartamento estão versionados. Quem trabalha em outra base não consegue reproduzir os pesos do motor sem exportar do banco (ver seção 8).

---

## 5. Resposta à pergunta original: qual percentual define outlier?

Não existe um percentual correto para a arquitetura atual, porque o corte está sendo aplicado sobre a amostra errada (sem janela, sem tipologia, com teto fixo). Depois de corrigir os itens 1–4 da seção 3, a pergunta passa a ter resposta, e ela não é um percentual fixo. É um procedimento:

**Método recomendado (por bairro × tipologia, janela de 5 anos deflacionada):**
1. Trabalhar em `x = ln(valor_m2_corrigido)`. Preço/m² é assimétrico à direita; em log fica aproximadamente simétrico e as cercas passam a ser multiplicativas (o que faz sentido para preço).
2. Centro = mediana ponderada de `x` por `total_transacoes`. Escala = MAD ponderado (mediana dos desvios absolutos) × 1,4826.
3. Cercas assimétricas: `inferior = mediana − k_inf × escala`, `superior = mediana + k_sup × escala`. Ponto de partida `k_inf = 2,5` e `k_sup = 3,0`. A assimetria é hipótese a ser testada, não dogma (ver correção na seção 3).
4. Piso e teto absolutos por bairro × tipologia como cinto de segurança, vindos de P1 e P99 da própria base (5 anos), gravados em tabela, recalculados na sincronização mensal.
5. Mínimo de linhas agregadas para aplicar corte: 8. Abaixo disso, não cortar e marcar `amostra_pequena = true`.
6. Reportar a faixa como P10/P90 ponderados dos sobreviventes, **sem** compressão e **sem** clamp (isso substitui A1).

**Como calibrar k com a base:** rodar a consulta da seção 7.3 para vários `k`, medir a fração de `total_transacoes` descartada por bairro × tipologia. Alvo: 2% a 5% no total, sem nenhum bairro acima de 10%. Se um bairro corta muito mais, o problema é a amostra daquele bairro (mistura de tipologias ou período), não o `k`.

**Por que não Tukey 1,5× IQR:** com agregados mensais e n pequeno, os quartis são instáveis e o IQR colapsa (foi isso que motivou a banda de 20%). MAD é mais estável em amostras pequenas e o log elimina a necessidade de banda mínima.

**Sobre "média da região":** o motor usa mediana; o painel e o site público usam média ponderada. A média de preço/m² é puxada pela cauda direita. Para valor de referência, mediana. Para exibir "preço médio do bairro" no painel, tudo bem usar média, mas rotule corretamente. Hoje `Step2BasicData` chama a mediana de "Preço Médio" e `public-itbi-stats` chama a média de `med_m2`.

---

## 6. Plano de correção

### Fase 1 — Hoje (muda o número; um commit isolado para medir o delta)
1. `Step1Location.tsx:104`: trocar `40000` por `getOutlierLimit(bairro)` e adicionar piso `getOutlierMinLimit(bairro)` (mover ambas as tabelas para um módulo único `src/lib/outlierLimits.ts` como passo intermediário; a tabela no banco vem na fase 2).
2. `Step1Location.tsx`: adicionar `.gte("data_transacao", hoje − 5 anos)` e `.lte(..., 31/12 do ano anterior)` conforme `CONTEXT.md` §5.1, com expansão explícita para o ano corrente quando n < 30 linhas ou < 100 escrituras (mesma regra do KPI).
3. `Step1Location.tsx:105`: `.order("data_transacao", { ascending: false }).limit(5000)`.
4. `Step1Location.tsx`: filtrar `tipologia` compatível com `state.tipoImovel` (Casa → `Casa`; Apartamento/Cobertura → `Apartamento`), com fallback documentado para `uso=Residencial` quando n < 8 linhas, e o fallback registrado em `ITBIData.fallback`.
5. Persistir em `ITBIData` e em `valuations`: `data_source`, `bairros_incluidos`, `janela_inicio`, `janela_fim`, `tipologia_filtro`, `linhas_agregadas`, `linhas_descartadas`, `outlier_method`, `engine_version`. Coluna nova `engine_version` começa em `2`.

**Critério de aceite:** a mesma avaliação, executada duas vezes, produz o mesmo resultado. Teste unitário para `calculateITBIData` com amostra fixa. Antes de publicar, rodar o motor novo contra 30 avaliações já salvas e registrar o delta por bairro; esperar alta em Leblon/Ipanema e variação relevante em ruas com mistura casa/apartamento. Decidir o que fazer com pareceres já emitidos **antes** do deploy.

### Fase 2 — Esta semana (consistência e honestidade)
6. Substituir `calculateFinalValues`: faixa = P10/P90 ponderados dos sobreviventes × área × ajuste × doc. Sem `SPREAD_COMPRESSION`, sem clamps. Se a faixa ficar larga, a resposta certa é dizer que ficou larga (Regra 3 volta a funcionar).
7. `calculateConfidenceScore`: incluir `n` (escrituras e linhas agregadas), fonte (rua/bairro) e janela. Sugestão: n < 3 escrituras → bloquear parecer com "Dados insuficientes"; 3–9 → teto de score 55; 10–29 → teto 75; fallback para bairro → −15.
8. Anúncios saem da base e viram sinal: `provável` = 100% ITBI; gap e alinhamento continuam alimentando recomendação e confiança. Ajustar textos da Regra 4 e o limiar (calibrar com a base).
9. Unificar `OUTLIER_LIMITS`/`OUTLIER_MIN_LIMITS` em tabela `outlier_limits` e uma função `getOutlierLimits(bairro, tipologia)`; remover as 10 cópias. Corrigir `useTransactionMapData`.
10. Uma única implementação de estatística ITBI (SQL function `get_market_stats(logradouro, bairro, tipologia, janela)` ou edge function), usada pelo motor, pelo site público, pelo parecer e pelo painel. Elimina A4 e A12.
11. Alinhar `GLOBAL_CAPS`, badge da UI e caps do banco: uma fonte (o banco), e o código lê de lá.
12. Corrigir o escopo da liquidez (A9): o mesmo escopo que o corretor vê é o que entra no score. Renomear `raio500`.
13. `public-itbi-stats`: `.limit(5000)`, mesmo corte de outlier, devolver mediana como `med_m2` e média em campo separado.

### Fase 3 — Estrutural
14. Índice de preços próprio: mediana trimestral de `ln(valor_m2)` da cidade (ou por zona) e correção de cada linha para a data de referência antes de qualquer estatística. Sem dependência externa.
15. Filtro de outlier conforme seção 5 (MAD em log, assimétrico, com piso/teto de P1/P99 por bairro × tipologia).
16. Projeção (A10): regressão em log com intervalo derivado do erro padrão.
17. Versionar no repositório o seed de `valuation_characteristics`, `valuation_documentation_factors` e a RPC `itbi_transacoes_raio` (A17).
18. Testes de regressão do motor com amostras fixas em `src/utils/__tests__/` rodando no CI já existente (`bun test` ou Vitest).

---

## 7. Consultas para calibração (rodar no banco antes de escolher parâmetros)

### 7.1 Magnitude do agregado (decide a prioridade do item 5 da seção 3)
```sql
select
  avg(total_transacoes)                                             as media_por_linha,
  percentile_cont(0.5) within group (order by total_transacoes)     as mediana_por_linha,
  percentile_cont(0.9) within group (order by total_transacoes)     as p90_por_linha,
  count(*)                                                          as linhas,
  sum(total_transacoes)                                             as escrituras
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90;
```
Leitura: mediana perto de 1 → o efeito da expansão é pequeno; mediana ≥ 3 → as cercas atuais estão apertadas demais e o item ganha prioridade.

### 7.2 Quanto o teto de 40.000 corta por bairro (mede o item 1)
```sql
select bairro,
  sum(total_transacoes) filter (where valor_m2 > 40000) as escrituras_cortadas,
  sum(total_transacoes)                                  as escrituras_total,
  round(100.0 * sum(total_transacoes) filter (where valor_m2 > 40000) / nullif(sum(total_transacoes),0), 1) as pct_cortado
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90
  and data_transacao >= current_date - interval '5 years'
group by bairro order by pct_cortado desc nulls last;
```

### 7.3 Calibração de k para MAD em log (seção 5)
```sql
with base as (
  select bairro, tipologia, total_transacoes as w, ln(valor_m2) as x
  from itbi_transactions
  where uso = 'Residencial' and percentual_transferido >= 90 and valor_m2 > 0
    and data_transacao >= current_date - interval '5 years'
),
centro as (
  select bairro, tipologia,
    percentile_cont(0.5) within group (order by x) as med
  from base group by bairro, tipologia
),
mad as (
  select b.bairro, b.tipologia,
    1.4826 * percentile_cont(0.5) within group (order by abs(b.x - c.med)) as escala,
    max(c.med) as med
  from base b join centro c using (bairro, tipologia)
  group by b.bairro, b.tipologia
)
select b.bairro, b.tipologia,
  sum(w) as escrituras,
  round(100.0 * sum(w) filter (where x < med - 2.5*escala) / sum(w), 2) as pct_corte_baixo,
  round(100.0 * sum(w) filter (where x > med + 3.0*escala) / sum(w), 2) as pct_corte_alto,
  round(exp(med)::numeric, 0) as mediana_m2,
  round(exp(med - 2.5*escala)::numeric, 0) as cerca_inferior_m2,
  round(exp(med + 3.0*escala)::numeric, 0) as cerca_superior_m2
from base b join mad using (bairro, tipologia)
group by b.bairro, b.tipologia, med, escala
having sum(w) >= 50
order by escrituras desc;
```
Observação: os percentis acima não são ponderados por `w` (o `percentile_cont` do Postgres não aceita peso). Para a calibração inicial é aceitável; a implementação final deve usar quantil ponderado (expandir por `generate_series(1, w)` ou implementar em função).

### 7.4 Piso e teto por bairro × tipologia (substitui as tabelas hardcoded)
```sql
select bairro, tipologia,
  round(percentile_cont(0.01) within group (order by valor_m2)::numeric, 0) as piso_p1,
  round(percentile_cont(0.99) within group (order by valor_m2)::numeric, 0) as teto_p99,
  sum(total_transacoes) as escrituras
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90 and valor_m2 > 0
  and data_transacao >= current_date - interval '5 years'
group by bairro, tipologia having sum(total_transacoes) >= 100
order by bairro, tipologia;
```

### 7.5 Reprodutibilidade (mede o item 3 antes da correção)
```sql
select bairro, count(*) as linhas
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90 and valor_m2 <= 40000
group by bairro having count(*) > 500 order by linhas desc;
```
Todo bairro listado aqui produz avaliações não determinísticas no fallback atual.

---

## 8. O que o desenvolvedor externo precisa exportar do banco

Sem isso, o motor não é reproduzível em outra base:

```sql
-- pesos e caps do questionário (26 base + 20 casa/apto)
select * from valuation_characteristics order by display_order;
-- fatores de documentação
select * from valuation_documentation_factors order by display_order;
-- configuração do método de outlier por organização
select organization_id, setting_key, setting_value from company_settings where setting_key = 'outlier_filter_method';
-- definição das RPCs ausentes das migrations
select pg_get_functiondef('public.itbi_transacoes_raio'::regproc);
select pg_get_functiondef('public.get_user_activity_summary'::regproc);
```
Gravar os resultados como migration de seed no repositório.

---

## 9. Riscos operacionais

- **O repositório está público.** O `.env` saiu do versionamento no commit `dde349d`, mas o histórico ainda contém a URL e a chave publicável (públicas por desenho; a RLS está bloqueando leitura anônima, confirmado). Ainda assim, todo o código do motor, os prompts das edge functions e o `CONTEXT.md` estão expostos. Tornar privado em Settings → General → Danger Zone.
- **Pareceres já emitidos vão mudar de valor** após a Fase 1, provavelmente para cima no Leblon e Ipanema e em ambas as direções onde há mistura casa/apartamento. Decida a política (reemitir, marcar como "versão 1", ou congelar) antes do deploy, e use `engine_version` para distinguir.
- **Lovable e a outra base.** Cada correção feita fora do Lovable precisa voltar para este repositório, senão o próximo push do Lovable sobrescreve. Combine um único fluxo (por exemplo, PRs para `main` com o CI verde) antes de começar a Fase 1.

---

## 10. Resultados da calibração (base de produção, 2026-09-02)

Consultas 7.1 a 7.5 executadas pelo Lovable sobre a base real. Números arredondados como recebidos.

### 10.1 Magnitude do agregado (7.1)

| média por linha | mediana por linha | P90 por linha | linhas | escrituras |
|---|---|---|---|---|
| 4,19 | 3 | 8 | 30.011 | 125.867 |

Leitura: a linha típica representa 3 escrituras e uma em dez representa 8 ou mais. Cercas de Tukey calculadas sobre esses agregados são apertadas demais (a dispersão entre médias de grupo é menor que a dispersão entre escrituras). Decisão: **MAD em escala log vira o método padrão**.

### 10.2 Impacto retroativo do teto fixo de 40.000 (7.2)

| bairro | escrituras acima de 40.000 | total (5 anos) | % |
|---|---|---|---|
| Leblon | 32 | 2.213 | 1,4 |
| Ipanema | 20 | 3.062 | 0,7 |
| Barra da Tijuca | 27 | 10.175 | 0,3 |

Todos os demais bairros: zero. Leitura: o defeito era real, mas a magnitude é pequena. A afirmação recebida no chat de que este era "o bug mais caro do repositório" está corrigida por este dado: os itens que mais movem o valor são a janela temporal, a tipologia e a compressão da faixa, não o teto.

### 10.3 Calibração de k para o MAD (7.3, k = 2,5 / 3,0)

| bairro | tipologia | escrituras | corte baixo % | corte alto % | mediana R$/m² | cerca inf. | cerca sup. |
|---|---|---|---|---|---|---|---|
| Copacabana | Apartamento | 9.914 | 3,34 | 4,93 | 10.208 | 7.607 | 14.528 |
| Barra da Tijuca | Apartamento | 9.881 | 0,21 | 3,59 | 9.164 | 5.689 | 16.237 |
| Recreio | Apartamento | 7.526 | 0,90 | 1,86 | 5.971 | 4.365 | 8.696 |
| Jacarepaguá | Apartamento | 6.872 | 0,65 | 0 | 6.231 | 4.002 | 10.600 |
| Tijuca | Apartamento | 6.039 | 1,41 | 0 | 5.669 | 3.399 | 10.473 |
| Botafogo | Apartamento | 4.178 | 0,10 | 2,97 | 10.702 | 6.447 | 19.660 |
| Ipanema | Apartamento | 3.057 | 1,54 | 2,49 | 16.748 | 9.151 | 34.587 |
| Freguesia | Apartamento | 2.650 | 1,21 | 0 | 4.812 | 3.430 | 7.226 |
| Camorim | Apartamento | 2.612 | 0 | 0 | 6.428 | 3.565 | 13.042 |
| Leblon | Apartamento | 2.213 | 0 | 1,04 | 19.577 | 10.135 | 43.138 |

Nenhum par bairro × tipologia com mais de 10% de corte; máximo 8,3% (Copacabana). Dentro do alvo da seção 5. Decisão: **k = 2,5 (inferior) e 3,0 (superior) confirmados**. Observação: Copacabana corta mais nas duas pontas porque mistura orla e miolo na mesma tipologia; um refinamento futuro é calibrar por microbairro.

### 10.4 Piso e teto por bairro × tipologia (7.4, 78 pares) — APLICADO

Tabela completa em `docs/calibracao/bloco74-piso-teto-2026-09-02.csv`. Os limites hardcoded foram substituídos por `piso = P1 × 0,85` e `teto = P99 × 1,15` para cada par bairro × tipologia com 100 ou mais escrituras (`supabase/functions/_shared/outlierLimits.ts`, gerado a partir do CSV). Regras de fallback: tipologia sem calibração no bairro usa a faixa mais larga do bairro; bairro sem calibração usa 1.000 e 60.000 e marca `calibrado = false`.

| bairro | tipologia | P1 | P99 | piso aplicado | teto aplicado | teto antigo |
|---|---|---|---|---|---|---|
| Barra da Tijuca | Apartamento | 6.086 | 17.688 | 5.173 | 20.341 | 40.000 |
| Barra da Tijuca | Casa | 4.728 | 10.897 | 4.019 | 12.532 | 40.000 |
| Leblon | Apartamento | 12.793 | 45.590 | 10.874 | 52.429 | 80.000 |
| Ipanema | Apartamento | 8.258 | 41.333 | 7.019 | 47.533 | 70.000 |
| Copacabana | Apartamento | 5.573 | 17.183 | 4.737 | 19.760 | 40.000 |
| Tijuca | Apartamento | 2.979 | 9.499 | 2.532 | 10.924 | 30.000 |

Leitura: casas e apartamentos passam a ter limites próprios (na Barra, o teto de casa é 40% menor que o de apartamento). Bairros da Zona Norte e Oeste, que antes caíam no padrão de 60.000, ganham limites reais (Campo Grande apartamento 4.757 × 1,15 = 5.471).

### 10.5 Reprodutibilidade (7.5)

Catorze bairros tinham mais de 500 linhas elegíveis (Barra 2.814, Recreio 2.679, Copacabana 2.424, Tijuca 1.954, entre outros). Toda avaliação com fallback para bairro nesses casos era não determinística antes da Fase 1. Com ordenação explícita e limite de 5.000, nenhum bairro trunca: o maior tem 2.814 linhas.

### 10.6 Spread real por rua (7.5) — APLICADO

| ruas com amostra | spread P25 | spread mediano | spread P75 | spread P90 |
|---|---|---|---|---|
| 1.106 | 15,9% | 22,4% | 30,9% | 40,5% |

Spread = (P90 − P10) / mediana do R$/m² por rua, 5 anos. Decisão: `SPREAD_NORMAL_PCT = 30` (sem penalidade até o P75 das ruas), `SPREAD_WIDE_PCT = 40` (P90; acima disso a Regra 3 pode pedir avaliação formal quando a confiança é baixa), `SPREAD_VERY_WIDE_PCT = 55`. No PDF, "Precisão Alta" até 22%, "Boa" até 30%, "Moderada" até 40%. Antes: 35 / 50 / 65, valores chutados.

### 10.7 Índice de preços (7.7) — CONFERIDO

26 trimestres, de 2020-T1 a 2026-T2, todos com mais de 2.300 escrituras. Mediana da cidade sobe de R$ 5.521/m² (2020-T1) para R$ 7.357/m² (2026-T2), cerca de 33% em seis anos, com queda em 2022-T3 e aceleração a partir de 2024-T4. A correção temporal está ativa (`deflacionado: true`, referência 2026-T2). Uma linha de 2021 entra na amostra de hoje multiplicada por aproximadamente 1,29.

### 10.8 Seeds e RPCs (7.8) — PARCIAL

- `itbi_transacoes_raio`: definição exportada e versionada em `supabase/migrations/20260902160000_itbi_transacoes_raio.sql`.
- `get_user_activity_summary`: **não existe no banco**. O hook `useUserActivityStats` a chama e cai no fallback pela view `view_user_activity_summary`, usando a chave publicável sem o token do usuário. A tela funciona só se a view for legível sem sessão. Remover a chamada à RPC inexistente e usar o cliente autenticado na view é uma correção pequena, pendente.
- Tabelas `valuation_characteristics` (49 linhas) e `valuation_documentation_factors` (7 linhas): CSVs não recebidos; seed continua pendente.

### 10.9 Pendentes desta rodada

- Consulta 7.6 (gap de anúncios nas avaliações salvas): não executada. `ANUNCIO_GAP_ALERT_PCT` segue em 15.
- CSVs de `valuation_characteristics` e `valuation_documentation_factors` para a migration de seed.
- Correção de `useUserActivityStats` (item 10.8).
- Aviso do linter do Supabase "Materialized View in API" para `itbi_price_index`: aceito. A view expõe apenas medianas trimestrais da cidade inteira, sem dado individual, e precisa ser legível pelo app autenticado.
