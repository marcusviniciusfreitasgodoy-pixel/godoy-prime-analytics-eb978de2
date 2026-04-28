## Adicionar botão "Visualizar Formulário" em cada aba

Adicionar um botão ao lado de "Nova Seção" (em cada uma das 4 abas: Ficha de Visita, Feedback Cliente, Feedback Corretor, Proposta de Compra) que abre um modal com o **preview do formulário ativo** exatamente como o usuário final vê.

### O que será implementado

1. **Novo componente `FormPreviewDialog.tsx`** (em `src/components/forms/`):
   - Dialog em tela cheia (max-w-3xl, scroll interno).
   - Recebe `tipoFormulario`, lê seções e campos via `useFormConfig`.
   - Renderiza apenas seções com campos ativos, ordenadas por `display_order`.
   - Reutiliza `DynamicFieldRenderer` para cada campo (estado local apenas para visualização — sem persistência).
   - Para Proposta de Compra: inclui seletor "Simplificado / Completo" no topo (igual ao `ProposalForm`), filtrando campos por `modelos`.
   - Mostra badge "Pré-visualização — campos não são salvos" no header.
   - Mostra contagem: "X seções • Y campos visíveis".

2. **Atualização em `ConfigurarFormularios.tsx`**:
   - Adicionar botão `Visualizar` (ícone `Eye`, variant `outline`) ao lado de "Nova Seção" no header de cada `FormConfigTab`.
   - Estado local `previewOpen` para controlar o dialog.
   - Desabilitar botão se não houver nenhuma seção configurada.

### Detalhes técnicos

- Reutilizar `useFormConfig(tipoFormulario)` (já carregado na aba) — passar `data` por prop para evitar nova query.
- Para Proposta: usar mesma lógica de filtro já existente em `ProposalForm.tsx` (campos sem `modelos` ou `modelos.length === 0` aparecem em ambos).
- Dialog não submete nada; botão de rodapé é apenas "Fechar".
- Campos `is_locked` e `is_required` exibem seus indicadores normalmente (já tratado pelo `DynamicFieldRenderer`).

### Arquivos afetados

- **Novo**: `src/components/forms/FormPreviewDialog.tsx`
- **Editado**: `src/pages/ConfigurarFormularios.tsx` (botão + estado + import)