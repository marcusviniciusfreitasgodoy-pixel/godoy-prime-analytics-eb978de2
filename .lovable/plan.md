

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

### Próximos passos
- Criar Edge Functions ETL para importação de dados IPTU/GeoCarioca
- Criar páginas e componentes do módulo de Inteligência Territorial
