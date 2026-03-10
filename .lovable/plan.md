

## Plano: Adicionar botão "Enriquecer Condomínios (Google Places)" na aba Admin

### Problema
Não existe botão na UI para executar a edge function `enrich-condominios`, que busca coordenadas, endereço e `google_place_id` dos condomínios via Google Places API.

### Alteração

**Arquivo:** `src/components/territorial/TerritorialAdmin.tsx`

Adicionar uma nova entrada no array `ACTIONS`:

```typescript
{ label: "Enriquecer Condomínios", fn: "enrich-condominios", icon: MapPin },
```

Isso adicionará um botão na aba Admin que invoca a edge function `enrich-condominios` com o mesmo padrão dos demais botões (loading state, toast de resultado).

### Fluxo pós-importação atualizado

1. **Importar** (aba Enriquecimento IA → Importar)
2. **Enriquecer Condomínios** (aba Admin — botão novo) → coordenadas + endereço
3. **Resolver Endereços Pendentes** (aba Admin) → endereços faltantes
4. **Classificação IA** (aba Enriquecimento IA) → padrão construtivo
5. **Rodar Algoritmo** (aba Admin) → cruzamento ITBI + KPIs

