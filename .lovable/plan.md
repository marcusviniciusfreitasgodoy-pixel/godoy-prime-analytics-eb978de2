

## Diagnóstico: Marcadores do mapa com localização incorreta

### Problema identificado

Os logradouros no mapa estão sendo geocodificados individualmente pelo Google como se fossem ruas públicas, mas **muitas dessas ruas são internas de condomínios** (ex: Rua Paulo Areal é rua interna do Condomínio América Mall / Barra Deck). O Google retorna coordenadas genéricas ou imprecisas para essas ruas privadas, causando marcadores agrupados no lugar errado.

**Dados concretos:**
- `RUA PAULO AREAL` geocodificada pelo Google em `-22.9996, -43.3822` (posição genérica)
- O condomínio América Mall (que contém essa rua) está em `-22.9997, -43.3796` — ~250m de diferença
- Na base `logradouros_geo`: 508 entradas na Barra, apenas 149 com geocodificação Google, 359 com fontes menos precisas

### Causa raiz

O `batch-geocode` (Edge Function `geo-logradouro`) envia o nome da rua ao Google sem cruzar com a tabela `condominios_mapeamento`. A tabela de condomínios já tem **coordenadas precisas** e sabe quais ruas são internas (`ruas_internas`), mas essa informação não é usada na geocodificação do mapa.

### Solução proposta

Adicionar uma **camada de enriquecimento por condomínio** no fluxo de geocodificação batch:

1. **Na Edge Function `geo-logradouro` (endpoint `batch-geocode`):**
   - Antes de chamar o Google, consultar `condominios_mapeamento` para verificar se o logradouro aparece como `logradouro_padrao` ou dentro de `ruas_internas` de algum condomínio com coordenadas
   - Se encontrar correspondência, usar as coordenadas do condomínio (latitude/longitude) com `source: 'condominio'` e `aproximado: false`
   - Só recorrer ao Google para ruas que **não** pertencem a nenhum condomínio mapeado

2. **Atualizar o cache `logradouros_geo`:**
   - Marcar entradas corrigidas com `hierarquia: 'CONDOMINIO'` para identificar a fonte
   - Executar uma migration SQL que faça um batch update das ~359 entradas sem Google, cruzando com `condominios_mapeamento`

3. **No frontend `useTransactionMapData.ts`:**
   - Nenhuma alteração necessária — o hook já consome as coordenadas retornadas pelo `batch-geocode`

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/geo-logradouro/index.ts` | Adicionar consulta a `condominios_mapeamento` no `batch-geocode` antes do Google |
| Migration SQL | Update batch de `logradouros_geo` cruzando com coordenadas de condomínios |

### Impacto esperado

- Ruas internas de condomínios passam a aparecer sobre o condomínio correto no mapa
- Redução de chamadas ao Google Geocoding API (economia de quota)
- Marcadores deixam de se aglomerar em posições genéricas

