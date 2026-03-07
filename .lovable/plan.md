

## Limpeza dos Registros Genéricos de Condomínios

### Diagnóstico

| Categoria | Quantidade |
|-----------|-----------|
| Total de condomínios | 1.568 |
| Fonte `manual` (reais) | 508 — nenhum genérico |
| Fonte `algoritmo_pal` (genéricos) | 1.060 — todos com nome "não identificado" |
| Torres vinculadas aos genéricos | 79.343 |

Os 508 condomínios reais (fonte `manual`) estão 100% seguros — nenhum tem nome genérico.

### Decisão necessária sobre as torres

As 79.343 torres estão vinculadas (`condominio_id`) aos registros genéricos. Ao deletar os condomínios, essas torres ficarão com um `condominio_id` apontando para registros inexistentes. Precisamos decidir o que fazer com elas.

### Plano de execução

Duas operações SQL via ferramenta de dados (não migração):

1. **Desvincular torres** — `UPDATE torres_condominios SET condominio_id = NULL` onde o condomínio vinculado tem nome genérico
2. **Deletar condomínios genéricos** — `DELETE FROM condominios_mapeamento WHERE nome_condominio ILIKE '%não identificado%' AND fonte_identificacao = 'algoritmo_pal'`

A condição dupla (`nome ILIKE` + `fonte = algoritmo_pal`) garante que nenhum registro manual seja afetado.

### Resultado esperado
- 508 condomínios preservados (todos manuais/reais)
- 1.060 registros genéricos removidos
- 79.343 torres preservadas mas desvinculadas (disponíveis para re-associação futura)

