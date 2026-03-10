

## Plano: Atualizar base de condomínios com classificação e ruas internas

### Diagnóstico

Após consultar a base, identifiquei 3 grupos de operações:

#### A) Condomínios existentes — ATUALIZAR (9 registros)

| Condomínio | ID | Ação |
|---|---|---|
| **Alphaville Barra** | `88aaaf5c` | `padrao_construtivo` → 'Ultra Luxo'; adicionar ruas faltantes: Billy Blanco, Titá Burlamaqui, Angelo de Aquino, Ayrton Luiz Gonçalves, Jorge Curi |
| **Malibu** | `608d7a6b` | `padrao_construtivo` → 'Ultra Luxo'; adicionar ruas: Maisa, Conchita de Morais, Ariosto Berna |
| **Santa Mônica Jardins** | `dbc68746` | `padrao_construtivo` → 'Ultra Luxo'; `microbairro` → 'Barra Central' |
| **Península** | `02461345` | `padrao_construtivo` → 'Ultra Luxo'; adicionar RUA TAMARINDOS DA PENINSULA |
| **Le Parc** | `8c804322` | `padrao_construtivo` → 'Ultra Luxo'; `microbairro` → 'Eixo Lúcio Costa'; limpar `ruas_internas` (torre única) |
| **Mandarim Península** | `bc9db5a2` | `padrao_construtivo` → 'Ultra Luxo'; limpar `ruas_internas` (torres) |
| **Al Mare** | `2218aff1` | `padrao_construtivo` → 'Alto Padrão'; limpar `ruas_internas` (torres) |
| **Alfa Barra** | `17edcca0` | `padrao_construtivo` → 'Alto Padrão'; limpar `ruas_internas` (torres) |
| **Barramares** | `4ca2389e` | `padrao_construtivo` → 'Alto Padrão'; limpar `ruas_internas` (torres) |

> **Nota sobre "limpar ruas_internas"**: Os apartamentos marcados como "torres" não possuem ruas internas — as ruas atualmente cadastradas são vias públicas ao redor do edifício, não ruas internas de um complexo. Limpar esse campo corrige o mapeamento.

#### B) Condomínios novos — CRIAR (8 registros)

| Condomínio | Microbairro | Padrão | Ruas internas |
|---|---|---|---|
| Del Lago | Barra Central | Ultra Luxo | (nenhuma mapeada) |
| Riserva Golf | Barra Central | Ultra Luxo | (nenhuma mapeada) |
| Quintas do Rio | Barra Central | Alto Padrão | (nenhuma mapeada) |
| Pedra de Itaúna | Barra Central | Alto Padrão | (nenhuma mapeada) |
| Wimbledon Park | Barra Central | Alto Padrão | (nenhuma mapeada) |
| ABM – Bosque Marapendi | Barra Central | Alto Padrão | (nenhuma mapeada) |
| Riviera Del Sol | Recreio | Alto Padrão | (nenhuma mapeada) |
| Pontal Oceânico | Recreio | Alto Padrão | (nenhuma mapeada) |

#### C) Apartamentos novos — CRIAR (3 registros)

| Condomínio | Microbairro | Padrão | Ruas internas |
|---|---|---|---|
| Bernini | Península | Ultra Luxo | (nenhuma — torres) |
| Blue Coast | Eixo Lúcio Costa | Alto Padrão | (nenhuma — torres) |
| Barra Marina | Barra Central | Alto Padrão | (nenhuma — torres) |

### Execução

- 9 UPDATEs para registros existentes
- 11 INSERTs para novos registros
- Nenhuma alteração de código (frontend já filtra por `ativo = true`)

### Questão pendente

O **Riserva Uno** já existe (id `257b9c91`) com microbairro "Eixo Américas". O "Riserva Golf" da sua lista é um condomínio diferente — confirmo que devo criá-lo como registro separado.

