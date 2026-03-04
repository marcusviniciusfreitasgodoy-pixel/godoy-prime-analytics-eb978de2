

## Inteligencia Territorial — Schema criado ✅

### Tabelas criadas/expandidas

1. **condominios_mapeamento** — 15 colunas novas (geom, torres, IPTU, ITBI aggregates) + índice GIST
2. **iptu_imoveis** — Registros brutos IPTU prefeitura + 4 índices + RLS (SELECT público)
3. **edificacoes_geo** — Footprints edificações GeoCarioca + GIST + RLS
4. **lotes_pal** — Lotes PAL + GIST + RLS
5. **torres_condominios** — Torres vinculadas a condominios + edificacoes (FKs) + RLS
6. **iptu_logradouro_resumo** — Resumo agregado por logradouro + RLS
7. **etl_log** — Log de ingestões ETL (admin-only via has_role)
8. **proprietarios_multiplos** — Fase 2: multi-proprietários (admin-only via has_role)

### Correções aplicadas
- RLS de etl_log e proprietarios_multiplos usa `has_role(auth.uid(), 'admin'::app_role)` em vez de profiles.role
- PostGIS habilitado via `CREATE EXTENSION IF NOT EXISTS postgis`
- `spatial_ref_sys` sem RLS é esperado (tabela de sistema PostGIS)

## Edge Functions ETL — Criadas ✅

### RPCs PostGIS (SECURITY DEFINER)
- `upsert_iptu_imovel()` — Upsert com ST_MakePoint para pontos
- `update_iptu_geom()` — Update geom de geocodificação Google
- `upsert_lote_pal()` — Upsert com ST_GeomFromGeoJSON para polígonos
- `upsert_edificacao_geo()` — Upsert com polígono + centroid

### Unique constraints adicionados
- `iptu_imoveis.inscricao_municipal`
- `lotes_pal.num_contribuinte`
- `edificacoes_geo.objectid_origem`

### Edge Functions
1. **ingest-iptu-prefeitura** — ArcGIS IPTU/MapServer/5 → iptu_imoveis (paginação 1000, delay 300ms)
2. **geocodificar-iptu-google** — Google Geocoding → update iptu_imoveis sem coordenadas (delay 50ms)
3. **ingest-lotes-pal** — ArcGIS Cartografia/Lotes/MapServer/0 → lotes_pal (polígonos)
4. **ingest-edificacoes-geo** — ArcGIS Cartografia/Edificacoes/MapServer/0 → edificacoes_geo (bbox Barra)

### Próximos passos
- Criar páginas e componentes do módulo de Inteligência Territorial
- Criar função SQL para agregar dados em iptu_logradouro_resumo
