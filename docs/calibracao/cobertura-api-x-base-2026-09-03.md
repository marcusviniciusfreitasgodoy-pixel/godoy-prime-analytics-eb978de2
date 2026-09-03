# Cobertura API da Prefeitura × base (2026-09-03, 17h40, após a carga `34f03d7c`)

Fonte: `cobertura-api-x-base-2026-09-03.csv` (uma linha por bairro, na ordem em que a API devolve os bairros) e `base-total-2026-09-03-1740.csv`.

## Totais

| | API (2020–2026) | Base | Cobertura |
|---|---:|---:|---:|
| Agregados / linhas | 43.350 | 38.197 | 88,1 % |
| Escrituras | 181.163 | 163.015 | 90,0 % |

A diferença de 5.153 agregados é exatamente a soma das rejeições da carga anterior mais as duplicatas mescladas nesta: 4.428 com `percentual_transferido < 90`, 434 fora das faixas de área, valor e R$/m², 291 chaves naturais repetidas somadas num só agregado. Não há mais lote perdido: Barra Olímpica, Lapa, Jabour e Acari, os últimos bairros da ordem da API, estão na base. Geocodificação: 37.402 de 38.197 linhas (97,9 %); as 795 sem `geom` são majoritariamente linhas novas de ruas sem entrada em `logradouros_geo`.

## Onde a rejeição por percentual pesa mais (escrituras da API → base)

| Bairro | API | Base | Fora |
|---|---:|---:|---:|
| Pavuna | 236 | 101 | 57 % |
| Bangu | 812 | 465 | 43 % |
| Saúde | 131 | 78 | 41 % |
| Madureira | 707 | 444 | 37 % |
| Del Castilho | 2.230 | 1.513 | 32 % |
| Cosme Velho | 152 | 113 | 26 % |
| Leblon | 4.051 | 3.103 | 23 % |
| Vargem Pequena | 935 | 718 | 23 % |
| Ipanema | 5.098 | 4.348 | 15 % |
| Botafogo | 7.003 | 6.080 | 13 % |
| Copacabana | 15.457 | 13.540 | 12 % |
| Tijuca | 9.532 | 8.436 | 12 % |
| Barra da Tijuca | 19.808 | 18.703 | 6 % |

Leitura: transferências parciais (inventários, doações de fração, permutas) são 10 % das escrituras da cidade e chegam a 23 % no Leblon. Excluí-las do R$/m² é correto (o valor declarado é da fração, não do imóvel). Descartá-las **na carga** é uma decisão de arquitetura que a base paga: ela não consegue responder "quantas transferências parciais houve" nem revisar o limiar de 90 % sem recarregar tudo. A alternativa é gravar todas as linhas válidas e filtrar `percentual_transferido >= 90` só nas consultas, como todas as telas já fazem. Registrado como pendência 19 da especificação.

Pavuna, Bangu, Madureira e Del Castilho merecem uma conferência da composição das rejeições (percentual × faixas), porque 30 a 57 % é muito para transferência parcial num bairro popular; a hipótese alternativa é área média abaixo de 20 m² em conjuntos habitacionais ou agregados com área nula na fonte.
