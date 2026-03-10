

## Plano: Limpar logs de erro históricos do reverse_geocoding

### Diagnóstico
- Havia **2 condomínios** com coordenadas + endereço pendente que falhavam na API do Google repetidamente
- O loop do "Resolver Endereços Pendentes" reprocessava esses mesmos 2 registros a cada 2 segundos, gerando dezenas de entradas de erro no etl_log
- Esses registros **já não existem mais** — os logs são resíduos históricos

### Correções

**1. Limpar logs de erro antigos** — Migration SQL para deletar as entradas de erro do reverse_geocoding

**2. Prevenir loops infinitos no futuro** — Alterar `supabase/functions/reverse-geocode-condominios/index.ts`:
- Quando um registro falha por motivo diferente de `ZERO_RESULTS` (ex: erro de rede, API key), marcar com um rótulo específico ("Geocodificação reversa falhou") para que não seja reprocessado infinitamente
- Adicionar um limite máximo de iterações no loop do `TerritorialAdmin.tsx` (ex: máximo 20 chamadas)

### Arquivos alterados
- `supabase/functions/reverse-geocode-condominios/index.ts` — marcar falhas genéricas para evitar reprocessamento
- `src/components/territorial/TerritorialAdmin.tsx` — limitar iterações do loop

