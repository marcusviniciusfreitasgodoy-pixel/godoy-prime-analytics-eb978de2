

# Corrigir rótulo "Área (m²)" e adicionar tooltips na tabela de Torres

## Problema

A coluna "Área (m²)" na tabela de Torres exibe `area_footprint` — a área da projeção da torre no solo (footprint). O rótulo atual sugere erroneamente que é a área total construída, causando confusão.

## Solução

No `CondominioDetailPanel.tsx`, fazer 2 ajustes:

1. **Renomear** a coluna de "Área (m²)" para **"Projeção (m²)"**
2. **Adicionar tooltip** no cabeçalho explicando: "Área da projeção da torre no solo (footprint). A área construída total é aproximadamente este valor × número de andares."

Opcionalmente, adicionar uma coluna calculada **"Área total est."** = `area_footprint × andares` para dar a informação que o usuário realmente procura.

## Alteração

| Arquivo | O que muda |
|---------|-----------|
| `src/components/territorial/CondominioDetailPanel.tsx` | Renomear coluna, adicionar tooltip explicativo, adicionar coluna "Área total est." calculada |

