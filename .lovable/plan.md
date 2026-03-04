

## Plan: Move RPC calls outside the pagination loop

### Change

**File:** `supabase/functions/ingest-edificacoes-geo/index.ts`

1. **Remove lines 215-221** (RPC calls inside the `while` loop)
2. **Add RPC calls after the loop** (lines 229+), only when ingestion completes fully — i.e., NOT on timeout partial return

### Result

```
while (hasMore) {
  // fetch → transform → upsert
  // NO RPC calls here
  offset += features.length;
}

// Only run PostGIS calculations when all pages are done
try {
  await supabase.rpc('calcular_area_edificacoes_pendentes');
  await supabase.rpc('calcular_centroids_edificacoes_pendentes');
} catch (e) {
  console.error('PostGIS calc error:', e);
}

// Final log + return { completo: true, ... }
```

The timeout path (line 131-144) already returns early with `parcial: true` — no RPC calls will execute there.

