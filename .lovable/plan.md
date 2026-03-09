

## Limpeza Estrutural da Base de Condomínios

### Dados confirmados

| Classificação | Total | Com ruas_internas |
|---|---|---|
| **Condomínio real** | 210 | 197 (93.8%) |
| **Ruído (séries C/A/Lúcio Costa)** | 298 | 279 |

Os 298 registros de ruído estão concentrados em 3 microbairros: Central (258), Oasis (30), Eixo Lúcio Costa (10).

Após limpeza, sobram **210 condomínios reais** distribuídos por 10 microbairros (com duplicatas de acentuação a normalizar).

### Problemas adicionais detectados

Microbairros duplicados por acentuação:
- "Eixo Americas" (20) + "Eixo Américas" (15) → unificar
- "Peninsula" (19) + "Península" (4) → unificar

### Plano em 3 etapas

#### Etapa 1 — Adicionar flag `ativo` à tabela (migração)

Adicionar coluna `ativo BOOLEAN DEFAULT true` à tabela `condominios_mapeamento`. Mais seguro que deletar — permite reverter e manter histórico.

```sql
ALTER TABLE condominios_mapeamento 
ADD COLUMN ativo boolean NOT NULL DEFAULT true;
```

#### Etapa 2 — Marcar ruído como inativo (operação de dados)

```sql
UPDATE condominios_mapeamento 
SET ativo = false 
WHERE nome_condominio ~ '^Residencial [A-Z][0-9]+$'
   OR nome_condominio ~ '^Lúcio Costa [0-9]'
   OR nome_condominio ~ '^Residencial A [0-9]';
```

Resultado: 298 registros marcados como inativos, 210 ativos.

#### Etapa 3 — Normalizar microbairros duplicados (operação de dados)

```sql
UPDATE condominios_mapeamento 
SET microbairro = 'Eixo Américas' 
WHERE microbairro = 'Eixo Americas';

UPDATE condominios_mapeamento 
SET microbairro = 'Península' 
WHERE microbairro = 'Peninsula';
```

#### Etapa 4 — Atualizar código para filtrar por `ativo = true`

Editar os hooks e componentes que consultam `condominios_mapeamento` para adicionar `.eq('ativo', true)`:

- `src/hooks/useCondominios.ts` — 3 queries
- `src/hooks/useTerritorialData.ts` — queries de ranking e KPIs
- `src/hooks/useCondominiosStats.ts` — estatísticas
- `src/components/territorial/TerritorialAdmin.tsx` — exportação CSV
- `src/components/EnrichCondominiosButton.tsx` — contagem de pendentes

### Resultado final

- **210** condomínios ativos (reais, validados)
- **298** inativos (preservados, recuperáveis)
- Microbairros normalizados (sem duplicatas de acentuação)
- Todas as queries filtram automaticamente por `ativo = true`

