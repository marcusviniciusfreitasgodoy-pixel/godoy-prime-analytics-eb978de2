

# Recomendação: Carregar todos os condomínios do bairro (Opção 1)

## Por que esta é a melhor abordagem

A Barra da Tijuca é **um único bairro**. O usuário espera ver o panorama completo ao abrir o módulo — não um recorte arbitrário baseado no zoom do mapa. Os problemas atuais (confusão com números parciais, impressão de dados incompletos) são causados diretamente pela lógica de viewport (bbox).

**Argumentos técnicos:**
- 1.349 markers com clustering ativo é perfeitamente suportado pelo Google Maps (clustering já está implementado para zoom < 14)
- Elimina a dependência do viewport — KPIs e lista são sempre consistentes
- Remove a complexidade do `useCondominiosBbox` e seus re-fetches a cada pan/zoom

**Argumentos de UX:**
- O corretor abre a página e vê **tudo**: 1.349 condomínios, 354 com ITBI, preço médio real do bairro
- Filtros (busca, unidades, ITBI) reduzem progressivamente — comportamento intuitivo
- Sem surpresas ao dar zoom ou mover o mapa

## Implementação

### 1. Novo hook: `useCondominiosBairro`
**Arquivo:** `src/hooks/useTerritorialData.ts`
- Criar hook que busca **todos** os condomínios ativos com coordenadas, sem depender de bounds
- Query simples: `SELECT * FROM condominios_mapeamento WHERE ativo = true AND latitude IS NOT NULL ORDER BY preco_medio_m2 DESC NULLS LAST LIMIT 2000`
- Substituir `useCondominiosBbox` na página territorial

### 2. Simplificar a página
**Arquivo:** `src/pages/InteligenciaTerritorial.tsx`
- Remover state `bounds` e callback `handleBoundsChange`
- Usar `useCondominiosBairro()` em vez de `useCondominiosBbox(bounds)`
- O mapa continua reportando bounds/zoom para controlar lotes (que SÃO viewport-dependent por serem pesados)

### 3. Mapa: remover dependência de bounds para condos
**Arquivo:** `src/components/territorial/TerritorialMap.tsx`
- `onBoundsChange` continua existindo apenas para controlar a camada de lotes
- Markers de condomínios vêm da prop `condominios` (já filtrada pelo sidebar)

### 4. KPIs continuam reativos aos filtros
**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`
- Sem alteração — os KPIs já calculam a partir de `filtered`, que agora será o subconjunto dos 1.349 totais

## Resultado

| Antes | Depois |
|-------|--------|
| ~300-1000 condos dependendo do zoom | 1.349 condos sempre visíveis |
| KPIs mudam ao mover o mapa (confuso) | KPIs mudam apenas com filtros (intuitivo) |
| Busca "Oswaldo Paes" pode dar 0 se fora do viewport | Busca sempre encontra se existe no bairro |

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useTerritorialData.ts` | Novo hook `useCondominiosBairro` (query direta sem bbox) |
| `src/pages/InteligenciaTerritorial.tsx` | Usar novo hook, remover state `bounds` para condos |
| `src/components/territorial/TerritorialMap.tsx` | Manter `onBoundsChange` apenas para lotes |

