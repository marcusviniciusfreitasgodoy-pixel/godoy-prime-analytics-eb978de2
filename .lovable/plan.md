

## Problema identificado

O seletor inteligente de condomínio (com autocomplete e busca de ruas internas) **só aparece quando o tipo "Casa em Condomínio" está selecionado**. Porém, o campo "Tipo de Imóvel" fica no **segundo card** (Características Físicas), enquanto o campo "Nome do Condomínio" fica no **primeiro card** (Dados do Imóvel). O usuário preenche o endereço antes de escolher o tipo, e por isso vê apenas o campo de texto livre.

Além disso, condomínios não são exclusivos de casas — apartamentos em condomínios fechados (ex: Península, Santa Marina) também têm ruas internas que devem ser buscadas.

## Plano

### 1. Mover "Tipo de Imóvel" para o primeiro card, antes do logradouro

Em `Step0Identification.tsx`, reordenar os campos do card "Dados do Imóvel" para:
1. Bairro
2. **Tipo de Imóvel** (movido do segundo card)
3. Logradouro
4. Número / Complemento
5. Nome do Condomínio (com seletor inteligente)

Isso garante que o tipo esteja definido antes do usuário chegar ao campo de condomínio.

### 2. Expandir o CondominioSelector para mais tipos de imóvel

Trocar a condição `tipoImovel === "Casa em Condomínio"` por uma lista mais ampla que inclua também Apartamento e Cobertura — qualquer imóvel pode estar em um condomínio com ruas internas. A lógica será:
- **Todos os tipos**: mostrar o CondominioSelector com autocomplete (busca na base `condominios_mapeamento`)
- Quando um condomínio é selecionado, suas `ruas_internas` alimentam a busca ITBI expandida no Step 1

### 3. Ajustar o card "Características Físicas"

Remover o campo "Tipo de Imóvel" deste card (já que foi movido para cima), mantendo apenas Área, Andar/Terreno, Quartos, Suítes, etc.

### Arquivos alterados

- `src/components/valuation/Step0Identification.tsx` — reordenar campos e expandir condição do CondominioSelector

Nenhuma alteração de banco de dados necessária.

