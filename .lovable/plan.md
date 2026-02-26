# Substituir "Corretor" por "Corretor Autônomo" e "Gerente" por "Imobiliária" e substituir termos em ingles, por termos em portugues que facilitem o entendimento

## Alteracoes em 3 arquivos

### 1. `src/components/apresentacao/FunctionalityMapSection.tsx`

Substituir os valores do campo `para` em todos os 10 itens do array `functionalityMap`:


| De                    | Para                               |
| --------------------- | ---------------------------------- |
| `"Corretor, Gerente"` | `"Corretor Autônomo, Imobiliária"` |
| `"Corretor"`          | `"Corretor Autônomo"`              |
| `"Comprador Premium"` | Sem alteracao                      |


### 2. `src/components/apresentacao/PersonasSection.tsx`

Substituir os titulos das personas:


| De                        | Para                  |
| ------------------------- | --------------------- |
| `"Corretor de Luxo"`      | `"Corretor Autônomo"` |
| `"Gerente / Imobiliária"` | `"Imobiliária"`       |


### 3. `src/utils/productOnePagerPdfExport.ts`

Substituir as mesmas referencias no PDF:

- Linha 307: `"Gerente / Imobiliária"` -> `"Imobiliária"`
- Linha 313: `"Corretor de Luxo"` -> `"Corretor Autônomo"`
- Linha 319: `"Corretor de Luxo"` -> `"Corretor Autônomo"`
- Linha 325: `"Corretor de Luxo"` -> `"Corretor Autônomo"`
- Linha 331: `"Gerente / Imobiliária"` -> `"Imobiliária"`
- Linha 411: `"Corretor de Luxo"` -> `"Corretor Autônomo"`
- Linha 412: `"Gerente / Imobiliária"` -> `"Imobiliária"`

Alteracoes puramente textuais, sem mudanca de logica ou layout.