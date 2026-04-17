
## Plano: Tooltips em "Vendas" e "Tendência"

Adicionar ícones de ajuda (`HelpCircle`) ao lado dos cabeçalhos **Vendas** e **Tendência** na tabela de Microregiões (`/microbairros`, modo lista), explicando o significado e o período de referência.

### Conteúdo dos tooltips

- **Vendas** → *"Número total de transações ITBI residenciais registradas neste logradouro nos últimos 24 meses (com percentual transferido ≥ 90%)."*
- **Tendência** → *"Classificação de desempenho do logradouro com base na sua posição no ranking de preço/m² dos últimos 24 meses. 'Alta' indica top 3 do bairro; 'Estável' indica desempenho consistente fora do top 3."*

### Arquivo alterado

| Arquivo | Alteração |
|---|---|
| `src/pages/Microbairros.tsx` | Importar `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` e `HelpCircle` da `lucide-react`; envolver os textos "Vendas" e "Tendência" nos `<TableHead>` com um wrapper flex contendo o ícone `?` clicável (hover) |

### Padrão visual

Mesmo padrão já usado em `Documentacao.tsx`: ícone `HelpCircle` pequeno (h-3.5 w-3.5) em `text-muted-foreground`, ao lado do label, dentro de um `Tooltip` do shadcn. Sem mudanças de lógica ou dados.
