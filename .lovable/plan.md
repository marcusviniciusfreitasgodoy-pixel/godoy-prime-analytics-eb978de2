## Problema

O `prefillFromAvaliacao` está lendo colunas que não existem na tabela `valuations` (`endereco`, `area_privativa`, `valor_estimado`, `valor_m2`, `condominio`, `valor_min/max`, `tipologia`). Por isso só chegaram os poucos campos que casualmente batiam (`bairro`, `quartos`, `suites`, `vagas`).

## Correção

Reescrever `src/lib/parecer/prefillFromAvaliacao.ts` para mapear os nomes reais das colunas:

| Campo do parecer | Origem real em `valuations` |
|---|---|
| `endereco_imovel` | `logradouro` + `numero` + `complemento` (e `cep`) |
| `bairro` | `bairro` |
| `tipologia` | `property_type` (fallback `tipo_avaliacao`) |
| `area_privativa` | `property_area_m2` |
| `area_total` | `property_area_m2 + area_terreno_m2` (quando houver terreno) senão `property_area_m2` |
| `quartos` / `suites` / `vagas` | mesmos nomes |
| `condominio` | `nome_condominio` (nome). Também alimenta `observacoes_perito` inicial com "Condomínio mensal: R$ …" a partir de `valor_condominio` quando vazio |
| `valor_mercado` | `final_value_med` formatado em BRL |
| `valor_m2_apurado` | `combined_med_m2` formatado em BRL/m² |
| `intervalo_valor` | `final_value_min` – `final_value_max` formatados em BRL |
| `grau_fundamentacao` / `grau_precisao` | derivado de `confidence_level` (Alta→III, Média→II, Baixa→I) |

Comparativos permanecem opcionais — se `recommendation_details.comparativos` ou `anuncio_fontes` existirem no JSON, são mapeados; senão fica `[]` como hoje.

## Escopo

- **Apenas** `src/lib/parecer/prefillFromAvaliacao.ts`.
- Não altera schema, tipos, UI, PDF ou lista de proibidos.
- Modal de importação e botão continuam iguais.
