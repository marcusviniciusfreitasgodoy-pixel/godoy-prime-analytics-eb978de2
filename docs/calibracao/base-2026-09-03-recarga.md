# Recarga da base em 2026-09-03

- `itbi_transactions` truncada e reimportada em 2026-09-03 entre 15:06 e 15:08 UTC (todos os `created_at` nessa janela; sem registro em `etl_log`).
- Antes: 30.011 linhas / 125.867 escrituras, até 2026-05-15. Depois: 31.472 linhas / 134.555 escrituras, até 2026-07-15.
- `geom`, `lat` e `lng` ficaram 100 % nulos: a geocodificação de 30.011 linhas foi perdida. Mapa, fallback por raio e análise histórica por raio devolvem vazio até o reprocessamento.
- Causa: `sync-itbi-prefeitura` com `clearExisting` apagava as linhas do período antes de reinserir. Corrigido em 2026-09-03 (upsert preservando colunas de geocodificação, varredura posterior de linhas obsoletas por `updated_at`).
- Recuperação: RPC `backfill_itbi_geom_from_logradouros` (sem custo de API, usa `logradouros_geo`) via `geocodificar-itbi-logradouros` com `somente_backfill: true`; depois a etapa Google para as ruas restantes.
- Consultas 7.9, 7.9b e 7.10 não executáveis até a recuperação. Consulta 6 (janela efetiva nas avaliações salvas): 0 linhas, nenhuma avaliação salva desde a janela móvel.
