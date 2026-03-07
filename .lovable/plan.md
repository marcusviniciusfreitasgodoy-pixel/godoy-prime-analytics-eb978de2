

## Diagnóstico

O enriquecimento está falhando por **dois motivos**:

### 1. Registros com nome genérico "Condomínio Logradouro não identificado"
Os logs mostram que **todos os 50 registros processados** têm o nome placeholder "Condomínio Logradouro não identificado". O algoritmo `identificar_condominios_pal` criou esses registros quando não conseguiu determinar um nome real. A função de enriquecimento não filtra esses registros, então:
- Busca no Google Places com `"Condomínio Logradouro não identificado, Barra da Tijuca..."` — retorna um resultado genérico
- Encontra 14 ruas internas próximas desse ponto genérico — dados irrelevantes
- Desperdiça 50 chamadas de API do Google por execução

### 2. Timeout da Edge Function
A conexão HTTP fecha antes da resposta completar (`"connection closed before message completed"`). Processar 50 registros sequencialmente, cada um com chamada Google Places + busca de ruas internas, excede o limite de tempo.

## Correção

### Arquivo: `supabase/functions/enrich-condominios/index.ts`

**Filtrar registros com nome genérico** — adicionar filtro na query (linha ~237):

```typescript
// Após .order('nome_condominio') e antes dos filtros condicionais:
query = query.not('nome_condominio', 'ilike', '%Logradouro não identificado%');
query = query.not('nome_condominio', 'ilike', '%não identificado%');
```

**Reduzir limite padrão** de 50 para 20 para evitar timeout:

```typescript
limit = 20 // linha 228
```

### Arquivos alterados
- `supabase/functions/enrich-condominios/index.ts` — filtrar placeholders + reduzir batch size

