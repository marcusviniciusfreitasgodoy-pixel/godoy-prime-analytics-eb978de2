

## Plan: Fix `identificar_condominios_pal()` RPC — Invalid Geometry Handling

### Problem
The RPC `identificar_condominios_pal()` fails with:
```
GEOSContains: TopologyException: side location conflict at -43.294... -22.993...
This can occur if the input geometry is invalid.
```

Some `lotes_pal` geometries are invalid (self-intersections, topology issues). `ST_Within` requires valid geometries.

### Fix
Create a new migration that replaces the function, wrapping all `ST_Within` calls with `ST_MakeValid()`:

**File:** New migration SQL

1. Replace `ST_Within(geom, lote.geom)` → `ST_Within(e.geom, ST_MakeValid(lote.geom))`  (3 occurrences in the function)
2. Add `ST_IsValid(ST_MakeValid(lote.geom))` check at the top of the loop to skip truly broken geometries
3. Same fix in the torres INSERT query

No other changes. The Edge Function and RPCs 2/3 are unaffected.

### Expected Outcome
After deploying this fix, re-running the function should complete successfully and return the expected numbers.

