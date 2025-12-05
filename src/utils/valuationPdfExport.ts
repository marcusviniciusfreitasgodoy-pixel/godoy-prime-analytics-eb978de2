import jsPDF from 'jspdf';
import type { ValuationResult, CombinedPrices } from './valuationCalculations';
import type { ValuationState } from '@/types/valuation';

export function exportValuationEnginePDF(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Header
  doc.setFillColor(12, 35, 64);
  doc.rect(0, 0, pageWidth, 42, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME ANALYTICS', pageWidth / 2, 16, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatorio de Avaliacao Imobiliaria', pageWidth / 2, 26, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 36, { align: 'center' });

  let yPos = 55;

  // Section helper
  const drawSectionTitle = (title: string, y: number): number => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 35, 64);
    doc.text(title.toUpperCase(), marginLeft, y);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y + 2, marginLeft + 60, y + 2);
    return y + 10;
  };

  // 1. LOCALIZACAO
  yPos = drawSectionTitle('Localizacao', yPos);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(state.logradouro || 'Nao informado', marginLeft, yPos);
  
  if (state.bairro) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Bairro: ${state.bairro}`, marginLeft, yPos);
  }

  // 2. DADOS DO IMOVEL
  yPos += 12;
  yPos = drawSectionTitle('Dados do Imovel', yPos);
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  
  const propertyData = [
    ['Area:', `${state.area_m2} m2`],
    ['Base de Preco:', state.baseSelected === 'min' ? 'Conservador' : 
                      state.baseSelected === 'max' ? 'Otimista' : 
                      state.baseSelected === 'custom' ? 'Personalizado' : 'Mediana'],
    ['Documentacao:', getDocStatusLabel(state.docStatus)],
  ];

  propertyData.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], marginLeft + 50, yPos);
    yPos += 6;
  });

  // 3. REFERENCIA DE MERCADO
  if (combined) {
    yPos += 6;
    yPos = drawSectionTitle('Referencia de Mercado', yPos);
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    const marketData = [
      ['Preco Minimo/m2:', `R$ ${combined.min_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Preco Medio/m2:', `R$ ${combined.med_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Preco Maximo/m2:', `R$ ${combined.max_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Tendencia:', `${combined.trend_percentage > 0 ? '+' : ''}${combined.trend_percentage.toFixed(1)}% (${combined.trend_direction === 'UP' ? 'Alta' : combined.trend_direction === 'DOWN' ? 'Baixa' : 'Estavel'})`],
    ];

    marketData.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.text(item[0], marginLeft + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], marginLeft + 50, yPos);
      yPos += 6;
    });
  }

  // 4. RESULTADO DA AVALIACAO - Box destacado
  yPos += 8;
  const resultBoxHeight = 45;
  doc.setFillColor(12, 35, 64);
  doc.roundedRect(marginLeft - 5, yPos - 5, contentWidth + 10, resultBoxHeight, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.text('RESULTADO DA AVALIACAO', pageWidth / 2, yPos + 5, { align: 'center' });

  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(result.provavel), pageWidth / 2, yPos + 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text('Valor Provavel de Mercado', pageWidth / 2, yPos + 28, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Pessimista: ${formatCurrency(result.pessimista)}`, marginLeft + 15, yPos + 38);
  doc.text(`Otimista: ${formatCurrency(result.otimista)}`, pageWidth - marginRight - 15, yPos + 38, { align: 'right' });

  yPos += resultBoxHeight + 10;

  // 5. METRICAS DE CONFIANCA
  yPos = drawSectionTitle('Metricas de Confianca', yPos);
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  const confidenceLabel = result.confidence_level === 'green' ? 'ALTA' :
                          result.confidence_level === 'yellow_high' ? 'MEDIA-ALTA' :
                          result.confidence_level === 'yellow_medium' ? 'MEDIA' : 'BAIXA';
  
  const metrics = [
    ['Ajuste Total:', `${result.total_adjustment >= 0 ? '+' : ''}${(result.total_adjustment * 100).toFixed(1)}%`],
    ['Spread:', `${result.spread_percentage.toFixed(1)}%`],
    ['Score:', `${result.confidence_score}/100`],
    ['Nivel:', confidenceLabel],
  ];

  metrics.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], marginLeft + 50, yPos);
    yPos += 6;
  });

  // 6. CARACTERISTICAS APLICADAS
  const appliedChars = state.responses.filter(r => r.response === 'sim' && r.weight_applied !== 0);
  if (appliedChars.length > 0) {
    yPos += 6;
    yPos = drawSectionTitle('Caracteristicas Aplicadas', yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const charTexts = appliedChars.map(r => 
      `${r.char_code.replace(/_/g, ' ')} (${r.weight_applied > 0 ? '+' : ''}${(r.weight_applied * 100).toFixed(0)}%)`
    );
    
    const charLine = charTexts.join(' | ');
    const splitChars = doc.splitTextToSize(charLine, contentWidth);
    doc.text(splitChars, marginLeft, yPos);
    yPos += splitChars.length * 4 + 4;
  }

  // 7. ESTRATEGIA DE PRECO
  yPos += 4;
  yPos = drawSectionTitle('Estrategia de Preco', yPos);
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  const listPrice = Math.round(result.provavel * 1.05);
  const priceStrategy = [
    ['Anunciar por:', formatCurrency(listPrice), '(margem de negociacao)'],
    ['Valor Target:', formatCurrency(result.provavel), '(expectativa de fechamento)'],
    ['Minimo Aceitavel:', formatCurrency(result.pessimista), '(piso de negociacao)'],
  ];

  priceStrategy.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], marginLeft + 50, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(item[2], marginLeft + 105, yPos);
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    yPos += 7;
  });

  // 8. RECOMENDACAO
  yPos += 6;
  doc.setFillColor(245, 245, 245);
  const recBoxY = yPos - 3;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  
  const recTitle = `RECOMENDACAO: ${result.recommendation.title}`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const splitRec = doc.splitTextToSize(result.recommendation.message, contentWidth - 10);
  const recBoxHeight = 12 + (splitRec.length * 4);
  
  doc.roundedRect(marginLeft - 5, recBoxY, contentWidth + 10, recBoxHeight, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text(recTitle, marginLeft, yPos + 4);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(splitRec, marginLeft, yPos + 12);
  
  yPos += recBoxHeight + 8;

  // Check if we need a new page for disclaimer
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  // 9. DISCLAIMER
  doc.setFillColor(255, 248, 230);
  doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 22, 2, 2, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 80, 0);
  doc.text('AVISO LEGAL', marginLeft, yPos + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 40);
  const disclaimer = 'Este relatorio e uma estimativa baseada em dados publicos de transacoes ITBI da Prefeitura do Rio de Janeiro. Nao substitui laudo de avaliacao profissional (PTAM - NBR 14653-2). Os valores sao indicativos e devem ser validados por um corretor ou avaliador credenciado.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, marginLeft, yPos + 9);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Godoy Prime Realty - Analytics Dashboard', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('www.godoyprime.com.br | CRECI 11841 - PJ', pageWidth / 2, pageHeight - 7, { align: 'center' });

  // Save
  const filename = `avaliacao_${state.logradouro?.replace(/\s+/g, '_').substring(0, 25) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function getDocStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'OK': 'OK',
    'IPTU_PENDENCIA': 'Pendencia IPTU',
    'CONDOMINIO_DEBITO': 'Debito Condominial',
    'USUFRUTO': 'Restricao Usufruto',
    'PENHORA_INVENTARIO': 'Penhora/Inventario',
    'INCOMPLETA': 'Incompleta',
  };
  return labels[status] || status;
}
