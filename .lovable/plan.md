
User quer adicionar aviso legal sobre a análise de documentos ser apenas uma ferramenta auxiliar, não substituindo consulta a advogado/especialista. Vou adicionar em locais estratégicos do DocumentAnalyzer e da página de Histórico.

## Plano: Aviso Legal sobre Análise de Documentos

### Onde adicionar

1. **`src/components/DocumentAnalyzer.tsx`** — banner persistente no topo do componente (usando `Alert` com ícone de escudo/aviso) informando que a análise é auxiliar e não substitui parecer jurídico.

2. **`src/components/DocumentAnalyzer.tsx`** — rodapé/disclaimer compacto dentro de cada card de resultado de análise, reforçando o aviso ao lado das recomendações da IA.

3. **`src/pages/HistoricoDocumentos.tsx`** — banner no topo da página de histórico e dentro do modal de detalhes da análise.

### Conteúdo do aviso (texto único reutilizável)

> **Importante:** Esta análise é gerada por inteligência artificial e tem caráter **meramente auxiliar e informativo**. Os resultados não substituem a avaliação de um **advogado, despachante imobiliário ou especialista em transações imobiliárias**. Sempre consulte um profissional habilitado antes de tomar qualquer decisão sobre compra, venda ou regularização de imóveis.

### Formato visual

- Componente `Alert` (variant default) com ícone `ShieldAlert` ou `Scale` (lucide-react)
- Cor de destaque suave (amber/yellow) para chamar atenção sem alarmar
- Texto curto e direto no banner principal; versão compacta nos cards/modais

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/DocumentAnalyzer.tsx` | Banner no topo + disclaimer compacto em cada card de resultado |
| `src/pages/HistoricoDocumentos.tsx` | Banner no topo da listagem + aviso no modal de detalhes |

Sem mudanças de banco, lógica ou Edge Functions — apenas UI/copy.
