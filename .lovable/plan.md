

## Plan: Add Geocoding to `itbi_transactions` + Spatial ITBI Enrichment

### Summary
Add geometry columns to `itbi_transactions`, create an Edge Function to geocode records via Google Maps, rewrite `enriquecer_condominios_com_itbi()` to use spatial proximity, and add a status RPC.

### Schema Corrections vs User Request
1. **ITBI columns are `valor_transacao` and `area_m2`** (not `valor`/`area`) — the RPC SQL must use these names.
2. **ITBI data is aggregated** (each row = street-level monthly stats with `total_transacoes` as weight) — `COUNT(t.id)` must be replaced with `SUM(t.total_transacoes)` in the enrichment RPC.
3. **`geom` update via Supabase client** — cannot write PostGIS geometry directly via `.update()`. Will create a small RPC `update_itbi_geom(p_id, p_lat, p_lng)` similar to the existing `update_iptu_geom`.
4. **`numero` column exists** but many ITBI rows won't have meaningful numbers (aggregated data). Geocoding will use `logradouro + bairro` primarily.

### Migration (1 file)

**Step 1 — Add columns + indexes:**
```sql
ALTER TABLE itbi_transactions
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326),
  ADD COLUMN IF NOT EXISTS geocodificado_via text;

CREATE INDEX IF NOT EXISTS idx_itbi_geom ON itbi_transactions USING GIST(geom) WHERE geom IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itbi_geocod_pendente ON itbi_transactions(id) WHERE geom IS NULL AND geocodificado_via IS NULL;
```

**Step 2 — RPC `update_itbi_geom`:**
```sql
CREATE OR REPLACE FUNCTION update_itbi_geom(p_id uuid, p_lat double precision, p_lng double precision)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE itbi_transactions
  SET lat = p_lat, lng = p_lng,
      geom = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
      geocodificado_via = 'google_maps'
  WHERE id = p_id;
$$;
```

**Step 3 — Rewrite `enriquecer_condominios_com_itbi()`:**
- Method 1: Spatial join via `ST_DWithin(c.geom::geography, t.geom::geography, 150)` for geocoded transactions. Uses `SUM(t.total_transacoes)` instead of `COUNT`.
- Method 2: Fallback via `logradouro_norm` for condominios not matched spatially.
- Returns `{ atualizados_via_espacial, atualizados_via_logradouro, total_com_itbi }`.

**Step 4 — RPC `geocodificacao_status(p_bairro text)`:**
Returns `{ total, geocodificados, pendentes, erros, percentual }`.

### Edge Function: `supabase/functions/geocodificar-itbi-transactions/index.ts`

Based on existing `geocodificar-iptu-google` pattern:
- No JWT verification (configured in config.toml), but validates admin role in code
- Accepts `{ bairro, limite?, offset_id? }`
- Fetches pending records (`geom IS NULL AND geocodificado_via IS NULL`)
- Google Geocoding with 50ms delay
- Uses `update_itbi_geom` RPC for PostGIS writes
- Marks errors as `geocodificado_via = 'erro_STATUS'` to avoid retrying
- 75-second timeout guard → returns `parcial: true` with `proximo_offset_id`
- ETL logging

### Config
```toml
[functions.geocodificar-itbi-transactions]
verify_jwt = false
```

### Files Changed

| File | Action |
|---|---|
| New migration SQL | **Create** — columns, indexes, RPCs |
| `supabase/functions/geocodificar-itbi-transactions/index.ts` | **Create** |
| `supabase/config.toml` | **Update** — add function entry |

No UI changes. No other tables modified.

