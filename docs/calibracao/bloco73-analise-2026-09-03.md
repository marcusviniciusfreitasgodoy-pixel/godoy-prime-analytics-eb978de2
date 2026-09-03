# Bloco 7.3 par a par (2026-09-03, base `826dfeb`, 3 anos)

Fonte: `bloco73-par-a-par-3anos-2026-09-03.csv` (265 pares × 3 combinações de k; MAD em log, ponderado por escrituras, amostra do bairro × tipologia inteiro).

| k inferior / superior | corte médio ponderado por escrituras | pares acima de 10 % | pares entre 5 e 10 % |
|---|---:|---:|---:|
| 2,0 / 2,5 | 7,02 % | 73 | 29 |
| **2,5 / 3,0 (vigente)** | **3,81 %** | **48** | **22** |
| 3,0 / 3,5 | 2,46 % | 38 | 19 |

Pares grandes (100 ou mais escrituras) com corte acima de 5 % em 2,5 / 3,0:

| Par | corte baixo | corte alto | escrituras |
|---|---:|---:|---:|
| Santo Cristo Apartamento | 21,6 % | 0,0 % | 583 |
| São Conrado Apartamento | 0,0 % | 19,3 % | 280 |
| Glória Apartamento | 0,0 % | 17,2 % | 412 |
| Marechal Hermes Apartamento | 4,1 % | 14,3 % | 98 |
| Curicica Apartamento | 13,2 % | 0,0 % | 257 |
| Parada de Lucas Apartamento | 10,6 % | 0,0 % | 142 |
| Vargem Grande Apartamento | 4,1 % | 8,2 % | 147 |
| Copacabana Apartamento | 4,1 % | 5,2 % | 6.822 |
| Inhoaíba Apartamento | 8,2 % | 0,0 % | 98 |
| Barra Olímpica Apartamento | 8,1 % | 0,0 % | 581 |
| Humaitá Apartamento | 0,0 % | 7,6 % | 355 |
| Flamengo Apartamento | 0,2 % | 6,0 % | 2.052 |
| Santa Cruz Apartamento | 0,0 % | 5,5 % | 309 |

## Leitura

1. A fração cortada não muda com k de forma uniforme: os pares problemáticos continuam acima de 10 % em qualquer k. Não é questão de k; é a forma da distribuição.
2. Os piores casos são mercados **bimodais**: Santo Cristo (Porto Maravilha novo contra estoque antigo), São Conrado e Glória (luxo ao lado de habitação popular), Curicica e Parada de Lucas (conjuntos novos contra casas antigas). O MAD assume um núcleo unimodal com caudas; num bairro com dois núcleos ele elimina o menor inteiro e chama de outlier.
3. Isso pesa menos no motor, que corta sobre a amostra da rua ou do raio (normalmente unimodal), e mais no site público sem logradouro, no fallback por bairro e no parecer técnico, que trabalham com o bairro inteiro.

## Decisão

- k fica em 2,5 / 3,0. Baixar para 2,0 / 2,5 dobra o corte médio (7 %) e leva Copacabana a 12,7 %; subir para 3,0 / 3,5 não resolve os bimodais e afrouxa o resto.
- Entra uma **salvaguarda de bimodalidade** no motor (`MAX_OUTLIER_CUT_SHARE`): se o corte MAD ou IQR removeria mais de 15 % das escrituras da amostra, o corte é ignorado, a amostra inteira é mantida e `outlier_method` sai como `none` com `outlier_cut_skipped_reason: "bimodal"`. A faixa P10–P95 continua limitando as caudas. Motor passa a `ENGINE_VERSION` 4.
- Pendência para o produto: nesses bairros, o parecer deveria dizer "bairro com dois mercados" e só aceitar amostra de rua ou raio.
