

## Plano: Exibir logradouro + número quando nome do condomínio é genérico

### Lógica de exibição (prioridade)

1. `nome_condominio` — se existir e **não** contiver "não identificado" / "não cadastrado"
2. `logradouro_padrao` + `numero_inicio` — se existir e não for placeholder ("não cadastrado", "não localizado", "falhou")
3. Coordenadas `📍 lat, lng` — fallback final

### Arquivos alterados

- `src/components/territorial/TerritorialFilters.tsx` — função `CondoRow`, lógica do nome exibido
- `src/components/territorial/CondominioDetailPanel.tsx` — título do painel de detalhes

### Exemplo

Antes: **Condomínio Logradouro não identificado**
Depois: **Av. das Américas, 12500** (ou coordenadas se nem logradouro existir)

