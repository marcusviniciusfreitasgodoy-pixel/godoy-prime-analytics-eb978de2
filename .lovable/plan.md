

## Plan: Fix Torres Duplicates + ITBI Logradouro Matching

### Correction 1: Torres Duplicates

**Current state:** 431,135 torres for ~1,060 condominios (massive duplication from repeated runs).

**Migration 1a** — Delete duplicates, keeping oldest per `(condominio_id, edificacao_id)`:
```sql
DELETE FROM torres_condominios
WHERE id NOT IN (
  SELECT DISTINCT ON (condominio_id, edificacao_id) id
  FROM torres_condominios
  ORDER BY condominio_id, edificacao_id, criado_em ASC
);
```

**Migration 1b** — Add UNIQUE constraint:
```sql
ALTER TABLE torres_condominios
  ADD CONSTRAINT uq_torre_condominio_edificacao
  UNIQUE (condominio_id, edificacao_id);
```

**Migration 1c** — Update `identificar_condominios_pal()` RPC: change `ON CONFLICT DO NOTHING` to `ON CONFLICT ON CONSTRAINT uq_torre_condominio_edificacao DO UPDATE SET ...` (upsert on re-run).

### Correction 2: ITBI Logradouro Matching

**Root cause confirmed:** ITBI uses `AVN DAS AMERICAS`, IPTU uses `Avenida Lucio Costa` — completely different formats.

**Migration 2a** — Create `normalizar_logradouro()` function. Must also handle `AVN` → `AV` (present in ITBI data, not in user's original list).

**Migration 2b** — Add generated `logradouro_norm` columns + indexes on both `iptu_logradouro_resumo` and `itbi_transactions`.

**Migration 2c** — Rewrite `atualizar_resumo_logradouros()` to JOIN on `logradouro_norm`. Column names: `valor_transacao` and `area_m2` (not `valor`/`area`).

**Migration 2d** — Rewrite `enriquecer_condominios_com_itbi()` to also use normalized logradouro matching (since `itbi_transactions` has NO `geom` column — spatial join is impossible). Will match `normalizar_logradouro(c.logradouro_padrao) = t.logradouro_norm`.

### Important Schema Corrections vs User Request
1. `itbi_transactions` has **no `geom` column** — the user's spatial `ST_DWithin` approach for `enriquecer_condominios_com_itbi` cannot work. Will use normalized logradouro text matching instead.
2. ITBI column names are `valor_transacao` and `area_m2` (not `valor`/`area`).
3. ITBI uses `AVN` abbreviation (not just `AV.`) — normalization function must handle this.

### Files Changed

| File | Action |
|---|---|
| New migration SQL (single file with all steps) | **Create** — cleanup + constraint + RPCs + normalization |

### Post-Migration
Re-run `process-condominios-algorithm` to verify corrected numbers.

