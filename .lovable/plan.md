

## Plan: Corrigir 3 Edge Functions + Criar territorial-status + Migration

### Arquivos a modificar/criar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/ingest-edificacoes-geo/index.ts` | Reescrever — streaming com insert por pagina, offset_inicial, timeout safety |
| `supabase/functions/ingest-lotes-pal/index.ts` | Reescrever — streaming por pagina |
| `supabase/functions/ingest-iptu-prefeitura/index.ts` | Reescrever — descoberta de campo bairro por layer, fallback bbox |
| `supabase/functions/territorial-status/index.ts` | Criar — endpoint de diagnostico |
| `supabase/config.toml` | Adicionar `[functions.territorial-status]` |
| Nova migration SQL | DROP constraint `lotes_pal_num_contribuinte_unique`, criar RPC `calcular_area_edificacoes_pendentes`, recalcular areas existentes |

### Migration SQL

1. `DROP INDEX IF EXISTS lotes_pal_num_contribuinte_unique` (ou constraint, conforme existir)
2. Criar `calcular_area_edificacoes_pendentes()` — UPDATE edificacoes_geo SET area_footprint = ST_Area(ST_Transform(geom::geometry, 31983)) WHERE area_footprint IS NULL AND geom IS NOT NULL, retorna ROW_COUNT
3. Recalcular `lotes_pal.area_lote` para registros com geom mas sem area

### Correção 1: ingest-edificacoes-geo

- Aceitar `offset_inicial` no body para retomar ingestao parcial
- Streaming: fetch page -> transform -> upsert via `.from('edificacoes_geo').upsert(chunk, { onConflict: 'objectid_origem' })` -> next page
- Timer de 75s: se excedido, salvar etl_log com status='partial' e `proximo_offset` no campo detalhes
- Chamar RPC `calcular_area_edificacoes_pendentes` apos cada pagina
- Retornar `{ parcial, proximo_offset, inserido }` ou `{ completo, inserido, erros }`

### Correção 2: ingest-lotes-pal

- Mesmo padrao de streaming (insert por pagina, nao acumular)
- Upsert direto via `.from('lotes_pal').upsert()` com onConflict `objectid_origem`
- Chamar `calculate_lote_areas` no final

### Correção 3: ingest-iptu-prefeitura

- Funcao `descobrirCampoBairro(layerUrl)` que faz GET no endpoint `?f=json` do layer e procura campo de bairro entre candidatos
- Se campo encontrado: usar `WHERE ${campo} LIKE '%${bairro}%'`
- Se nao encontrado: usar bbox espacial da Barra como fallback
- Retorno enriquecido com info de qual campo foi usado por layer
- etl_log.detalhes inclui campo_bairro por layer

### Correção 4: territorial-status (nova Edge Function)

- GET que retorna contagens de iptu_logradouro_resumo, lotes_pal, edificacoes_geo, torres_condominios e ultimos 10 etl_log
- Auth: admin only
- Queries simples com COUNT e GROUP BY

