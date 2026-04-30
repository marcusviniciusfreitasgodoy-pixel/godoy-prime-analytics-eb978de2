
# Documentação Técnica — Pipeline de Dados ITBI (Prefeitura RJ)

Este documento descreve, em detalhes, **toda a lógica de ingestão, limpeza e cálculo** aplicada aos dados ITBI da Prefeitura do Rio na plataforma Godoy Prime Analytics. Use como blueprint para replicar a inteligência em outra ferramenta.

---

## 1. Fonte de Dados

- **Endpoint oficial (ArcGIS REST):**
  `https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/ITBI/MapServer/8/query`
- **Formato:** JSON ArcGIS Features
- **Limite por página:** 1.000 registros (`maxRecordCount` da API). Paginação obrigatória via `resultOffset` + `resultRecordCount=1000`.
- **Limite de segurança interno:** 50.000 registros por execução.

### Característica crítica da fonte
Os dados **NÃO são transação a transação**. A API retorna registros **agregados** por (bairro × logradouro × mês × tipologia × uso). Cada linha contém:
- `total_transações` → quantidade real de vendas representadas
- `média_valor_transação` → valor médio das vendas agregadas
- `média_área_construída` → área média
- `média_percentual_transferido` → % médio de transferência da matrícula

> **Implicação:** todo cálculo estatístico (média, mediana, ranking de liquidez) **deve usar `total_transacoes` como peso**. Tratar cada linha como "1 venda" produz métricas erradas.

---

## 2. Parâmetros de Consulta à API

WHERE clause padrão usado:

```
ano_transação >= {minYear} AND ano_transação <= {maxYear}
AND mês_transação >= {minMonth} AND mês_transação <= {maxMonth}
[AND codbairro = '{codbairro}']         -- opcional
[AND uso = 'RESIDENCIAL']               -- opcional
```

**Códigos de bairro principais (`codbairro`):**
| Código | Bairro |
|---|---|
| 128 | Barra da Tijuca |
| 159 | Recreio dos Bandeirantes |
| 118 | Copacabana |
| 119 | Ipanema |
| 120 | Leblon |
| 123 | Lagoa |
| 029 | Botafogo |
| 040 | Flamengo |
| 088 | Tijuca |

**Janela padrão:** `2020-01-01` até hoje. Sincronização diária automática às 02:00.

---

## 3. Pipeline de Transformação (ETL)

Para cada registro retornado da API, na ordem:

### 3.1 Extração de campos
| Campo API | Campo interno |
|---|---|
| `logradouro` | `logradouro` (UPPERCASE) |
| `bairro` / `codbairro` | `bairro` (UPPERCASE) |
| `ano_transação` + `mês_transação` | `data_transacao` = `YYYY-MM-15` (sempre dia 15) |
| `uso` | `uso` → classificado |
| `principais_tipologias` | `tipologia` → classificado |
| `média_valor_transação` | `valor_transacao` |
| `média_área_construída` | `area_m2` |
| `total_transações` | `total_transacoes` (default 1) |
| `média_percentual_transferido` | `percentual_transferido` (default 100) |

### 3.2 Classificação `uso`
- Se contém `"nao residencial"`, `"não residencial"` ou `"comercial"` → **Comercial**
- Caso contrário → **Residencial**

### 3.3 Classificação `tipologia` (normalização)
| Padrão no texto original | Tipologia padronizada |
|---|---|
| `apartamento`, `apto`, `flat`, `cobertura` | **Apartamento** |
| `casa`, `sobrado`, `residencia` | **Casa** |
| `terreno`, `lote` | **Terreno** |
| `sala`, `loja`, `escritório` | **Comercial** |
| (default) | **Apartamento** |

### 3.4 Cálculo derivado
`valor_m2 = valor_transacao / area_m2`

---

## 4. Filtros de Qualidade (aplicados na ingestão)

Um registro é **descartado** se qualquer condição abaixo for verdadeira:

### 4.1 Dados inválidos
- `logradouro` vazio
- `valor_transacao` nulo ou ≤ 0
- `area_m2` nula ou ≤ 0

### 4.2 Filtro de transferência (regra de ouro)
- **`percentual_transferido < 90`** → descarta

> **Por quê:** transferências parciais (heranças, divisão de meação, doações) distorcem o valor real de mercado. Apenas transações com ≥90% representam venda efetiva a valor de mercado.

### 4.3 Filtros de outliers absolutos (sanity check)
- `area_m2` fora de **[20, 5.000]** m² → descarta
- `valor_transacao` fora de **[R$ 100.000, R$ 200.000.000]** → descarta
- `valor_m2` fora de **[R$ 500, R$ 300.000]** → descarta

---

## 5. Filtros de Outliers por Bairro (aplicados na consulta/análise)

Aplicados em **runtime**, sobre os dados já persistidos, ao calcular KPIs. Limite máximo de `valor_m2` por bairro:

| Bairro | Limite R$/m² |
|---|---|
| LEBLON | 80.000 |
| IPANEMA | 70.000 |
| LAGOA / JARDIM BOTÂNICO / GÁVEA | 50.000 |
| BARRA DA TIJUCA | 40.000 |
| COPACABANA / BOTAFOGO / HUMAITÁ | 40.000 |
| RECREIO / FLAMENGO / LARANJEIRAS | 35.000 |
| TIJUCA | 30.000 |
| **DEFAULT (outros)** | **60.000** |

> Esses limites estão calibrados pelo **percentil 99 + margem de segurança** observado em cada bairro.

---

## 6. Cálculos Estatísticos (regras universais)

### 6.1 Média Ponderada (sempre que houver preço)
```text
preco_medio_m2 = Σ(valor_m2 × total_transacoes) / Σ(total_transacoes)
```
**Nunca** usar média aritmética simples — distorce porque ignora o volume real de vendas representadas em cada linha agregada.

### 6.2 Liquidez / Volume
```text
liquidez = Σ(total_transacoes)
```

### 6.3 Variação Anual (YoY) — Janela Rolling 12m Simétrica
Para evitar viés de YTD (ex.: comparar Jan–Abr/2026 contra Jan–Dez/2025):

- **Período atual:** últimos 12 meses (rolling)
- **Período anterior:** 12 meses imediatamente antes desses (meses 13–24)
- `variacao = (preco_atual_12m − preco_anterior_12m) / preco_anterior_12m × 100`

### 6.4 Variação Mensal
- Agrupa transações por `YYYY-MM` (substring de `data_transacao`)
- Compara média ponderada do **último mês com dados** vs **penúltimo mês com dados**
- Exibir o mês de referência ao usuário (ex.: "Mar/2026")

### 6.5 Fallback de Amostragem (KPIs do ano corrente)
Se o ano corrente tiver dados insuficientes, expande para rolling 12m. Critério de "suficiente":
- `registros >= 30` **OU** `Σ(total_transacoes) >= 100`

Se ambos falham → usa janela rolling 12m e marca a flag `usandoDadosHistoricos = true` na resposta para sinalizar ao usuário.

### 6.6 Mínimo para Ranking de Logradouros/Microbairros
Um logradouro/microbairro só entra no ranking de "mais valorizado" se tiver **≥ 3 transações** (`Σ total_transacoes ≥ 3`). Evita falsos positivos de uma única venda atípica.

---

## 7. Filtros Padrão para Análises Residenciais

Toda query de KPI/avaliação aplica obrigatoriamente:

```sql
WHERE uso = 'Residencial'
  AND valor_m2 IS NOT NULL
  AND valor_m2 <= {outlier_limit_do_bairro}
  AND percentual_transferido >= 90
  AND data_transacao >= {janela_da_analise}
```

Para análises comerciais: `uso = 'Comercial'` (agrega lojas, salas, escritórios).

---

## 8. Microbairros da Barra da Tijuca (classificação por logradouro)

Lógica de regex aplicada sobre `logradouro` (uppercase, sem acentos sensível):

| Microbairro | Palavras-chave no logradouro |
|---|---|
| **Orla** | LUCIO COSTA, SERNAMBETIBA, PEPÊ |
| **Península** | PENÍNSULA |
| **Centro Metropolitano** | ABELARDO BUENO, EMBAIXADOR |
| **Ayrton Senna** | AYRTON SENNA, VIA PARQUE, ALFA BARRA |
| **Jardim Oceânico** | OLEGÁRIO, ÉRICO VERÍSSIMO |
| **ABM** | DULCÍDIO, CARDOSO |
| **Parque das Rosas** | MÁRIO COVAS, CÉSAR LATTES, HENRIQUE CORDEIRO |
| **Eixo Américas** | AMÉRICAS |

---

## 9. Persistência (Schema da Tabela `itbi_transactions`)

```text
logradouro              text     (UPPERCASE)
numero                  text     (sempre null - API não fornece)
complemento             text     (sempre null)
bairro                  text     (UPPERCASE)
valor_transacao         numeric  (R$, 2 decimais)
area_m2                 numeric  (2 decimais)
data_transacao          date     (YYYY-MM-15)
uso                     text     ('Residencial' | 'Comercial')
tipologia               text     ('Apartamento'|'Casa'|'Terreno'|'Comercial')
total_transacoes        int      (peso para média ponderada!)
percentual_transferido  numeric  (sempre ≥ 90 após filtro)
valor_m2                numeric  (computado: valor / area)
```

---

## 10. Resumo de Regras Inegociáveis

1. **Sempre** filtrar `percentual_transferido >= 90`.
2. **Sempre** ponderar médias por `total_transacoes` — nunca usar média simples.
3. **Sempre** aplicar limite de outlier `valor_m2` específico do bairro.
4. **Sempre** usar janela rolling 12m simétrica para YoY.
5. **Sempre** exigir mínimo de 3 transações para ranking de logradouro/microbairro.
6. **Sempre** classificar `uso` e `tipologia` via normalização textual antes de salvar.
7. **Paginação obrigatória** (1.000 registros/página) na API ArcGIS.
8. **Data sintética:** dia 15 do mês (a API só fornece ano/mês).

---

## Próximo passo

Se aprovar este documento, posso:
- (a) Apenas confirmar este conteúdo e encerrar (modo documentação),
- (b) Gerar um **PDF formatado** desta especificação para você levar à outra ferramenta,
- (c) Gerar um **script de referência** (Python ou TypeScript) com a função de ingestão + filtros + cálculo de KPIs encapsulada, pronto para portar.

Me diga qual opção prefere.
