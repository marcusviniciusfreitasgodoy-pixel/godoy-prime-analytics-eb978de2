# Bloco 7.11 — filtro de ingestão de R$ 100 mil (2026-09-03, 5ª rodada)

Resultados devolvidos pelo Lovable sobre a base recarregada em 2026-09-03 (main `5952575`).

## 7.11 na base (5 anos, 25 pares com menor P1 de `valor_transacao`)

- Nenhum bairro tem `valor_min` abaixo de R$ 100.368; os P1 se empilham entre R$ 101 mil e R$ 108 mil.
- Conclusão: o filtro `valor < 100000` de `sync-itbi-prefeitura` (linha 354 no commit `5952575`) estava ativo em toda a base.
- Pares mais afetados (fração da amostra remanescente com `valor_transacao` até R$ 110 mil):

| Par | % até 110 mil |
|---|---:|
| INHOAÍBA \| Apartamento | 59,5 % |
| COSMOS | 40,4 % |
| ENGENHO DE DENTRO \| Casa | 18,8 % |
| IRAJÁ \| Casa | 17,5 % |
| GUARATIBA \| Casa | 13,0 % |

## API da Prefeitura: o que estava sendo descartado

Features residenciais, percentual ≥ 90, valor médio entre R$ 50 mil e R$ 100 mil, 2021–2026:

| Bairro | Features | Escrituras |
|---|---:|---:|
| SANTA CRUZ | 74 | 186 |
| CAMPO GRANDE | 45 | 129 |
| GUARATIBA | 34 | 82 |
| INHOAÍBA | 16 | 39 |
| PACIÊNCIA | 14 | 32 |
| BANGU | 10 | 30 |

Comparação com o que sustentava o cinto (5 anos, `docs/calibracao/bloco74-19pares-3e5anos-2026-09-03.csv`): Santa Cruz \| Apartamento 85 escrituras mantidas contra 186 descartadas (82 só em 2025); Guaratiba \| Casa 54 mantidas contra 82 descartadas; Inhoaíba \| Apartamento 37 mantidas contra 39 descartadas. Nesses bairros o cinto e todas as estatísticas estavam calibrados sobre metade do mercado real, ou menos.

## Decisão

- Piso de valor da ingestão baixado para R$ 30 mil (`LIMITES_INGESTAO.valorMin`, `supabase/functions/_shared/itbiIngestion.ts`), nas duas cargas. O erro de digitação continua barrado por área [20; 5000] m² e R$/m² [500; 300.000].
- A base **não** foi recarregada ainda. Protocolo de recarga na pendência 13 da especificação (seção 15.1).
