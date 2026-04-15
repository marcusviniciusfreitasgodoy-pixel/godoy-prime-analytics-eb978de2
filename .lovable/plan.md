

# Enriquecer 542 registros manuais sem dados

## Diagnóstico

542 condomínios com `fonte_identificacao = 'manual'` foram importados com apenas nome, logradouro e coordenadas. Faltam:
- `preco_medio_m2` e `total_transacoes_itbi` (join espacial com ITBI)
- `numero_torres` e `unidades_estimadas` (enriquecimento via Google Places ou IA)
- `padrao_construtivo` (classificação IA)

Esses registros aparecem no Ranking com traços em todas as colunas, como os "Americas 02–15".

## Solução em duas frentes

### Frente 1 — Enriquecimento ITBI automático (prioridade)
**Ação:** Executar a RPC `enriquecer_condominios_com_itbi` que já existe, que faz o join espacial (150m) entre as coordenadas dos condomínios e as transações ITBI, preenchendo `preco_medio_m2`, `total_transacoes_itbi` e `ultima_transacao_itbi`.

- Isso pode ser disparado pela aba Admin do Territorial (botão "Processar Algoritmo")
- Mas atualmente o pipeline limpa registros de algoritmo antes de rodar — precisa de ajuste para **não limpar** os manuais e apenas enriquecer

**Arquivo:** `supabase/functions/process-condominios-algorithm/index.ts`
- Adicionar um modo `enrich_only` que pula as etapas de identificação (PAL/DBSCAN) e limpeza, e roda apenas o `enriquecer_condominios_com_itbi` nos registros que ainda não têm dados ITBI

### Frente 2 — Botão dedicado na aba Admin para enriquecer manuais
**Arquivo:** `src/components/territorial/TerritorialAdmin.tsx`
- Adicionar botão "Enriquecer Registros Manuais" que chama a Edge Function no modo `enrich_only`
- Mostrar progresso e resultado (quantos foram enriquecidos com ITBI)

### Frente 3 — Ocultar registros completamente vazios do Ranking
**Arquivo:** `src/components/territorial/TerritorialRanking.tsx`
- No modo default ("Com preço"), já filtra registros sem preço — verificar se funciona corretamente
- Adicionar indicador visual para registros com dados parciais (ex: tem torres mas não tem preço)

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/process-condominios-algorithm/index.ts` | Modo `enrich_only` para rodar apenas ITBI sem limpar |
| `src/components/territorial/TerritorialAdmin.tsx` | Botão "Enriquecer Manuais" |
| `src/components/territorial/TerritorialRanking.tsx` | Melhorar filtro default para esconder vazios |

