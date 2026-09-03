# Recarga com piso de R$ 30 mil (2026-09-03, 17:12 UTC)

Executada pelo Lovable com `main` em `9c12a91` (PR #20), a pedido do dono, seguindo a pendência 13 da especificação.

## Carga completa (`etl_log` `435e241d`)

- 2020–2026, todos os bairros, `clearExisting: false`, usuário marcus@godoyprime.com.br, 17:12:03 → 17:12:37 UTC.
- API: 43.350 agregados. Válidos: 38.488. Inseridos/atualizados: 33.500. Obsoletos removidos: 0. Geocodificação preservada.
- Rejeitados: 4.428 por percentual < 90; 434 fora das faixas; 0 dados inválidos.
- **Falha:** 10 lotes (cerca de 5.000 linhas, sobretudo no fim do arquivo) devolveram `ON CONFLICT DO UPDATE command cannot affect row a second time`. A API repete a chave natural (`logradouro, bairro, data_transacao, uso, tipologia`) dentro do mesmo lote, porque tipologias diferentes da fonte viram a mesma classe depois de `classificarTipologia`. Corrigido no PR #21 (`mesclarDuplicatasItbi`); a carga precisa ser repetida.
- **Falha 2:** `detalhes.limites_ingestao` não ficou na linha final do `etl_log`: o update de encerramento sobrescrevia o `detalhes` inicial. Corrigido no PR #21.

## Pós-carga

- Backfill de `geom` rodado direto no banco (a função exige `auth.uid()` admin): residencial 33.104 de 33.619 linhas com geom, 99,1 % das escrituras (31.820 por `logradouros_geo`, 1.311 por fallback, 516 sem geom).
- `refresh_itbi_price_index()` executado. `classify-microbairros` na Barra até estabilizar: 113 condomínios classificados por palavra-chave; o restante sem regra.
- Base: **33.647 linhas, 141.976 escrituras**, último mês 07/2026 (antes: 31.472 / 134.555). Ainda faltam as linhas dos 10 lotes perdidos.

## 7.11 depois da recarga

O corte de R$ 100 mil sumiu; mínimos vão a R$ 30 mil. Cauda barata de volta: Irajá Casa P1 36.226 (39,7 % até 110 mil), Cosmos Casa 38.861 (78,4 %), Pavuna Casa 41.042, Campo Grande Casa 45.875 (659 escrituras), Santa Cruz Apartamento P1 66.954 com 266 escrituras (antes 85), Inhoaíba Apartamento 178 escrituras (75,3 % até 110 mil).

## 7.3 (5 anos, MAD em log, ponderado), resumo do Lovable

| k inferior / superior | corte baixo | corte alto | total |
|---|---:|---:|---:|
| 2,0 / 2,5 | 3,61 % | 3,39 % | 7,00 % |
| 2,5 / 3,0 (vigente) | 1,40 % | 1,86 % | 3,26 % |
| 3,0 / 3,5 | 0,80 % | 1,11 % | 1,91 % |

Com 2,0 / 2,5, Copacabana Apartamento perde 7,0 % + 5,7 % da amostra. Decisão: manter 2,5 / 3,0 (ver seção 15.3 da especificação). O CSV par a par ainda não foi anexado.

## Segunda carga (17h40, `etl_log` `34f03d7c`, PR #21 em `4cae228`)

- `registros_com_erro: 0`, `duplicatas_mescladas: 291`, `limites_ingestao.valorMin: 30000`, `clear_existing: false`, usuário marcus@godoyprime.com.br.
- Base: 38.197 linhas, 163.015 escrituras, geom em 37.402 (97,9 %), índice atualizado. Degrau do fim do arquivo sumiu (Barra Olímpica, Lapa, Jabour, Acari presentes).
- Cobertura contra a API: `cobertura-api-x-base-2026-09-03.md`.
- CSVs devolvidos: `bloco74-3anos-p99-2026-09-03-1740.csv` (veio com P99, não P99,5: não serve para o teto), `bloco74b-3e5anos-2026-09-03-1740.csv` (pares abaixo de 100 escrituras, com P99,5). O 7.3 par a par não foi anexado.

## O que falta

1. Consulta 7.4 unificada (0.995, duas janelas, sem HAVING) em CSV; `bun run cinto` regenera a tabela e o Apêndice B.
2. 7.3 par a par sobre a tabela nova.
3. Decisão sobre Barra Olímpica (pendência 17 da especificação).
