## Plano: Implementar recomendações 1–5 do diagnóstico ITBI

### 1. Investigar Nov/2025 e Mar–Abr/2026 (auditoria de fonte)
- Rodar queries comparando volume por `created_at` (data da carga) vs `data_transacao` para identificar se os picos são reprocessamento retroativo da Prefeitura ou cargas legítimas.
- Gerar relatório em `/mnt/documents/itbi-auditoria-picos.md` com:
  - Distribuição de `created_at` para transações de Nov/2025
  - Distribuição de `created_at` para transações de Mar–Abr/2026
  - Lista de bairros com variação >100% YoY no período
- **Entrega**: relatório markdown — sem mudança de código.

### 2. Geocodificação retroativa (89% sem geom)
- Criar componente admin `RetroGeocodingPanel` em `src/components/territorial/` com:
  - Stats: total sem `geom`, agrupado por bairro (top 10)
  - Botão "Geocodificar lote" que chama a edge function existente `geocodificar-itbi-transactions` com `{ bairro, limite: 500 }` em loop até `completo: true`
  - Barra de progresso e log em tempo real via `etl_log`
- Adicionar tab "Geocodificação ITBI" no `TerritorialAdmin.tsx`
- Priorizar bairros: Copacabana, Recreio, Tijuca, Centro, Barra da Tijuca
- A edge function já existe e está pronta — apenas UI nova.

### 3. Badge "Dados em consolidação" (últimos 90 dias)
- Criar `src/components/DadosConsolidacaoBadge.tsx` — badge amarelo com tooltip explicando que ITBI dos últimos 90 dias pode sofrer reprocessamento pela Prefeitura.
- Renderizar nos seguintes pontos quando o período analisado intersecta `now() - 90 days`:
  - `DashboardKPIs.tsx`
  - `EvolutionChart.tsx`
  - `MicrobairroEvolutionChart.tsx`
  - Relatórios de avaliação (`valuationPdfExport.ts` — nota textual no rodapé)

### 4. Auditoria do bairro "BARRA OLÍMPICA"
- Query para listar as 171 transações de BARRA OLÍMPICA (logradouros, datas, valores).
- Comparar com microbairros já mapeados ("Jacarepaguá / Curicica / Camorim / Recreio dos Bandeirantes").
- Migration para reclassificar registros: `UPDATE itbi_transactions SET bairro = 'JACAREPAGUÁ' WHERE bairro = 'BARRA OLÍMPICA'` (ou outro bairro oficial após validação dos logradouros).
- Adicionar entrada em `logradouros_normalizacao` para evitar reaparição em cargas futuras.

### 5. Manter backup 7 dias + agendar limpeza
- Criar arquivo `.lovable/backup-itbi-cleanup.md` documentando:
  - Data do backup: 21/05/2026
  - Linhas no backup: 32.378 (pré-dedupe)
  - Data sugerida para remoção: 28/05/2026
  - Comando SQL: `DROP TABLE itbi_transactions_backup_pre_dedupe`
- Sem ação automática — apenas registro para acompanhamento manual.

### Ordem de execução
1. Recomendação 1 (auditoria, read-only) → relatório
2. Recomendação 4 (auditoria + migration BARRA OLÍMPICA)
3. Recomendação 3 (badge "Dados em consolidação")
4. Recomendação 2 (UI de geocodificação retroativa)
5. Recomendação 5 (documentação de limpeza)

### Detalhes técnicos
- Nenhuma nova edge function — reaproveita `geocodificar-itbi-transactions`
- 1 migration apenas (reclassificação BARRA OLÍMPICA)
- 2 componentes novos: `RetroGeocodingPanel`, `DadosConsolidacaoBadge`
- Sem mudança em RLS ou estrutura de tabelas
- Custo Google Maps API: ~25k geocodificações × $5/1000 = ~$125 (uma vez)

Confirma para eu prosseguir?