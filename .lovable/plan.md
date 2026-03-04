

## Validation Analysis: Inteligência Territorial Module

After reviewing all 8 files, the RPCs, and the data schema, here's my item-by-item prediction and the issues I found that need fixing before testing:

### Issues Found

**Issue 1 — `latitude`/`longitude` are nullable in DB but required in TypeScript interface**
`condominios_mapeamento.latitude` and `longitude` are `number | null` in the DB types, but the `TerritorialCondominio` interface declares them as `number` (non-null). The RPC filters `WHERE latitude IS NOT NULL` so the data is safe, but the type mismatch could cause TypeScript complaints. Minor — no runtime break.

**Issue 2 — `nome_condominio` is `string` (non-null) in DB but treated as potentially null in UI**
The DB schema has `nome_condominio: string` (NOT NULL), but the UI code does `c.nome_condominio || c.logradouro_padrao` as fallback. This is fine — empty strings will still fall through to logradouro. No issue.

**Issue 3 — RPC return type `json` vs client expectation**
All 3 RPCs (`get_condominios_bbox`, `get_condo_itbi_history`, `get_territorial_kpis`) return `json` type. The Supabase client with `as any` cast will receive this as a parsed JSON object. This works correctly — the `as any` on `supabase.rpc()` bypasses TypeScript's strict type checking for unregistered RPCs.

**Issue 4 — `CondominioDetailPanel` navigation URL mismatch**
The panel navigates to `/avaliacao-imobiliaria?logradouro=...` but the original spec says `/avaliacoes/nova?logradouro=...`. This is correct for the existing app since the route is `/avaliacao-imobiliaria`. No issue.

**Issue 5 — Heatmap implementation uses CircleMarker with large radius instead of leaflet.heat**
The spec requested `leaflet.heat` but the implementation uses `CircleMarker` with variable radius/opacity. This is actually better — avoids an extra dependency and works with the existing setup. Functional.

### Checklist Predictions

| # | Test | Expected Result |
|---|------|----------------|
| 1 | Open /inteligencia-territorial | **PASS** — Route registered, component renders |
| 2 | Markers load (~300) | **PASS** — `BoundsTracker` fires on mount, triggers `get_condominios_bbox` RPC |
| 3 | Move map → markers update | **PASS** — `moveend` event triggers `onBoundsChange`, new query fires with 30s staleTime |
| 4 | Zoom out → clusters | **PASS** — `MarkerClusterGroup` wraps non-heatmap markers |
| 5 | Click marker → popup | **PASS** — `CircleMarker` has `Popup` child |
| 6 | "Ver detalhes" → panel | **PASS** — `onSelect` sets state, panel renders when `selectedCondo && detailOpen` |
| 7 | Condo WITH history → chart | **PASS** — `useCondoItbiHistory` calls RPC with lat/lng, chart renders if `chartData.length >= 3` |
| 8 | Condo WITHOUT history → message | **PASS** — Falls through to "Dados insuficientes" message |
| 9 | "Abrir Avaliação" redirect | **PASS** — `navigate()` with logradouro param |
| 10 | Toggle ITBI filter | **PASS** — Filters list only. **NOTE**: Map markers are NOT filtered — the filter only applies to the left-side list, not the map layer |
| 11 | Slider unidades | **PASS** for list. Same caveat — map unaffected |
| 12 | Logradouro autocomplete | **PASS** — `useLogradouroSuggestions` queries `iptu_logradouro_resumo` |
| 13 | Ranking tab | **PASS** — `useCondominiosRanking` fetches top 200 with price |
| 14 | Logradouros tab | **PASS** — Chart + table render from `useTerritorialLogradouros` |
| 15 | Admin tab | **LIKELY PASS** — Requires admin role for `etl_log` RLS. Buttons invoke edge functions. |

### Key Issue: Filters Don't Affect Map Markers

The filters (search, slider, ITBI toggle) only filter the **left-side list**. The map always shows all condominios from the bbox query. This is a design gap — item 10 and 11 partially fail because users expect the map to reflect the filter state.

### Plan to Fix

**1. Pass filtered condominios to the map** — In `InteligenciaTerritorial.tsx`, the `TerritorialFilters` component currently filters internally but doesn't expose the filtered list. Need to:
- Lift filter state up to the page level, OR
- Have `TerritorialFilters` emit filtered results that get passed to `TerritorialMap`

Currently `TerritorialMap` receives `condominios` (all bbox results). It should receive the filtered subset.

**Implementation approach**: Add an `onFilteredChange` callback to `TerritorialFilters` that reports the filtered list. Pass that filtered list to `TerritorialMap` instead of the raw `condominios`.

**2. No other code changes needed** — The RPCs, data hooks, chart rendering, and panel logic all look correct for the real data structure.

### Files to Change

| File | Change |
|---|---|
| `src/components/territorial/TerritorialFilters.tsx` | Add `onFilteredChange` callback, call it when `filtered` changes |
| `src/pages/InteligenciaTerritorial.tsx` | Track filtered condominios state, pass to `TerritorialMap` |

This is a small change — ~15 lines across 2 files.

