## Objetivo

Adicionar, dentro do editor de Parecer Técnico, a possibilidade de **buscar uma avaliação já realizada** e usá-la para pré-preencher o parecer — sem precisar sair do módulo e voltar pelo Histórico.

## Onde aparece

No topo do editor `/parecer-tecnico/novo` (e também no editor de um parecer existente, para permitir “trocar/mesclar” dados), adicionar um botão **"Importar de avaliação existente"** ao lado dos botões Salvar / Exportar PDF.

Ao clicar, abre um **Dialog (modal)** com:

- Campo de busca (endereço, bairro, cliente)
- Lista das avaliações do usuário (ou de toda a organização se admin), ordenadas por data desc, com: endereço, bairro, área, valor de mercado, data
- Botão “Usar esta avaliação” por linha

## Comportamento

1. Ao selecionar uma avaliação, chama o `prefillFromAvaliacao(id)` já existente.
2. Faz **merge** com o parecer atual:
   - Se o campo estiver vazio no parecer → recebe o valor da avaliação.
   - Se já houver conteúdo digitado pelo usuário → **pergunta antes** (confirm dialog) se deseja sobrescrever.
3. Toast de sucesso “Dados da avaliação importados”.
4. Fecha o modal e mantém o usuário no editor.

Se a rota já veio com `?avaliacaoId=` (fluxo do Histórico), o comportamento atual permanece — a busca é só um caminho adicional.

## Arquivos

- **Novo** `src/components/parecer/ImportarAvaliacaoDialog.tsx`
  - Reusa `supabase.from("valuations").select(...).order("created_at", desc).limit(5000)`
  - Filtra client-side por termo de busca (endereço/bairro/cliente)
  - RLS já garante isolamento por organização
- **Editar** `src/pages/ParecerTecnicoEditor.tsx`
  - Estado `importOpen`
  - Botão “Importar de avaliação” no header
  - Handler `handleImport(id)` → `prefillFromAvaliacao` + merge + toast

## Fora do escopo

- Não altera schema, RLS, storage nem lógica do PDF.
- Não altera `prefillFromAvaliacao` (reutilizado como está).
- Não mexe no botão “Parecer” já existente no `HistoricoAvaliacoes`.
