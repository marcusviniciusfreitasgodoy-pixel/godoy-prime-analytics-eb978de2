

## Plano: Adicionar envio de Proposta de Compra na Ficha de Visita

### O que será feito
Adicionar um novo card na coluna lateral da página de Ficha de Visita (`FichaVisitaPage.tsx`) com opções para enviar o formulário de proposta ao cliente — pré-preenchido com os dados do imóvel/visitante ou em branco.

### Alterações

#### 1. `src/pages/FichaVisitaPage.tsx`
- Adicionar novo card "Proposta de Compra" na coluna lateral, após o card de Feedback
- **Link pré-preenchido**: gera URL `/proposta/{codigo}` usando o código da ficha (já busca dados via RPC `get_ficha_by_codigo`)
- **Link em branco**: gera URL `/proposta/novo` (formulário vazio)
- Botões: "Copiar Link Pré-preenchido", "Copiar Link em Branco", "Abrir" (ExternalLink)
- Exibir contador de propostas já recebidas (usando `usePropostas.getPropostasByFicha`)
- Ícone: `FileSignature` ou `HandCoins`

#### 2. `src/pages/PropostaPublica.tsx`
- Ajustar para funcionar sem código (rota `/proposta/novo`) — exibe formulário em branco quando `codigo` não corresponde a uma ficha existente

#### 3. `src/App.tsx`
- Verificar se rota `/proposta/:codigo` já cobre o caso "novo" (já existe, apenas garantir que `PropostaPublica` trata `codigo = "novo"` corretamente)

### Detalhes técnicos
- O link pré-preenchido usa o código da ficha: a página `PropostaPublica` já faz RPC para buscar dados e preencher o formulário
- O link em branco usa `/proposta/novo` — a página detecta que não há ficha e exibe formulário vazio
- Nenhuma migration necessária — usa infraestrutura existente

### Arquivo afetado
- `src/pages/FichaVisitaPage.tsx` (novo card na sidebar)
- `src/pages/PropostaPublica.tsx` (ajuste menor para código "novo")

