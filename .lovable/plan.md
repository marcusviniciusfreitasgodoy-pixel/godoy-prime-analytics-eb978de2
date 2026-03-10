

## Plano: Adicionar tooltips nos botões da aba Admin

### Alteração

**Arquivo:** `src/components/territorial/TerritorialAdmin.tsx`

1. Importar `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` de `@/components/ui/tooltip`
2. Adicionar campo `tooltip` ao array `ACTIONS` com descrição de cada botão:
   - **Ingestão IPTU** → "Importa dados de IPTU da prefeitura para a base territorial"
   - **Ingestão Lotes** → "Carrega polígonos de lotes do PAL (Plano de Alinhamento)"
   - **Ingestão Edificações** → "Importa dados de edificações georreferenciadas"
   - **Rodar Algoritmo** → "Cruza dados de ITBI, IPTU e edificações para calcular KPIs dos condomínios"
   - **Geocodificar ITBI** → "Adiciona coordenadas geográficas às transações ITBI"
   - **Enriquecer Logradouros** → "Busca dados geográficos e complementares para logradouros"
   - **Enriquecer Condomínios (Google Places)** → "Busca coordenadas, endereço e Google Place ID via Google Places API"
   - **Exportar CSV** → "Exporta todos os condomínios ativos para um arquivo CSV"
   - **Resolver Endereços Pendentes** → "Usa geocodificação reversa para identificar endereços de condomínios com coordenadas"

3. Envolver cada botão com `<Tooltip>` + `<TooltipTrigger>` + `<TooltipContent>`

### Escopo
- Apenas UI — sem alteração de lógica ou backend

