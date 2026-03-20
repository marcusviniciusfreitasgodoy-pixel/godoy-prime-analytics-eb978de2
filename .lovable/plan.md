
Objetivo: adicionar exportação em PDF para os resultados da aba Transações na página Pesquisa de Mercado, com botão visível ao lado do botão de exportação já usado no fluxo atual.

1. Ajuste de comportamento
- Incluir um handler `exportTransactionResultsPDF` em `src/pages/PesquisasMercado.tsx`.
- Reaproveitar `exportToPDF` de `src/utils/exportUtils.ts` para gerar o relatório com:
  - filtros aplicados
  - resumo estatístico
  - ranking por logradouro exibido na tela
- Manter a mesma validação dos outros exports: se não houver busca/resultados, mostrar aviso.

2. Conteúdo do PDF
- Exportar a mesma base já usada no CSV/XLSX da aba Transações:
  - Logradouro
  - Total de Transações
  - Preço Médio R$/m²
- Incluir no resumo:
  - total de logradouros
  - total de transações
  - bairro
  - período
  - tipologia
  - condomínio, quando houver
  - filtros de valor/área/m² e “Apenas transações individuais”, se ativos

3. Ajuste visual na tela
- Trocar o fluxo atual de exportação da aba Transações por ações mais explícitas na área de resultados.
- Inserir um botão de PDF ao lado do botão de CSV, como você pediu.
- Preservar o padrão visual já existente com `Button`, ícone e estados consistentes.

4. Arquivos envolvidos
- `src/pages/PesquisasMercado.tsx`
  - importar `exportToPDF`
  - criar handler de PDF
  - ajustar a área de ações/exportação
- `src/components/SearchTools.tsx`
  - aplicar o mesmo padrão se eu quiser manter consistência do componente reutilizável em outros fluxos
- `src/utils/exportUtils.ts`
  - só entra se eu precisar ampliar formatação do PDF para refletir melhor os dados do ranking

5. Observação técnica
- Hoje o projeto já tem utilitário genérico de PDF pronto, então a implementação tende a ser pequena e sem impacto no backend.
- Como o PDF atual limita colunas e linhas, vou configurar a exportação pensando no ranking da tela de Transações, que já cabe bem no layout existente.

6. Resultado esperado
- Na aba Transações de Pesquisa de Mercado, o usuário poderá gerar PDF diretamente a partir dos resultados em tela.
- O PDF ficará alinhado com os filtros aplicados e com os números apresentados na busca.
- CSV, Excel e PDF ficarão consistentes entre si.

7. Validação prevista
- Fazer uma busca real na aba Transações e conferir que o botão PDF aparece ao lado do botão solicitado.
- Validar geração do arquivo com e sem condomínio selecionado.
- Conferir se os totais e filtros do PDF batem com a tela.
- Testar exportação fim a fim para garantir que o botão, download e conteúdo funcionam corretamente.
