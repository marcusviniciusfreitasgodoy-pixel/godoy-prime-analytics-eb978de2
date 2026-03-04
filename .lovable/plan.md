

## Plan: Create `process-condominios-algorithm` Edge Function + 3 RPCs

### Summary

Create one new Edge Function that orchestrates 3 PostgreSQL RPC functions. All heavy spatial logic runs server-side in PostGIS to avoid Edge Function timeouts.

### Database Migration — 3 RPC Functions

**Important corrections** to the user-provided SQL (adapting to actual schema):

1. **`itbi_transactions` has no `geom` column** — Step 2 must match by `logradouro` text instead of `ST_DWithin`. Columns are `area_m2` and `valor_transacao` (not `area`/`valor`), and `data_transacao` is the date field.

2. **`condominios_mapeamento` requires `nome_condominio TEXT NOT NULL`** — Step 1 INSERT must generate a name (e.g. `'Condomínio ' || lote.logradouro || ' #' || lote.numero`).

3. **`logradouro_padrao` is also NOT NULL** — must be populated from lote or nearest IPTU logradouro.

4. **Step 1 IPTU proximity query has a bug** — it compares a point to itself via `ST_DWithin`. Will fix to compare lote centroid against `iptu_logradouro_resumo.geom` (LineString geometry).

5. **`geom_lote` type is `geometry(Geometry, 4326)`** not strict Polygon — no issue, MultiPolygon from lotes_pal will work.

#### RPC 1: `identificar_condominios_pal()`
- Loops through `lotes_pal`
- Counts `edificacoes_geo` within each lote via `ST_Within`
- Fetches nearest `iptu_logradouro_resumo` data via `ST_DWithin` on the resumo's `geom`
- Filters out single-building small lots
- Either enriches existing manual condominios (within ~30m) or inserts new ones with `fonte_identificacao = 'algoritmo_pal'`
- Inserts towers into `torres_condominios` linking edificacoes to condominios

#### RPC 2: `enriquecer_condominios_com_itbi()`
- Joins `condominios_mapeamento` to `itbi_transactions` by matching `logradouro_padrao` to `logradouro` (text match, since ITBI has no geometry)
- Updates `total_transacoes_itbi`, `preco_medio_m2`, `ultima_transacao_itbi`

#### RPC 3: `atualizar_resumo_logradouros()`
- Cross-references `iptu_logradouro_resumo` with `itbi_transactions` by logradouro name
- Updates `preco_real_medio_itbi`, `total_transacoes_itbi`, `desconto_venal_percentual`

### Edge Function: `supabase/functions/process-condominios-algorithm/index.ts`

- Auth: admin-only (same pattern as other ETL functions)
- Accepts `{ bairro, modo, limpar_algoritmo }`
- If `limpar_algoritmo = true`: deletes from `condominios_mapeamento` WHERE `fonte_identificacao IN ('algoritmo_pal', 'algoritmo_dbscan')` and truncates `torres_condominios` for those condominios
- Calls RPCs sequentially: `identificar_condominios_pal` → `enriquecer_condominios_com_itbi` → `atualizar_resumo_logradouros`
- Logs to `etl_log`
- Returns combined results

### Config

Add to `supabase/config.toml`:
```toml
[functions.process-condominios-algorithm]
verify_jwt = false
```

### Files Changed

| File | Action |
|---|---|
| `supabase/functions/process-condominios-algorithm/index.ts` | **Create** — orchestrator |
| Migration SQL | **Create** — 3 RPC functions |
| `supabase/config.toml` | **Update** — add function entry |

No other files or tables modified.

