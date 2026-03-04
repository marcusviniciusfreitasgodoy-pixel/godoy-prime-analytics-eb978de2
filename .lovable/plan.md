

## Plano: Criar 4 Edge Functions ETL para Inteligencia Territorial

### Resumo

Criar 4 Edge Functions Deno que ingerem dados da API ArcGIS da Prefeitura do Rio nas tabelas existentes. Todas requerem autenticacao admin via `has_role()`. Nenhuma tabela sera criada ou alterada.

### Secrets

`GOOGLE_MAPS_API_KEY` ja esta configurado no projeto. Nenhum secret adicional necessario.

### Funcoes a criar

**1. `ingest-iptu-prefeitura`** — Ingere registros IPTU do ArcGIS MapServer/5
- Paginacao com `resultOffset` (loop ate `exceededTransferLimit === false`, max 50 iteracoes)
- Delay 300ms entre requests
- Upsert em `iptu_imoveis` por `inscricao_municipal` em chunks de 500
- Extrai lat/lng de `geometry.x`/`geometry.y`, constroi `geom` via `ST_SetSRID(ST_MakePoint())`
- Registra em `etl_log` (running → success/error)

**2. `geocodificar-iptu-google`** — Geocodifica registros sem coordenadas
- Busca ate `limite` registros onde `geom IS NULL AND bairro = param`
- Chama Google Geocoding API para cada, delay 50ms
- UPDATE com lat/lng/geom e `geocodificado_via = 'google_maps'`

**3. `ingest-lotes-pal`** — Ingere lotes PAL do ArcGIS Cartografia/Lotes/MapServer/0
- Mesma logica de paginacao
- Upsert em `lotes_pal` por `num_contribuinte`
- Converte polygon geometry via `ST_GeomFromGeoJSON()`

**4. `ingest-edificacoes-geo`** — Ingere edificacoes do ArcGIS Cartografia/Edificacoes/MapServer/0
- Bounding box fixo da Barra: xmin=-43.365, ymin=-23.015, xmax=-43.270, ymax=-22.960
- Upsert em `edificacoes_geo` por `objectid_origem`
- Calcula `andares_estimados = FLOOR(altura_max / 3)`
- Calcula centroid para lat/lng

### Padrao comum

Todas seguem o padrao existente em `sync-itbi-prefeitura`:
- CORS headers
- Auth via `getClaims()` + `has_role(uid, 'admin')`
- Service role client para escrita
- `verify_jwt = false` no config.toml (validacao em codigo)
- Uso de `supabase.rpc()` para funcoes PostGIS nos upserts (via SQL raw nao e permitido, entao usaremos inserts diretos com campos lat/lng e triggers ou RPC para geom)

### Nota sobre geometria PostGIS

O cliente Supabase JS nao suporta `ST_SetSRID(ST_MakePoint())` diretamente em inserts. Para resolver:
- Para pontos (iptu, edificacoes): salvar `lat`/`lng` como doubles e criar uma funcao SQL `update_geom_from_latlng()` que popula o campo `geom` em batch
- Para polygons (lotes, edificacoes): salvar o GeoJSON raw em um campo temporario ou chamar uma RPC que faz o `ST_GeomFromGeoJSON()`
- Alternativa: criar uma funcao RPC `upsert_iptu_imovel()` que aceita lat/lng e faz o ST_MakePoint internamente

Vou criar uma RPC helper `upsert_with_geom` para cada tabela via migracao SQL, mantendo a logica limpa.

### Arquivos a criar/editar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/ingest-iptu-prefeitura/index.ts` | Criar |
| `supabase/functions/geocodificar-iptu-google/index.ts` | Criar |
| `supabase/functions/ingest-lotes-pal/index.ts` | Criar |
| `supabase/functions/ingest-edificacoes-geo/index.ts` | Criar |
| `supabase/config.toml` | Adicionar 4 entries com `verify_jwt = false` |
| Migracao SQL | Criar RPCs helper para upsert com geometria PostGIS |

