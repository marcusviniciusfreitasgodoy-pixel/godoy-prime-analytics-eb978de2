

# Por que aparece "Condomínio" antes dos nomes na lista

## Causa raiz

O `algoritmo_pal` (Edge Function `process-condominios-algorithm`) gerou **1.060 dos 1.602** condomínios ativos (66%) com nomes genéricos no formato `"Condomínio " + logradouro`. Exemplos:

- `Condomínio AVN DO PEPE` (na verdade é o logradouro `AVN DO PEPE`)
- `Condomínio RUA OSWALDO PISANI` (na verdade é `RUA OSWALDO PISANI`)
- `Condomínio AVENIDA DAS AMERICAS` (nem é condomínio)

Esses registros não têm nome real de condomínio — o algoritmo simplesmente colou o prefixo "Condomínio" no logradouro como placeholder. Na lista lateral do mapa, a função `getCondoDisplayName()` exibe `nome_condominio` diretamente, sem tratar esse padrão.

## Solução (2 partes)

### Parte 1 — UI: tratar nomes genéricos no display

No `TerritorialFilters.tsx`, na função `getCondoDisplayName()`, adicionar detecção do padrão `"Condomínio " + logradouro` e nesses casos exibir apenas o logradouro formatado (sem o prefixo redundante).

Lógica:
```
Se nome_condominio começa com "Condomínio " E o resto é igual ao logradouro_padrao:
  → exibir apenas logradouro_padrao (com Title Case)
Senão:
  → exibir nome_condominio normal
```

**Arquivo:** `src/components/territorial/TerritorialFilters.tsx` — editar `getCondoDisplayName()`

### Parte 2 — Dados: limpar nomes genéricos no banco

Migration SQL para substituir os 1.060 nomes gerados pelo algoritmo por `NULL`, fazendo o display cair no fallback do logradouro. Isso também permite que futuras execuções do `enrich-condominios` (Google Places) preencham com o nome real.

```sql
UPDATE condominios_mapeamento
SET nome_condominio = NULL
WHERE fonte_identificacao = 'algoritmo_pal'
  AND nome_condominio ILIKE 'Condomínio %'
  AND ativo = true;
```

**Resultado:** Na lista, em vez de "Condomínio AVN DO PEPE" aparecerá apenas "Avenida do Pepê" (com expansão de abreviações e Title Case).

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/components/territorial/TerritorialFilters.tsx` | `getCondoDisplayName()` ignora nomes que são "Condomínio + logradouro" |
| Migration SQL | Limpar 1.060 nomes genéricos → `NULL` |

