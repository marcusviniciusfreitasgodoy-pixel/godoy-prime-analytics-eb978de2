

# Plano: Atualizar Documentacao e Demo com Novas Funcionalidades

## Funcionalidades Implementadas Hoje (a documentar)

1. **Exportacao PDF do Dashboard de Feedbacks Analiticos** - Botoes "Exportar PDF" e "Enviar por Email" no painel de feedbacks de visitas
2. **Modo Demonstracao Completo** - Rota `/demo` com dados ficticios em todos os modulos (Visitas, Avaliacoes, Vistorias, Leads, Feedbacks)
3. **Pagina de Apresentacao** - Landing page profissional em `/apresentacao` para imobiliarias

## Problema Encontrado

O `DemoSidebar.tsx` lista uma rota `/demo/onboarding` mas o `DemoLayout.tsx` nao tem essa rota registrada nas `<Routes>`. Isso precisa ser corrigido.

---

## Arquivos a Editar

### 1. `src/pages/DemoLayout.tsx`
- Adicionar rota `/onboarding` importando `Onboarding` para que o link do sidebar funcione

### 2. `src/pages/ManualPlataforma.tsx`
- Na secao "Agendamento de Visitas" (id: visitas), adicionar feature: "Relatorio PDF de Feedbacks" com descricao sobre exportacao e envio por email
- Adicionar nova secao "Modo Demonstracao" descrevendo o acesso em `/demo` e `/apresentacao`
- Adicionar FAQ: "O que e o modo demonstracao?" e "Como apresentar a plataforma para clientes?"

### 3. `src/utils/manualPdfExport.ts`
- Na secao "10. Agendamento de Visitas", adicionar funcionalidade: "Relatorio PDF de Feedbacks: Exportacao e envio por email do dashboard analitico com KPIs e graficos"
- Adicionar nova secao sobre Modo Demonstracao e Apresentacao
- Adicionar FAQs correspondentes na categoria "Geral"

### 4. `src/utils/quickGuidePdfExport.ts`
- Na secao "8. AGENDA DE VISITAS", adicionar item: "Exporte o relatorio de feedbacks em PDF ou envie por email diretamente"
- Adicionar nova secao "14. MODO DEMONSTRACAO" com instrucoes de acesso em `/apresentacao` e `/demo`

### 5. `src/utils/videoScriptPdfExport.ts`
- No MODULO 7 (Agendamento de Visitas), adicionar narracao sobre o PDF de feedbacks analiticos
- Adicionar MODULO sobre Modo Demonstracao/Apresentacao (antes do encerramento)
- Atualizar lista de modulos na capa

### 6. `src/pages/Apresentacao.tsx`
- Adicionar "Feedback Analitico em PDF" como item nos diferenciais ou na descricao do card de Agendamento de Visitas

---

## Detalhes Tecnicos

Todas as edicoes seguem os padroes existentes de cada arquivo:

- **ManualPlataforma.tsx**: Adicionar objetos ao array `manualSections` seguindo a interface `ManualSection`
- **manualPdfExport.ts**: Adicionar ao objeto `manualContent.modulos` e `manualContent.faq`
- **quickGuidePdfExport.ts**: Adicionar chamadas `drawSection()` com arrays de strings
- **videoScriptPdfExport.ts**: Adicionar chamadas `addTitle()`, `addNarration()`, `addScreenshot()`
- **DemoLayout.tsx**: Importar e adicionar `<Route>` para Onboarding

