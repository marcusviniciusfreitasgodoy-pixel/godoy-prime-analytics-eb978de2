

## Correções no PDF de Feedback Individual

### Problemas identificados
1. **Ícones de estrelas quebrados**: O caractere Unicode `★` (linha 88) pode não renderizar corretamente no jsPDF com a fonte Helvetica padrão, aparecendo como caixas pretas ou símbolos corrompidos
2. **Aviso legal inapropriado**: O disclaimer sobre dados da Prefeitura do Rio de Janeiro não se aplica a feedbacks de clientes (linhas 222-224)

### Alterações

**Arquivo: `src/utils/feedbackIndividualPdfExport.ts`**

1. **Corrigir função `drawStars`** (linhas 74-94): Substituir o caractere Unicode `★` por círculos preenchidos desenhados via jsPDF, que são 100% confiáveis em qualquer fonte

2. **Remover chamada do disclaimer** (linhas 222-224): Eliminar o bloco que chama `drawDisclaimer`, mantendo apenas `applyFootersToAllPages`

### Código da correção das estrelas

```typescript
// Substituição do caractere Unicode por círculos desenhados
function drawStars(doc: jsPDF, rating: number, y: number, ml: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.text('Avaliação Geral:', ml, y);
  
  const starX = ml + doc.getTextWidth('Avaliação Geral: ') + 5;
  const starSize = 2.5; // raio do círculo
  
  for (let i = 1; i <= 5; i++) {
    const cx = starX + (i - 1) * 8;
    const cy = y - 1.5;
    
    if (i <= rating) {
      // Estrela preenchida (dourada)
      doc.setFillColor(...BRAND_COLORS.gold);
      doc.circle(cx, cy, starSize, 'F');
      // Borda sutil
      doc.setDrawColor(180, 150, 40);
      doc.setLineWidth(0.3);
      doc.circle(cx, cy, starSize, 'S');
    } else {
      // Estrela vazia (cinza claro)
      doc.setFillColor(220, 220, 220);
      doc.circle(cx, cy, starSize, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.circle(cx, cy, starSize, 'S');
    }
  }
  
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLORS.darkGray);
  doc.text(`(${rating}/5)`, starX + 42, y);
  return y + 8;
}
```

### Arquivo afetado
- `src/utils/feedbackIndividualPdfExport.ts` (2 alterações: estrelas + remoção do disclaimer)

