# Especificação de Metodologia ITBI — documento de handoff para o desenvolvedor externo

Objetivo: produzir um documento único, completo e reproduzível, que permita ao desenvolvedor do outro sistema replicar exatamente os números do Godoy Prime Analytics em **Avaliação**, **Pesquisa de Mercado** e **Painel Analítico (Dashboard)**.

Entrega em dois formatos:
- `docs/especificacao-metodologia-godoy-prime.md` (versionado no repositório, junto do código);
- `/mnt/documents/Godoy-Prime-Metodologia-ITBI.pdf` (PDF Navy/Gold, pronto para encaminhar).

Os documentos existentes (`roteiro-alinhamento-metodologia-itbi.md` e `auditoria-motor-avaliacao.md`) passam a ser anexos históricos; a especificação nova é a fonte única.

## Estrutura do documento

**Parte 0 — Como usar**
Público, escopo, glossário (registro agregado × escritura, R$/m², percentil ponderado, deflação, janela móvel), e a regra de ouro: linha ≠ transação.

**Parte 1 — Modelo de dados e amostra**
- Estrutura de `itbi_transactions`, significado de cada coluna usada e de `total_transacoes` como peso.
- Filtros obrigatórios em ordem: `uso = 'Residencial'`, `percentual_transferido >= 90`, `valor_m2 IS NOT NULL`, tipologia, janela temporal.
- Normalização de bairro e de logradouro: regras de acento/caixa, tabela completa de variantes de grafia (GENERAL/GAL, OLYNTHO/OLINTO, PILLAR/PILAR, DESENHISTA/DESEN, AVN/AV, Z↔S) e a função de expansão de termos de busca.
- Limite obrigatório de paginação (`.limit(5000)`) e por que a ausência dele produz divergência silenciosa.

**Parte 2 — Motor estatístico (núcleo compartilhado)**
Cada item com fórmula matemática, pseudocódigo e SQL de referência:
1. Média ponderada: `Σ(valor_m2 × total_transacoes) / Σ(total_transacoes)`.
2. Mediana e percentis ponderados (P10, P25, P50, P75, P90, P95, P99, P99,5) — algoritmo exato de acumulação de pesos usado no código.
3. Cinto de outliers por bairro × tipologia: janela móvel de 3 anos, P1 e P99,5 ponderados, mínimo de 100 escrituras, piso = P1 × 0,85, teto = P99,5 × 1,15, fallback de 5 anos e fallback global (1.000 / 60.000). **Tabela completa dos 78 pares** com piso, teto, p1, p99,5, escrituras e janela.
4. Janela móvel: opções 12/24/36/48/60 meses, padrão 12, ampliação automática quando a amostra tiver menos de 8 registros, e os metadados gravados (`janela_meses`, `janela_meses_solicitada`, `janela_expandida`).
5. Correção monetária: índice de preços, trimestre de referência, fórmula de deflação e quando é aplicada.
6. Fallback geográfico: rua → 100 m → 300 m → bairro, com o critério de disparo de cada nível.

**Parte 3 — Avaliação**
Pipeline completo passo a passo: coleta da amostra, corte de outliers, deflação, faixa de preços (mínimo = P10, provável = mediana, máximo = P95), integração de anúncios e blend, base personalizada e propagação proporcional dos limites, score de confiança, e o que cada campo do laudo/PDF significa. Inclui a distinção P95 × P99 e por que o topo do ITBI fica abaixo do preço de oferta.

**Parte 4 — Pesquisa de Mercado**
Parâmetros da busca, opções de período, indicadores exibidos (registros × escrituras, média e mediana ponderadas, volume financeiro, variação temporal), regras de "Dados insuficientes" e formato de exportação.

**Parte 5 — Painel Analítico e Microrregiões**
KPIs e janelas de cada card, janela de 12 meses das microrregiões, ranking, comparação de ruas, e a origem exata de cada número exibido.

**Parte 6 — Casos de conferência (baseline de aceite)**
Queries rodadas agora no banco de produção, com os resultados congelados como valores esperados:
- Avenida do Pepê (Barra da Tijuca) nas 5 janelas;
- Rua Desenhista Luiz Guimarães (12 meses e série 2020–2026 por ano);
- Rua General Olyntho Pilar (variantes de grafia);
- Um bairro fora da Barra, para provar que a regra é global.
Cada caso traz: SQL, resultado numérico e tolerância aceitável.

**Parte 7 — Checklist de aceite**
Lista objetiva de verificações que o desenvolvedor marca item a item para declarar os sistemas alinhados.

## Notas técnicas

- Fonte da verdade do conteúdo: `supabase/functions/_shared/itbiMarketStats.ts`, `outlierLimits.ts`, `priceTrend.ts`, `src/lib/logradouroSearch.ts`, `Step1Location.tsx`, `public-itbi-stats`, hooks de KPI/microbairro. O documento descreve o comportamento efetivo do código, não a intenção.
- Correção pendente a registrar explicitamente: o campo `p99` da tabela de limites armazena o **P99,5** — o documento nomeia o valor corretamente e sinaliza a divergência de nomenclatura ao desenvolvedor.
- Os números dos casos de conferência serão obtidos por consulta direta ao banco no momento da geração, com data/hora do snapshot registrada no cabeçalho.
- PDF gerado por script Node com jsPDF (render manual, sem html2canvas), paleta Navy `#0C2340` / Gold `#D4AF37`, capa, sumário e numeração. Cada página será conferida visualmente antes da entrega.
