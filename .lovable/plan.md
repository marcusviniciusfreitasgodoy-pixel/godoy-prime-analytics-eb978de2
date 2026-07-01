# Passo 1 — Introspecção concluída

## Nomes reais confirmados

| Item | Nome real | Nota |
|---|---|---|
| ITBI | `itbi_transactions` | Agregado — ponderar por `total_transacoes` |
| IPTU | `iptu_logradouro_resumo` + `iptu_2025_logradouro` | `iptu_imoveis` está vazia |
| Condomínios | `condominios_mapeamento` | Fonte do polígono via `geom_lote` |
| Lotes PAL | `lotes_pal` | Sem flag CONDOMINIO |
| Edificações | `edificacoes_geo` | Footprint + altura |
| Microbairros | `microbairros_geo` + `view_ranking_microbairros` | |
| Normalização | `public.normalizar_logradouro(texto text) → text` | |
| Laudo | `valuations` (64 col.) | Ajustes A–E hoje só no jsonb `recommendation_details` |

## Decisões do usuário

1. ITBI: ponderar por `total_transacoes` sempre; quantidade = `SUM(total_transacoes)`
2. Ajustes A–E: criar colunas discretas `ajuste_a..ajuste_e` em `valuations` + manter espelho no `recommendation_details`
3. Lote de condomínio: usar `condominios_mapeamento.geom_lote`
4. IPTU: operar só com agregado; ausência de imóvel-a-imóvel vira lacuna declarada

## Próxima ação

Nenhuma construção acontece aqui. Aguardar o Passo 2 do usuário antes de propor plano de implementação do agente Analista Imobiliário.
