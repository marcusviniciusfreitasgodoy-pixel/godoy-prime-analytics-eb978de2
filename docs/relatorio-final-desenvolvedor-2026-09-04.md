# Relatório Final ao Desenvolvedor — Metodologia ITBI do Godoy Prime Analytics

**Versão 1.0, consolidada (2026-09-04).** Este é o documento que fecha o trabalho de 2026-09-02 e 2026-09-03. Ele congela, no commit indicado abaixo, todos os valores, métricas e estatísticas que o Godoy Prime Analytics usa, diz o que mudou nesses dois dias e por quê, e lista o que o desenvolvedor da Prime Circle precisa reproduzir para os dois sistemas serem comparáveis. A referência completa, seção por seção, continua sendo `docs/especificacao-metodologia-godoy-prime.md` (v3.0); este relatório é a carta de entrega, não a substitui.

**Código descrito:** `main` após o PR #24 (commit `da95452`, 2026-09-03), `ENGINE_VERSION` 4. **Base descrita:** carga completa de 2026-09-03, 17h40 (38.197 linhas, 163.015 escrituras, 01/2020 a 07/2026). **Para:** desenvolvedor da Prime Circle. **De:** auditoria de metodologia, com dados apurados via Lovable Cloud.

Como ler: as seções 1 a 6 são normativas, são os números que valem. A 7 diz o que mudou e por quê. A 8 é o que se pede ao desenvolvedor. A 9 lista o que continua aberto, separado entre o que é bug e o que é decisão de negócio.

---

## 1. A base e a regra número um

Cada linha de `itbi_transactions` é um **agregado mensal** da Prefeitura do Rio por logradouro × mês × uso × tipologia. `total_transacoes` é o número de escrituras do grupo e é o **peso** de toda estatística. `valor_transacao` e `area_m2` são médias do grupo; `valor_m2 = valor_transacao / area_m2`.

| Grandeza | Definição | Na base de 2026-09-03, 17h40 |
|---|---|---:|
| Registros (agregações mensais) | `COUNT(*)` | 38.197 |
| Escrituras | `SUM(total_transacoes)` | 163.015 |
| Escrituras publicadas pela API no mesmo período | fonte, todos os bairros | 181.163 |
| Cobertura | escrituras da base / escrituras da API | 90,0 % |
| O que falta, por motivo | percentual transferido < 90 · fora das faixas · chaves repetidas somadas | 4.428 · 434 · 291 agregados |
| Linhas com geocodificação | `geom IS NOT NULL` | 37.402 (97,9 %) |
| Último mês na base e na Prefeitura | | 07/2026 |

Regra número um: **contar linhas subestima o mercado em cerca de 4×**. Todo relatório mostra os dois números com rótulos distintos ("Registros ITBI" e "Escrituras Reais"), e toda média, mediana ou percentil de preço é ponderada por escrituras. Um sistema que faz `AVG(valor_m2)` sobre linhas produz erros entre −1 % e +10 % por bairro, sem sinal previsível (caso 4 da especificação).

## 2. Filtros e regras de aceitação (valem para a carga e para toda consulta)

**Na carga** (`supabase/functions/_shared/itbiIngestion.ts`, usado pelas duas funções de sincronização):

| Regra | Valor | Observação |
|---|---|---|
| Área média do agregado | 20 a 5.000 m² | abaixo de 20 m² barra vagas de garagem e boxes escriturados como residencial |
| Valor médio do agregado | **R$ 30 mil** a R$ 200 milhões | era R$ 100 mil até 2026-09-03; o piso antigo apagava até metade do mercado dos bairros baratos |
| R$/m² | 500 a 300.000 | barra erro de digitação |
| Percentual transferido | ≥ 90 | transferências parciais não entram (ver pendência 19) |
| Chave natural repetida no mesmo lote | soma escrituras; valor, área e percentual ponderados | a API repete a chave quando tipologias diferentes viram a mesma classe |
| Tipologia | Apartamento (apartamento, apto, flat, **cobertura**) · Casa (casa, sobrado, residência) · Terreno · Comercial | cobertura conta como Apartamento na amostra |
| Data | dia 15 do mês (`ano-mês-15`) | toda janela "hoje − N meses" precisa desta convenção |
| Bairro | grafia da Prefeitura, com acento (`BARRA OLÍMPICA`, `JACAREPAGUÁ`) | lista oficial dos 157 bairros em `_shared/bairrosRio.ts`; comparar por nome normalizado |

**Em toda consulta de preço:** `uso = 'Residencial'`, `percentual_transferido >= 90`, `valor_m2 IS NOT NULL`, `LIMIT 5000` explícito com `ORDER BY` determinístico (o PostgREST corta em 1.000 linhas sem avisar), ou paginação até esgotar.

## 3. Estatísticas: definições e ordem de aplicação

Peso da linha: `w = max(1, total_transacoes)`. Média ponderada: `Σ v·w / Σ w`. Mediana e percentis são **posicionais sobre a distribuição expandida** (cada linha repetida `w` vezes; índice `floor(N·p)`, 0-based; mediana de N par = média dos dois centrais). `percentile_cont` do Postgres interpola e difere por poucos R$/m² em amostras pequenas; para bater dígito a dígito, replicar a convenção posicional.

Ordem obrigatória no motor de avaliação (`calculateITBIData`, `_shared/itbiMarketStats.ts`):

1. **Amostra**: rua (variantes de grafia, sem filtro de bairro) → raio 100 m → raio 300 m → bairro inteiro (só se rua e raios não tiverem nenhuma linha). Degraus de raio só com a configuração `radius_fallback_enabled` ligada. Um escopo é suficiente com **8 linhas agregadas**. Tipologia relaxada quando o escopo com tipologia tem menos de 8 linhas.
2. **Cinto de segurança** no `WHERE`: `valor_m2` entre piso e teto do par bairro × tipologia (seção 5).
3. **Janela móvel**: consulta sempre 60 meses; recorte em memória na janela pedida (padrão **12 meses**; opções 24/36/48/60), expandindo para a próxima opção até ter 8 linhas.
4. **Correção temporal** pelo índice trimestral próprio (`itbi_price_index`: mediana ponderada de `ln(valor_m2)` por trimestre, trimestres com < 30 escrituras ignorados, fator limitado a [0,5; 2]).
5. **Corte de outliers** (padrão MAD em log): exige 8 linhas; cercas `exp(med − 2,5·s)` e `exp(med + 3,0·s)`, `s = 1,4826·MAD`. **Salvaguardas:** se sobrarem menos de 3 escrituras, ou se o corte removeria mais de **15 %** das escrituras, o corte é ignorado e os metadados registram `outlier_cut_skipped` (`amostra_minima` ou `bimodal`).
6. **Faixa**: `min_m2 = P10`, `med_m2 = mediana`, `max_m2 = P95`, todos ponderados sobre os sobreviventes. `media_m2` é exibida, nunca usada como referência. `transaction_count` = escrituras antes do corte; `escrituras_validas` = depois.

Metadados persistidos em cada avaliação (`itbi_metadata`): `engine_version`, `data_source`, `raio_m`, `bairros_incluidos`, `janela_inicio/fim`, `janela_meses`, `janela_expandida`, `tipologia_filtro`, `tipologia_fallback`, `outlier_method`, `outlier_cut_skipped`, `piso_m2`, `teto_m2`, `linhas_agregadas`, `linhas_descartadas`, `escrituras_validas`, `truncado`, `deflacionado`, `trimestre_referencia`, `calculado_em`. Sem eles não há auditoria linha a linha.

## 4. Do R$/m² ao Parecer: valores fixados

```
fator      = area_m2 × (1 + ajuste) × fator_documentacao
pessimista = round(P10 × fator);  provável = round(mediana × fator);  otimista = round(P95 × fator)
spread %   = (otimista − pessimista) / provável × 100          # sem compressão, sem clamp
```

| Item | Valor fixado |
|---|---|
| Ajuste por características | soma dos pesos das respostas "sim", por categoria A–E, com cap por categoria (casa: A [−0,12; +0,15], B [−0,08; +0,10], C [−0,06; +0,10], D [−0,06; +0,06], E [−0,04; +0,08]; apartamento: A [−0,12; +0,12], B [−0,08; +0,08], C a E [−0,06; +0,06]) e cap global **±35 %** |
| Bônus de terreno (casas) | terreno/construção ≥ 3,0: +6 %; ≥ 2,5: +4 %; ≥ 2,0: +2 %; ≥ 1,5: 0; ≥ 1,2: −2 %; < 1,2: −4 % |
| Documentação | multiplicador `factor` da tabela (1,00 · 0,99 · 0,85 · 0,75); "incompleta" bloqueia o parecer |
| Anúncios | nunca entram na base; gap = (mediana dos anúncios − mediana ITBI) / mediana ITBI, com mínimo de **3** anúncios e limite **±35 %**; alerta em 15 % |
| Spread | ≤ 35 % normal; > 35 −4; > 50 −10; > 65 −18 pontos de confiança (calibrado para P95 pela consulta 7.5: mediana entre ruas 27 %, P75 37 %, P90 50 %) |
| Rótulo de spread no PDF | ≤ 27 % precisão alta; ≤ 37 % boa; ≤ 50 % moderada; acima, baixa |
| Confiança (começa em 100) | ajuste > 40 % −15, > 35 % −8, > 25 % −4; documentação < 0,85 −20, < 0,95 −8; liquidez ≥ 70 +10, ≥ 50 +5, < 30 −5; gap nulo −10, ≤ 15 +3, ≤ 25 0, ≤ 35 −3, > 35 −5; origem rua 0 / raio 100 m −5 / raio 300 m −10 / bairro −15; tipologia relaxada −5; clamp [0; 100] |
| Teto de confiança por amostra | ≤ 2 escrituras: 40; ≤ 9: 55; ≤ 29: 75 |
| Nível | ≥ 85 verde; ≥ 70 amarelo alto; ≥ 55 amarelo médio; < 55 vermelho |
| Parecer mínimo | menos de 3 escrituras válidas = "Amostra Insuficiente" (valor indicativo) |
| Recomendação (ordem) | documentação incompleta → Bloqueada; < 3 escrituras → Amostra Insuficiente; fator doc < 0,80 → Especialista Jurídico; spread > 50 e confiança < 55 → Avaliação Técnica Formal; gap > 15 e confiança ≥ 70 → Anúncios Acima do Mercado; fator doc entre 0,90 e 1,00 → Regularizar; gap < −5 → Mercado em Cautela; alinhamento desalinhado/crítico → Revisar Precificação; senão Pronto para Comercializar |

Análise histórica de 5 anos fechados (Etapa 4 e PDF): por ano, escrituras = Σ tt; valores dentro do cinto do bairro, expandidos por peso, corte de Tukey simples quando há 4 ou mais; mediana e média anuais; tendência por regressão log das medianas (n ≥ 3, banda `min(0,25; t95·se)`; n = 2, banda fixa ln 1,03); projeção 1 a 3 anos = (1 + taxa)^k; liquidez = `min(100, escrituras/ano × 3)` ±10 pela tendência de volume; níveis ≥ 70 alta, ≥ 40 média.

## 5. Cinto de segurança de R$/m² (piso e teto por bairro × tipologia)

Aplicado no `WHERE` antes de qualquer estatística. Não é filtro de mercado; é rede contra erro de digitação. **A tabela é gerada por script, nunca editada à mão**: consulta 7.4 unificada de `docs/calibracao-consultas.sql` (todos os pares, janelas de 3 e 5 anos, percentis ponderados, P99,5) → `bun run cinto docs/calibracao/<csv>` → `OUTLIER_LIMITS_TABLE` em `_shared/outlierLimits.ts`.

| Regra | Condição | Piso | Teto |
|---|---|---|---|
| Padrão | ≥ 100 escrituras em 3 anos | `P1 × 0,85` | `P99,5 × 1,15` |
| Amostra pequena | senão, ≥ 30 escrituras em 5 anos | `min(P1 × 0,85; mediana / 2)` | `max(P99,5 × 1,15; mediana × 2)` |
| Fora da tabela | menos de 30 em 5 anos | menor piso do bairro (ou 1.000) | maior teto do bairro (ou 60.000) |

Estado em `da95452`: **144 pares** (66 padrão, 78 amostra pequena), 132 pares fora por amostra. Tabela completa no Apêndice B da especificação; conferência rápida:

| Par | Piso | Teto | Escrituras (3 anos) |
|---|---:|---:|---:|
| Barra da Tijuca \| Apartamento | 5.243 | 23.368 | 6.408 |
| Copacabana \| Apartamento | 5.194 | 25.809 | 6.822 |
| Ipanema \| Apartamento | 7.812 | 50.611 | 2.246 |
| Leblon \| Apartamento | 11.207 | 59.408 | 1.523 |
| Tijuca \| Apartamento | 2.709 | 11.555 | 3.967 |
| Jacarepaguá \| Apartamento | 4.048 | 10.770 | 3.814 |
| Recreio dos Bandeirantes \| Apartamento | 3.907 | 13.556 | 4.076 |
| Santa Cruz \| Apartamento | 1.386 | 3.724 | 309 |
| Campo Grande \| Casa | 1.000 | 3.744 | 366 |
| Barra Olímpica \| Apartamento | 4.837 | 11.003 | 581 |

Limites globais: 1.000 e 60.000. O site público ainda calibra piso e teto pela própria rua quando ela tem 8 linhas e 40 escrituras (pendência 2); o motor interno não faz isso e o site vai deixar de fazer.

## 6. Constantes do motor (referência congelada)

| Constante | Valor | Onde |
|---|---|---|
| `ENGINE_VERSION` | 4 | itbiMarketStats.ts |
| `MAX_ROWS` | 5.000 | itbiMarketStats.ts |
| `WINDOW_MONTHS_OPTIONS` / padrão / máximo | 12, 24, 36, 48, 60 / 12 / 60 | itbiMarketStats.ts |
| `MIN_ROWS_SCOPE`, `MIN_ROWS_FOR_TIPOLOGIA`, `MIN_ROWS_FOR_MAD` | 8 linhas | itbiMarketStats.ts |
| `MIN_VALUES_FOR_IQR` | 4 escrituras | itbiMarketStats.ts |
| `MAD_K_INF` / `MAD_K_SUP` | 2,5 / 3,0 | itbiMarketStats.ts |
| `MAX_OUTLIER_CUT_SHARE` | 0,15 | itbiMarketStats.ts |
| `RANGE_LOW_P` / `RANGE_HIGH_P` | 0,10 / 0,95 | itbiMarketStats.ts |
| `RADIUS_STEPS_M` | 100, 300 | itbiMarketStats.ts |
| `SOURCE_PENALTY` | rua 0 / raio 100 m 5 / raio 300 m 10 / bairro 15 | itbiMarketStats.ts |
| `MIN_ESCRITURAS_INDEX_QUARTER` / `MAX_DEFLATION_FACTOR` | 30 / 2 | itbiMarketStats.ts |
| `DEFAULT_OUTLIER_MIN` / `MAX` | 1.000 / 60.000 | outlierLimits.ts |
| `PISO_MARGIN` / `TETO_MARGIN` | 0,85 / 1,15 | outlierLimits.ts |
| `SMALL_SAMPLE_ESCRITURAS` / `SMALL_SAMPLE_WIDTH` / `MIN_ESCRITURAS_CINTO` | 100 / 2 / 30 | outlierLimits.ts, outlierLimitsGen.ts |
| `LIMITES_INGESTAO` | área 20–5.000; valor 30 mil–200 mi; R$/m² 500–300 mil; percentual ≥ 90 | itbiIngestion.ts |
| `SPREAD_NORMAL/WIDE/VERY_WIDE_PCT` | 35 / 50 / 65 | valuationCalculations.ts |
| `ANUNCIOS_MINIMO_ESTATISTICO` / `MARKET_GAP_CAP` / `ANUNCIO_GAP_ALERT_PCT` | 3 / 35 / 15 | valuationCalculations.ts |
| `GLOBAL_CAPS` / `SAMPLE_SCORE_CAPS` / `MIN_ESCRITURAS_PARECER` | ±0,35 / 40-55-75 / 3 | valuationCalculations.ts |
| `TIPOLOGIA_FALLBACK_PENALTY` | 5 | valuationCalculations.ts |
| Rótulos de spread no PDF | 27 / 37 / 50 | valuationPdfExport.ts |

## 7. O que mudou em 2026-09-02 e 03, e por quê

Em ordem de descoberta. Nenhum destes itens apareceu por leitura de código; todos apareceram confrontando um número da base com um número da fonte.

| # | Defeito | Efeito no número | Correção (PR) |
|---|---|---|---|
| 1 | Exports do painel, Sofia e ranking sem `.limit()` ou com média simples | totais cortados em 1.000 linhas; médias erradas em até 10 % | paginação e ponderação (#13) |
| 2 | Cinto com pares calibrados por consulta que filtrava bairro sem acento | Glória com 129 escrituras em vez de 412; tetos defasados cortando 5 a 17 % das escrituras | regeneração sem filtro por nome (#17, #18) |
| 3 | Recarga completa apagava o período e reinseria | geocodificação perdida na base inteira em 2026-09-03, 15h | upsert que preserva colunas e varre obsoletos; trilha em `etl_log` (#17) |
| 4 | Limiares de spread calibrados para P90 com a faixa em P95 | avaliações caindo em "spread largo" sem motivo | 35/50/65 e rótulos 27/37/50 (#17) |
| 5 | Piso de ingestão de R$ 100 mil | metade do mercado da Zona Oeste fora da base (Santa Cruz: 85 escrituras mantidas contra 186 descartadas) | piso a R$ 30 mil em módulo compartilhado (#20) |
| 6 | Carga diária sem peso nem percentual | mês corrente entrando com uma escritura por linha | mesmas regras da carga completa (#20) |
| 7 | Chave natural repetida derrubava lotes inteiros do upsert | cerca de 5.000 linhas perdidas por carga, sempre nos últimos bairros da ordem da API | mescla de duplicatas antes do upsert (#21) |
| 8 | Cinto editado à mão em quatro rodadas | tabela irreproduzível | gerador `bun run cinto` e consulta 7.4 unificada (#22, #23) |
| 9 | MAD apagando o segundo mercado de bairros bimodais | Santo Cristo −21,6 %, São Conrado −19,3 %, Glória −17,2 % da amostra com qualquer k | salvaguarda de 15 %, motor v4 (#24) |
| 10 | Site público comparando bairro por igualdade sem acento | "barra olimpica" devolvia "dados insuficientes" | resolução pela lista oficial de bairros (#24) |

Decisões de calibração tomadas com dado, não por argumento: teto do cinto em P99,5 (não P99) com janela de 3 anos; k do MAD mantido em 2,5 / 3,0 (2,0 / 2,5 dobra o corte médio e leva Copacabana a 12,7 %); fallback por raio validado pela consulta 7.10 (raio 300 m com spread 15 pontos abaixo do bairro), recomendação de ligar os dois degraus; janela padrão de 12 meses mantida até haver avaliações salvas para medir.

## 8. O que o desenvolvedor da Prime Circle precisa fazer

**Adotar, para os números baterem:**

1. Linha = agregado mensal; escrituras = `SUM(total_transacoes)`; nunca chamar contagem de linhas de "vendas".
2. Filtros da seção 2 em toda consulta; bairro pela grafia oficial normalizada; logradouro com expansão de grafia (`AVENIDA/AV/AVN`, `GENERAL/GAL`, `OLYNTHO/OLINTO`, `PILLAR/PILAR`, `DESENHISTA/DESEN`, `LUIZ/LUIS` etc., seção 2.9 da especificação), não `ILIKE` do texto digitado.
3. Limite explícito de 5.000 com ordenação determinística, ou paginação.
4. Toda estatística de preço ponderada por escrituras, com a convenção posicional da seção 3.
5. Cinto da seção 5 no `WHERE`, com a tabela de 144 pares, antes de qualquer estatística.
6. Ordem do pipeline da seção 3, incluindo as duas salvaguardas do corte.
7. Faixa = P10 / mediana / P95; referência é a mediana, nunca a média.
8. Janela explícita com datas efetivas e regra de expansão; convenção do dia 15.
9. Origem da amostra declarada, com a penalidade de confiança correspondente.
10. Anúncios só como gap; metadados de reprodutibilidade em toda avaliação; "Dados insuficientes" em vez de número frágil.

**Evitar (erros já encontrados):** contar linhas da série inteira e chamar de vendas ("39" na Avenida do Pepê eram 115 escrituras em seis anos); média simples de linhas; série completa sem janela para precificar hoje; teto fixo igual para Leblon e Santa Cruz; calibrar o cinto da rua com a própria rua; misturar anúncio com escritura; média aritmética entre a média de apartamentos e a de casas.

**Antes de comparar preço, igualar a amostra.** Para os casos da seção 16 da especificação (Avenida do Pepê; Rua Desenhista Luiz Guimarães; General Olyntho Pilar; controle de 12 bairros; Copacabana com e sem cinto), os dois sistemas devolvem `COUNT(*)` e `SUM(total_transacoes)` iguais. Enquanto não baterem, toda diferença de preço é diferença de amostra, não de método. Atenção: os números publicados na seção 16 foram apurados sobre a base das 15h de 2026-09-03; a carga das 17h40 acrescentou escrituras (Barra da Tijuca, por exemplo, passou de 6.277 para 6.408 em 3 anos). Antes da comparação, reexecutar as consultas da seção 16 e usar os novos valores como baseline; a tolerância é ±1 % em médias e medianas e exata em contagens.

**Como decidir qual metodologia é melhor:** não por argumento. Vinte ou mais vendas reais fechadas pela Godoy Prime (endereço, tipologia, área, data, preço), avaliadas pelos dois sistemas na data da venda; erro mediano absoluto, viés, cobertura da faixa pessimista–otimista e largura mediana da faixa. Menor erro com cobertura entre 80 e 90 % e faixa mais estreita vence, e o outro sistema se ajusta. Hoje esse conjunto tem zero registros.

## 9. O que continua aberto

**Bugs e dívidas técnicas (Analytics):**

| # | Item | Prioridade |
|---|---|---|
| 20 | Del Castilho: a conferência por motivo diz 717 escrituras rejeitadas por percentual; a listagem direta na API acha 33. Uma das duas consultas está errada, e a "cobertura de 90 % explicada" depende da que estiver certa. Anti-join pela chave natural pedido ao Lovable. | Alta |
| 2 | Site público calibra piso e teto pela própria rua; o motor não. Unificar no cinto do bairro. | Alta |
| 19 | Transferências parciais descartadas na carga, não na consulta (10 % das escrituras da cidade, 23 % no Leblon). Gravar tudo e filtrar na consulta, que já filtra. | Média |
| 4 | Janela padrão de 12 meses nunca foi medida: zero avaliações salvas com metadados. Medir quando houver 30. | Média |
| 7 | Duas escalas de rótulo para a mesma confiança (nível 85/70/55; PDF 80/60/40). | Média |
| 8, 9 | Alerta de gap de 15 % sem amostra; mediana ao lado da média nos painéis. | Baixa |

**Decisões do dono do produto (não são bugs):**

| Decisão | Recomendação da auditoria |
|---|---|
| Ligar o fallback por raio (100 m e 300 m) em Configurações | Ligar os dois degraus; a consulta 7.10 sustenta |
| Barra Olímpica: bairro próprio ou parte da Barra da Tijuca | Bairro próprio; é um submercado 15 % mais barato e a tabela já tem o par. A escolha precisa viver na ingestão, senão a próxima carga a desfaz |
| Quem pode disparar carga completa | Definir; a função agora registra quem, quando e com que limites, mas não impede ninguém |
| Repositório público no GitHub com a metodologia inteira | Decidir conscientemente |
| Backtest com vendas reais | Fornecer as 20 vendas; sem isso tudo o que está aqui é coerência interna, não acerto de preço |

## 10. Arquivos de referência

| Arquivo | Papel |
|---|---|
| `docs/especificacao-metodologia-godoy-prime.md` (v3.0) | referência completa: 16 seções, apêndices A (constantes), B (144 pares do cinto), C (arquivos) |
| `supabase/functions/_shared/itbiMarketStats.ts` | núcleo estatístico, fonte única para app e edge functions |
| `supabase/functions/_shared/outlierLimits.ts`, `outlierLimitsGen.ts`, `scripts/gerar-cinto-outliers.ts` | cinto e seu gerador |
| `supabase/functions/_shared/itbiIngestion.ts`, `bairrosRio.ts` | regras de aceitação da carga; lista oficial de bairros |
| `src/utils/valuationCalculations.ts`, `valuationPdfExport.ts` | ajuste, gap, confiança, recomendação, PDF |
| `src/lib/logradouroSearch.ts` | expansão de grafia de logradouro |
| `docs/calibracao-consultas.sql` | consultas 7.1 a 7.11 (7.4 unificada regenera o cinto) |
| `docs/calibracao/` | todos os CSVs e notas das rodadas de 2026-09-02 e 03: cinto, spread, MAD par a par, cobertura API × base, rejeições, cargas |
| `src/utils/__tests__/` | 88 testes cobrindo motor, cinto, gerador, ingestão e bairros |

Toda mudança de metodologia a partir daqui deve vir com: constante ou regra alterada no código, consulta de calibração que a sustenta, CSV versionado em `docs/calibracao/`, teste, e a linha correspondente na especificação. Foi assim que os dez itens da seção 7 foram fechados, e é a única forma de o Prime Circle e o Analytics continuarem comparáveis depois deste relatório.
