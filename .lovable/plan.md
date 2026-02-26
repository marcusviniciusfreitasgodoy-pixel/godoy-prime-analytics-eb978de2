

# Adicionar "Apresentacao" ao menu lateral

## Problema
A pagina `/apresentacao` existe como rota no App.tsx mas nao aparece no menu lateral (AppSidebar), impossibilitando o acesso direto pelo usuario logado.

## Solucao

Adicionar o item "Apresentacao" na lista `baseItems` do `src/components/AppSidebar.tsx`, usando o icone `Presentation` do lucide-react.

### Mudancas

**Arquivo: `src/components/AppSidebar.tsx`**
- Importar o icone `Presentation` de `lucide-react`
- Adicionar entrada no array `baseItems`:
  ```ts
  { title: "Apresentação", url: "/apresentacao", icon: Presentation, tourId: "nav-apresentacao" }
  ```
- Posicionar apos "Documentacao" e antes de "Configuracoes" para manter a ordem logica

**Arquivo: `src/components/DemoSidebar.tsx`** (se existir item correspondente)
- Verificar se precisa adicionar o mesmo item no menu do modo demo

### Impacto
- 1 arquivo editado
- Nenhuma mudanca no banco de dados
- Nenhuma dependencia nova

