

## Plan: Sequência Final do Módulo Territorial

Three work items: validate the algorithm fix, create a new edge function for logradouro geocoding, and implement 4 P2 frontend/backend improvements.

---

### Item 1 -- Validar process-condominios-algorithm

Cannot run the edge function directly from plan mode. Once approved, I will invoke `process-condominios-algorithm` via the edge function curl tool, then query `etl_log` to verify Step 2 completed with `status = 'success'` and report the batch results.

---

### Item 2 -- Edge Function enrich-logradouros-geo

Create `supabase/functions/enrich-logradouros-geo/index.ts`:

- Auth: validate JWT + admin role check
- Logic:
  1. Query `iptu_logradouro_resumo` for logradouros in Barra without a match in `logradouros_geo` (using `logradouro_norm` comparison), limited by `body.limite` (default 100)
  2. For each, call Google Geocoding API (`GOOGLE_GEOCODING_API_KEY` secret) with address `"{logradouro}, Barra da Tijuca, Rio de Janeiro, RJ, Brasil"`
  3. Upsert results into `logradouros_geo` with `hierarquia = 'GOOGLE'`
  4. Return `{ geocodificados, erros, pendentes }`
- Rate limit: 100ms delay between Google calls
- Config: add `[functions.enrich-logradouros-geo] verify_jwt = false` to `supabase/config.toml`

No schema migration needed -- `logradouros_geo` already has the required columns (`logradouro`, `bairro`, `hierarquia`, `latitude`, `longitude`, `last_sync`). The `hierarquia` column serves the same purpose as `fonte`.

After creating the function, add a button "Enriquecer Logradouros" to `TerritorialAdmin.tsx` ACTIONS array.

---

### Item 3 -- P2 Features (4 changes)

**P2.1 -- Lotes PAL toggle on map**

- Add `useLotesPALBbox` hook in `useTerritorialData.ts`: queries `lotes_pal` via `ST_AsGeoJSON` RPC or direct query filtered by bbox, limit 200, only when zoom >= 15
- Need a new RPC `get_lotes_pal_bbox` (migration) since direct PostGIS queries via the JS client won't work for spatial filters
- In `TerritorialMap.tsx`: add state for lotes toggle, load lotes via hook when active + zoom >= 15, render as `L.geoJSON` layer with blue outline style. Show "zoom in" tooltip when zoom < 15.

**P2.2 -- Real heatmap with leaflet.heat**

- Load `leaflet.heat` via CDN (same pattern as Leaflet itself) to avoid npm dependency issues with Deno-style imports
- In `TerritorialMap.tsx`: when `showHeatmap` is true, create `L.heatLayer` with intensity based on `unidades_estimadas`, remove regular markers. Store heatLayer ref for cleanup.

**P2.3 -- Collapsible detail panel**

- In `InteligenciaTerritorial.tsx`: add `isCollapsed` state
- When collapsed: render a 40px-wide vertical bar with `ChevronLeft` icon and truncated condo name
- When expanded: current 360px panel
- Keep X button for full close (deselect condo)

**P2.4 -- Dynamic admin coverage cards**

- Migration: create RPC `get_coverage_stats()` returning counts from `edificacoes_geo`, `lotes_pal`, `iptu_logradouro_resumo`, `condominios_mapeamento`
- In `useTerritorialData.ts`: add `useCoverageStats` hook
- In `TerritorialAdmin.tsx`: replace hardcoded values with hook data, add 2 extra cards (com logradouro, com ITBI)

### Files to create/edit

| File | Action |
|---|---|
| `supabase/functions/enrich-logradouros-geo/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| `supabase/migrations/...` | RPC `get_lotes_pal_bbox` + `get_coverage_stats` |
| `src/hooks/useTerritorialData.ts` | Add `useLotesPALBbox`, `useCoverageStats` |
| `src/components/territorial/TerritorialMap.tsx` | Lotes layer, real heatmap |
| `src/components/territorial/TerritorialAdmin.tsx` | Dynamic cards, enrich button |
| `src/components/territorial/CondominioDetailPanel.tsx` | No changes needed |
| `src/pages/InteligenciaTerritorial.tsx` | Collapsible panel logic |

