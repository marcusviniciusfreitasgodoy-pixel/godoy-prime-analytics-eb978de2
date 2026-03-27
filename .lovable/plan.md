

# Adicionar Visualização Lista/Card no módulo Microregiões

## Objetivo
Incluir um toggle de visualização (Cards / Lista) na página de Microregiões para facilitar a navegação mobile e a seleção rápida de logradouros para o comparativo.

## Mudanças

### `src/pages/Microbairros.tsx`
1. Adicionar estado `viewMode: 'cards' | 'list'` (default: `'cards'`)
2. No mobile (`useIsMobile`), iniciar como `'list'` por padrão
3. Adicionar `ToggleGroup` ao lado do `BairroSelector` no cabeçalho com ícones `LayoutGrid` (cards) e `List` (lista)
4. Modo **Cards**: manter o grid atual (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
5. Modo **Lista**: renderizar uma tabela compacta com colunas:
   - Rank (#)
   - Nome (displayName com badge de condomínio se aplicável)
   - R$/m² médio
   - Transações
   - R$/m² Apt | Casa
   - Tendência (badge)
   - Botão "+" para adicionar ao comparativo
6. Cada linha da lista é clicável para adicionar ao comparativo, com destaque visual para linhas já selecionadas

### Benefícios
- **Mobile**: lista ocupa menos espaço vertical, permite ver mais logradouros de uma vez e selecionar com um toque
- **Desktop**: mantém a opção de cards visuais para apresentações, com lista disponível para análise rápida

## Detalhes Técnicos
- Importar `useIsMobile` de `@/hooks/use-mobile`
- Importar `ToggleGroup/ToggleGroupItem` e ícones `LayoutGrid`, `List`
- Importar `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` para o modo lista
- Reutilizar a mesma lógica de `displayName` do `MicrobairroCard` (via `extractSimplifiedCode`)
- Botão "+" visível diretamente na linha (sem hover) para facilitar toque mobile

