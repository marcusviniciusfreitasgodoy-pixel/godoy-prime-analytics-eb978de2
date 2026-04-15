

## Plano: Busca reversa Google Places para coordenada -23.0040, -43.3661

### Objetivo
Identificar o nome comercial do empreendimento associado ao código cadastral PAA 12019 / PAL 46627 usando a coordenada válida na Península (Barra da Tijuca).

### Execução

1. **Reverse Geocoding** — Invocar a Google Geocoding API (`latlng=-23.0040,-43.3661`) via Edge Function `reverse-geocode-condominios` ou chamada direta no sandbox usando a chave `GOOGLE_MAPS_API_KEY` já configurada.

2. **Nearby Search (Places)** — Complementar com busca Places API (New) `searchNearby` no raio de 200m para capturar o nome comercial do empreendimento (condomínios residenciais nem sempre aparecem no reverse geocoding).

3. **Cruzamento com base** — Comparar o resultado com `condominios_mapeamento` para verificar se o empreendimento já está cadastrado e vincular o código PAA 12019 ao nome real.

4. **Relatório** — Apresentar o nome identificado, endereço formatado e recomendação de atualização nos 58 registros ITBI.

### Detalhes técnicos
- Chamadas via `code--exec` usando `curl` com a chave do Supabase secret `GOOGLE_MAPS_API_KEY`
- Endpoint: `https://maps.googleapis.com/maps/api/geocode/json?latlng=-23.0040,-43.3661&key=...&language=pt-BR`
- Endpoint Places: `https://places.googleapis.com/v1/places:searchNearby` com `locationRestriction.circle` de 200m
- Nenhuma alteração de código — apenas consultas de dados

