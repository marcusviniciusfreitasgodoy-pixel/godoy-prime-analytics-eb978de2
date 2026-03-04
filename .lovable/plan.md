

## Plan: Corrigir 3 Edge Functions + Migration SQL

### Resumo

Reescrever 3 Edge Functions com URLs e campos corretos da API ArcGIS, e criar uma migration para adicionar colunas faltantes nas tabelas e novas RPCs.

### Migration SQL (1 arquivo)

Adiciona colunas e RPCs necessarias:

1. **`iptu_logradouro_resumo`**: adicionar `cod_logradouro text`
2. **`lotes_pal`**: adicionar `objectid_origem integer UNIQUE`, `paa text`, `tipo_parcelamento text`, `situacao text`
3. **`edificacoes_geo`**: adicionar `cod_lote text`, `tipo_edificacao text`, `cota_base numeric`, `cota_topo numeric`
4. Criar RPC `upsert_iptu_logradouro_resumo` (SECURITY DEFINER) para upsert com ON CONFLICT (logradouro, bairro, tipologia)
5. Atualizar RPC `upsert_lote_pal` para aceitar novos campos (`p_objectid_origem`, `p_paa`, `p_tipo_parcelamento`, `p_situacao`) e fazer ON CONFLICT por `objectid_origem`
6. Atualizar RPC `upsert_edificacao_geo` para aceitar novos campos (`p_cod_lote`, `p_tipo_edificacao`, `p_cota_base`, `p_cota_topo`)

### Edge Function 1: `ingest-iptu-prefeitura` (reescrita total)

- Busca 3 layers (4, 5, 6) com paginacao
- Campos reais: `cl`, `nome_completo`, `nome`, `tipologia`, `tot_imoveis`, `areaconst_res`
- Filtro: `nome LIKE '%${bairro}%'`
- `returnGeometry: false`
- Upsert em `iptu_logradouro_resumo` via nova RPC
- `etl_log.fonte = 'iptu_prefeitura_agregado'`
- Retorna contadores por layer

### Edge Function 2: `ingest-lotes-pal` (reescrita total)

- URL: `CadParcel/GeoPAL/MapServer/1/query`
- Body aceita `bbox` array (default Barra)
- Spatial query com bounding box (sem filtro por bairro)
- Campos: `objectid`, `num_projeto`, `paa`, `tipo_parcelamento`, `situacao`
- Upsert por `objectid_origem` via RPC atualizada
- Polygon geometry convertida via PostGIS

### Edge Function 3: `ingest-edificacoes-geo` (reescrita total)

- URL: `CadLog/Edificacoes_2019/MapServer/0/query`
- Campos: `objectid`, `altura`, `cod_lote`, `tipo`, `base`, `topo`
- `andares_estimados = GREATEST(1, ROUND(altura / 3))`
- Centroid calculado no JS, geom salva via RPC
- `etl_log.fonte = 'edificacoes_geo_2019'`

### Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/ingest-iptu-prefeitura/index.ts` | Reescrever |
| `supabase/functions/ingest-lotes-pal/index.ts` | Reescrever |
| `supabase/functions/ingest-edificacoes-geo/index.ts` | Reescrever |
| Nova migration SQL | Colunas + RPCs atualizadas |

Nenhuma tabela sera criada ou dropada. Apenas ADD COLUMN IF NOT EXISTS e CREATE OR REPLACE FUNCTION.

