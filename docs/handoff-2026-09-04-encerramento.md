# Encerramento da sessão de auditoria (2026-09-02 a 2026-09-04)

Nota de passagem para quem continuar: dono do produto, desenvolvedor da Prime Circle ou o próximo agente. Tudo o que tem valor está no repositório; esta nota diz onde e o que falta.

## Estado em que ficou

- `main` em `ec34f66` (PR #25). Motor `ENGINE_VERSION` 4. Base: carga de 2026-09-03, 17h40 (38.197 linhas, 163.015 escrituras, 90,0 % das escrituras da API, geom 97,9 %).
- Produção (Lovable) confirmada em `826dfeb`; o deploy de `da95452` (motor v4, bairro com acento no site público) e de `ec34f66` (só docs) ainda não foi confirmado.
- 88 testes verdes; typecheck, lint e build limpos; CI verde em todos os PRs #13 a #25.

## Documentos, em ordem de leitura

| Documento | Para quem | O que é |
|---|---|---|
| `docs/relatorio-final-desenvolvedor-2026-09-04.md` | desenvolvedor da Prime Circle | carta de entrega: valores, métricas e estatísticas congelados em `da95452`, o que mudou, o que reproduzir, o que está aberto |
| `docs/especificacao-metodologia-godoy-prime.md` (v3.0) | referência técnica | 16 seções e 3 apêndices; seção 15 é o plano de ação; Apêndice B tem os 144 pares do cinto |
| `docs/calibracao/` | auditoria | todos os CSVs e notas das rodadas: cinto, spread, MAD par a par, cobertura API × base, rejeições, cargas |
| `docs/calibracao-consultas.sql` | quem roda consultas | 7.1 a 7.11; a 7.4 unificada alimenta `bun run cinto` |
| `docs/auditoria-motor-avaliacao.md`, `docs/handoff-2026-09-02.md`, `docs/roteiro-alinhamento-metodologia-itbi.md` | histórico | achados A1 a A17, mudanças de 2026-09-02, caso da Avenida do Pepê |
| `scripts/docs-html/` | publicação | conversor Markdown → página e os endereços das páginas publicadas |

## Regras que passaram a valer (resumo do que o código faz)

1. Linha = agregado mensal; `total_transacoes` é o peso; registros e escrituras sempre exibidos separados.
2. Carga: `_shared/itbiIngestion.ts` é a única regra de aceitação (área 20–5.000 m², valor R$ 30 mil–200 mi, R$/m² 500–300 mil, percentual ≥ 90), duplicatas de chave natural somadas, trilha em `etl_log`, geocodificação preservada; carga diária grava peso e percentual.
3. Cinto: `bun run cinto docs/calibracao/<csv da 7.4>` gera `OUTLIER_LIMITS_TABLE`; ninguém edita à mão. Regras: ≥ 100 escrituras em 3 anos → P1 × 0,85 e P99,5 × 1,15; senão ≥ 30 em 5 anos → largura mínima [mediana/2; mediana×2]; senão fora.
4. Motor: rua → raio 100 → raio 300 → bairro (8 linhas); janela 12 meses com expansão; deflação trimestral; MAD 2,5 / 3,0 com salvaguardas de 3 escrituras e de 15 % (bimodal); faixa P10 / mediana / P95.
5. Parecer: spread 35 / 50 / 65; rótulos do PDF 27 / 37 / 50; gap com 3 anúncios e ±35 %; confiança com penalidade por origem 0 / 5 / 10 / 15; teto por amostra 40 / 55 / 75.
6. Site público resolve o bairro pela lista oficial (`_shared/bairrosRio.ts`) antes de comparar por igualdade.

## O que está aberto

**Pedido pendente ao Lovable (cole como está):**

```
1) Implante a main no commit ec34f66 (PRs #24 e #25). Reimplante public-itbi-stats
   e parecer-nucleo. Confira no site: "barra olimpica", "Barra Olímpica" e
   "BARRA OLIMPICA" devolvem as mesmas estatísticas.

2) Anti-join para DEL CASTILHO, 2020–2026: agregados da API que NÃO existem em
   itbi_transactions pela chave natural, com o motivo de validarFeatureItbi para
   cada um. A soma das escrituras tem que dar 717. Repita para PAVUNA. CSV anexado.

3) Reexecute as consultas da seção 16 da especificação (casos 1 a 5) sobre a base
   atual e devolva os resultados: a baseline publicada é da base das 15h.
```

**Pendências técnicas** (números da seção 15.1 da especificação): 20 (Del Castilho, 717 contra 33), 2 (site público calibra cinto pela rua), 19 (percentual descartado na carga), 4 (janela padrão não medida), 7 (duas escalas de rótulo de confiança), 8 e 9 (gap sem amostra; mediana nos painéis).

**Decisões do dono, que não são bugs:** ligar o fallback por raio (recomendado: sim, os dois degraus); Barra Olímpica como bairro próprio ou parte da Barra (recomendado: próprio; gravar a escolha na ingestão); quem pode disparar carga completa; repositório público; e as 20 vendas reais do backtest, sem as quais nada disto prova acerto de preço.

## Mensagem de encaminhamento ao desenvolvedor

Rascunho na voz do dono, para acompanhar o relatório final:

> **Assunto: Metodologia ITBI do Godoy Prime Analytics — relatório para alinharmos os dois sistemas**
>
> Nos últimos dois dias fiz uma auditoria completa de como o Godoy Prime Analytics calcula preço a partir do ITBI da Prefeitura: consultas, pesquisas de mercado, painéis, site público e o Parecer. O objetivo era um só: deixar por escrito, número a número, o que o nosso sistema faz, para que você consiga reproduzir e a gente compare o Analytics e o Prime Circle sobre a mesma base, e não sobre suposições.
>
> Estou mandando dois documentos: o **relatório final** (curto, leia primeiro), que congela todos os valores, métricas e estatísticas no commit atual, diz o que mudou nesses dois dias e por quê, o que preciso que você reproduza e o que ainda está em aberto; e a **especificação completa** (longa, referência), com fórmulas, equivalentes em SQL, casos de conferência com números reais, a tabela do cinto de outliers e o checklist de aceite.
>
> O que descobrimos: a divergência entre os nossos números tinha causas concretas, e a maior parte estava do nosso lado. A base do Analytics carregava cerca de 70 % do mercado, o mês corrente entrava com peso errado e alguns limites estavam calibrados com amostra parcial. Tudo isso foi corrigido; a base agora tem 90 % das escrituras que a Prefeitura publica, com os 10 % restantes explicados linha a linha. Os números do Analytics anteriores a ontem não valem mais.
>
> O que peço, nesta ordem: igualar a amostra antes de comparar preço (para os casos de conferência, os dois sistemas precisam devolver o mesmo número de registros e de escrituras; cada linha do ITBI é um agregado mensal e `total_transacoes` é o peso); marcar o checklist de aceite item a item; e me dizer onde você discorda.
>
> O que decide qual metodologia é melhor não é argumento: é um conjunto de vendas reais fechadas, avaliadas pelos dois sistemas na data da venda. Eu forneço as vendas, você roda os dois sistemas, lemos o resultado juntos.

## Lição de método, para não se perder

Dez defeitos foram fechados em dois dias. Nenhum apareceu por leitura de código. Todos apareceram porque um número da base foi confrontado com um número da fonte (API da Prefeitura) ou com outro número da própria base. A primeira pergunta em qualquer conversa sobre metodologia, com a Prime Circle ou com quem for, continua sendo: quantas escrituras a sua base tem, por bairro e por ano, contra a API.
