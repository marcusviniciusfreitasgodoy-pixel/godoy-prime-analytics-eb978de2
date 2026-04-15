

## Correção: Marcadores com localização incorreta (Rua Dario Coelho e outros)

### Problema identificado

O marcador de `RUA DARIO COELHO` aparece longe da localização real porque:

1. A rua é interna de 2 condomínios (Barra Premium e Barra First) → marcada como `AMBIGUOUS` → sem match de condomínio
2. No cache `logradouros_geo`, está como `STALE` (coordenada antiga zerada pela migration anterior)
3. No `batch-geocode`, há **345 entradas STALE** competindo por apenas **50 chamadas Google** — as que ficam de fora recebem **coordenadas aleatórias** baseadas no centroide do bairro (linhas 621-635)

Resultado: a maioria dos 345 logradouros STALE aparece em posições aleatórias no mapa.

### Solução (3 partes)

#### 1. Para ruas ambíguas: usar média das coordenadas dos condomínios

Quando um logradouro aparece em múltiplos condomínios, em vez de marcar como `AMBIGUOUS` e ignorar, calcular a **média ponderada** das coordenadas dos condomínios associados. No caso da Rua Dario Coelho, os dois condos (Barra Premium e Barra First) ficam lado a lado — a média será uma posição correta.

**Arquivo:** `supabase/functions/geo-logradouro/index.ts`
- Mudar a lógica de `AMBIGUOUS`: em vez de `condominioMap.set(upper, 'AMBIGUOUS')`, guardar array de coordenadas e depois calcular centroide

#### 2. Para entradas além do limite Google: usar cache existente, não aleatório

Nas linhas 621-635, quando um endereço não consegue slot no Google, em vez de gerar coordenadas aleatórias, usar as coordenadas do cache STALE (que podem ser imprecisas, mas são melhores que random). Só usar fallback aleatório se não houver nenhum cache.

**Arquivo:** `supabase/functions/geo-logradouro/index.ts`
- Alterar o loop de fallback para consultar `cachedMap` antes de gerar random

#### 3. Migration: re-geocodificar STALE em massa via condomínio

Executar uma migration SQL que:
- Para ruas internas de **um único** condomínio: copiar coordenadas do condomínio
- Para ruas internas **compartilhadas**: usar a média das coordenadas dos condos
- Marcar todas como `CONDOMINIO` para que não precisem mais de Google

Isso resolve os 345 STALE de uma vez.

### Resumo das alterações

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/geo-logradouro/index.ts` | Ruas ambíguas usam centroide dos condos; fallback usa cache em vez de random |
| Migration SQL | Batch update de STALE → CONDOMINIO usando média de coordenadas |

### Resultado esperado

- `RUA DARIO COELHO` aparecerá entre Barra Premium e Barra First (posição correta)
- ~345 entradas STALE serão corrigidas na migration
- Futuras ruas ambíguas também serão resolvidas automaticamente

