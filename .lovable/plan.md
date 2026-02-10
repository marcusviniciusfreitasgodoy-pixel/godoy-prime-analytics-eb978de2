

## Criar Ficha de Visita Diretamente (sem agendamento)

Adicionar um botao "Nova Ficha" na pagina de Visitas e um formulario dedicado para criar fichas de visita diretamente, sem depender de um agendamento previo.

### O que muda para o usuario

- Um novo botao **"Nova Ficha"** aparece ao lado de "Nova Visita" no topo do dashboard
- Ao clicar, abre um formulario com os campos necessarios para criar a ficha:
  - Nome do visitante, telefone, email, CPF
  - Endereco do imovel, codigo do imovel
  - Nome do proprietario, valor do imovel
  - Corretor responsavel (select com lista de corretores via RPC)
  - Data/hora da visita
  - Notas adicionais
- Apos salvar, redireciona para a aba "Fichas" com a nova ficha visivel
- O codigo da ficha (`VIS-XXXXX`) e gerado automaticamente

### Secao Tecnica

**Arquivo novo: `src/pages/NovaFichaVisita.tsx`**
- Formulario completo usando `react-hook-form` + `zod` para validacao
- Usa o hook `useCorretores` para popular o select de corretores
- Usa `useVisitas().createFicha` para salvar
- Gera codigo automatico `VIS-{timestamp}`
- Apos sucesso, navega para `/visitas` na aba "fichas"

**Arquivo modificado: `src/pages/Visitas.tsx`**
- Adicionar botao "Nova Ficha" com icone `FilePlus` ao lado dos botoes existentes
- `onClick` navega para `/visitas/nova-ficha`

**Arquivo modificado: `src/App.tsx`**
- Adicionar rota `/visitas/nova-ficha` apontando para `NovaFichaVisita`

**Campos do formulario:**

| Campo | Obrigatorio | Tipo |
|---|---|---|
| Nome do visitante | Sim | texto |
| Telefone | Sim | texto |
| Email | Nao | email |
| CPF | Sim | texto |
| Endereco do imovel | Sim | texto |
| Codigo do imovel | Nao | texto |
| Nome do proprietario | Sim | texto |
| Valor do imovel | Nao | moeda |
| Corretor responsavel | Sim | select (lista RPC) |
| Data/hora da visita | Sim | datetime |
| Notas | Nao | textarea |

