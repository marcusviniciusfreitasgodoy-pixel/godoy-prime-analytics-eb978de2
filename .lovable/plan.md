

## Plano: Integrar 4 APIs do Google para melhorar georeferenciamento e dados

### Contexto atual

A plataforma já utiliza duas chaves Google (`GOOGLE_MAPS_API_KEY` e `GOOGLE_GEOCODING_API_KEY`) em 8 Edge Functions, mas de forma fragmentada:

- **Maps JavaScript API** — usada apenas no `TransactionMap.tsx` (mapa de transações). O mapa territorial usa **Leaflet** (gratuito).
- **Geocoding API** — usada em 5 funções para converter endereços em coordenadas e vice-versa.
- **Places API (legacy)** — usada apenas no `enrich-condominios` com `findplacefromtext` para buscar lat/lng e place_id.
- **Places API (New)** — não utilizada ainda.

### Como cada API pode melhorar o sistema

| API | Uso atual | Melhoria proposta |
|-----|-----------|-------------------|
| **Maps JavaScript API** | Mapa de transações apenas | Migrar mapa territorial de Leaflet para Google Maps (clustering nativo, Street View, melhor visual) |
| **Geocoding API** | Geocodificação fragmentada com 2 chaves | Consolidar para usar uma única chave; melhorar expansão de abreviações antes da chamada |
| **Places API (legacy)** | `findplacefromtext` básico | Substituir pela Places API (New) |
| **Places API (New)** | Não usada | Usar `searchText` e `Place Details` para obter dados ricos: tipo do imóvel, fotos, horários, reviews, e `addressComponents` estruturados |

### Alterações propostas

#### 1. Consolidar chaves Google em uma única secret
- Verificar se `GOOGLE_MAPS_API_KEY` já tem as 4 APIs habilitadas no Google Cloud Console (o usuário precisa confirmar)
- Atualizar as 3 funções que usam `GOOGLE_GEOCODING_API_KEY` para usar `GOOGLE_MAPS_API_KEY` como fallback primário
- Simplificar a gestão de secrets

#### 2. Migrar `enrich-condominios` para Places API (New)
**Arquivo:** `supabase/functions/enrich-condominios/index.ts`
- Substituir `findplacefromtext` (legacy) por `POST https://places.googleapis.com/v1/places:searchText`
- Extrair dados mais ricos: `formattedAddress`, `addressComponents`, `types`, `displayName`, `photos`
- Salvar `types` do Google (ex: `condominium`, `apartment_building`) para classificação automática de tipologia

#### 3. Criar Edge Function `enrich-places-details` para dados avançados
**Novo arquivo:** `supabase/functions/enrich-places-details/index.ts`
- Para condomínios que já têm `google_place_id`, buscar Place Details (New API) com campos: `reviews`, `photos`, `editorialSummary`, `googleMapsUri`
- Salvar URL do Google Maps e resumo editorial na tabela `condominios_mapeamento` (novos campos)
- Permitir execução em lote pelo admin

#### 4. Migrar mapa territorial para Google Maps JavaScript API
**Arquivo:** `src/components/territorial/TerritorialMap.tsx`
- Substituir Leaflet por Google Maps com `MarkerClusterer`
- Adicionar camada de Street View integrada ao painel de detalhe do condomínio
- Manter funcionalidade existente (heatmap, lotes PAL, clustering)

#### 5. Migração de banco — novos campos
```sql
ALTER TABLE condominios_mapeamento 
  ADD COLUMN IF NOT EXISTS google_place_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_maps_uri text,
  ADD COLUMN IF NOT EXISTS google_editorial_summary text,
  ADD COLUMN IF NOT EXISTS google_photos_refs text[] DEFAULT '{}';
```

### Sequência de implementação
1. Consolidar chaves (rápido, sem risco)
2. Migração SQL dos novos campos
3. Atualizar `enrich-condominios` para Places API (New)
4. Criar `enrich-places-details`
5. Migrar mapa territorial para Google Maps (maior mudança visual)

### Pergunta antes de prosseguir
Preciso confirmar: a sua chave `GOOGLE_MAPS_API_KEY` já tem as 4 APIs (Maps JS, Places, Geocoding, Places New) habilitadas no Google Cloud Console? Ou são chaves separadas por API?

