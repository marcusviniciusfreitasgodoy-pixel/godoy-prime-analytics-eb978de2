import jsPDF from 'jspdf';
import type { ValuationResult, CombinedPrices } from './valuationCalculations';
import type { ValuationState } from '@/types/valuation';
import {
  BRAND_COLORS,
  drawGodoyHeader,
  drawSectionTitle,
  drawResultBox,
  drawDisclaimer,
  applyFootersToAllPages,
  formatCurrencyPDF,
  getMaxContentY,
} from './pdfTemplate';

export function exportValuationEnginePDF(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const contentWidth = pageWidth - marginLeft * 2;

  // Header
  let yPos = drawGodoyHeader(doc, 'Relatório de Avaliação Imobiliária');

  // 1. LOCALIZAÇÃO
  yPos = drawSectionTitle(doc, 'Localização', yPos, marginLeft);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.darkGray);
  doc.text(state.logradouro || 'Não informado', marginLeft, yPos);
  
  if (state.bairro) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`Bairro: ${state.bairro}`, marginLeft, yPos);
  }

  // 2. DADOS DO IMÓVEL
  yPos += 12;
  yPos = drawSectionTitle(doc, 'Dados do Imóvel', yPos, marginLeft);
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.darkGray);
  
  const propertyData = [
    ['Área:', `${state.area_m2} m²`],
    ['Base de Preço:', state.baseSelected === 'min' ? 'Conservador' : 
                      state.baseSelected === 'max' ? 'Otimista' : 
                      state.baseSelected === 'custom' ? 'Personalizado' : 'Mediana'],
    ['Documentação:', getDocStatusLabel(state.docStatus)],
  ];

  propertyData.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], marginLeft + 50, yPos);
    yPos += 6;
  });

  // 3. REFERÊNCIA DE MERCADO
  if (combined) {
    yPos += 6;
    yPos = drawSectionTitle(doc, 'Referência de Mercado', yPos, marginLeft);
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_COLORS.darkGray);

    const marketData = [
      ['Preço Mínimo/m²:', `R$ ${combined.min_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Preço Médio/m²:', `R$ ${combined.med_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Preço Máximo/m²:', `R$ ${combined.max_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Tendência:', `${combined.trend_percentage > 0 ? '+' : ''}${combined.trend_percentage.toFixed(1)}% (${combined.trend_direction === 'UP' ? 'Alta' : combined.trend_direction === 'DOWN' ? 'Baixa' : 'Estável'})`],
    ];

    marketData.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.text(item[0], marginLeft + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], marginLeft + 50, yPos);
      yPos += 6;
    });
  }

  // 4. RESULTADO DA AVALIAÇÃO - Box destacado
  yPos += 8;
  yPos = drawResultBox(
    doc,
    'RESULTADO DA AVALIAÇÃO',
    formatCurrencyPDF(result.provavel),
    'Valor Provável de Mercado',
    'Pessimista',
    formatCurrencyPDF(result.pessimista),
    'Otimista',
    formatCurrencyPDF(result.otimista),
    yPos,
    marginLeft
  );

  // 5. MÉTRICAS DE CONFIANÇA
  yPos = drawSectionTitle(doc, 'Métricas de Confiança', yPos, marginLeft);
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.darkGray);

  const confidenceLabel = result.confidence_level === 'green' ? 'ALTA' :
                          result.confidence_level === 'yellow_high' ? 'MÉDIA-ALTA' :
                          result.confidence_level === 'yellow_medium' ? 'MÉDIA' : 'BAIXA';
  
  const metrics = [
    ['Ajuste Total:', `${result.total_adjustment >= 0 ? '+' : ''}${(result.total_adjustment * 100).toFixed(1)}%`],
    ['Spread:', `${result.spread_percentage.toFixed(1)}%`],
    ['Score:', `${result.confidence_score}/100`],
    ['Nível:', confidenceLabel],
  ];

  metrics.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], marginLeft + 50, yPos);
    yPos += 6;
  });

  // 6. CARACTERÍSTICAS APLICADAS
  const appliedChars = state.responses.filter(r => r.response === 'sim' && r.weight_applied !== 0);
  if (appliedChars.length > 0) {
    yPos += 6;
    yPos = drawSectionTitle(doc, 'Características Aplicadas', yPos, marginLeft);
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

  // 7. ESTRATÉGIA DE PREÇO
  yPos += 4;
  yPos = drawSectionTitle(doc, 'Estratégia de Preço', yPos, marginLeft);
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.darkGray);

  const listPrice = Math.round(result.provavel * 1.05);
  const priceStrategy = [
    ['Anunciar por:', formatCurrencyPDF(listPrice), '(margem de negociação)'],
    ['Valor Target:', formatCurrencyPDF(result.provavel), '(expectativa de fechamento)'],
    ['Mínimo Aceitável:', formatCurrencyPDF(result.pessimista), '(piso de negociação)'],
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
    doc.setTextColor(...BRAND_COLORS.darkGray);
    yPos += 7;
  });

  // 8. RECOMENDAÇÃO
  yPos += 6;
  doc.setFillColor(...BRAND_COLORS.lightGray);
  const recBoxY = yPos - 3;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const splitRec = doc.splitTextToSize(result.recommendation.message, contentWidth - 10);
  const recBoxHeight = 12 + (splitRec.length * 4);
  
  doc.roundedRect(marginLeft - 5, recBoxY, contentWidth + 10, recBoxHeight, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  const recTitle = `RECOMENDAÇÃO: ${result.recommendation.title}`;
  doc.text(recTitle, marginLeft, yPos + 4);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(splitRec, marginLeft, yPos + 12);
  
  yPos += recBoxHeight + 8;

  // Check if we need a new page for disclaimer
  if (yPos > getMaxContentY() - 30) {
    doc.addPage();
    yPos = 20;
  }

  // 9. DISCLAIMER
  drawDisclaimer(doc, yPos, marginLeft);

  // Apply footers to all pages
  applyFootersToAllPages(doc);

  // Save
  const filename = `avaliacao_${state.logradouro?.replace(/\s+/g, '_').substring(0, 25) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function getDocStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'OK': 'OK',
    'IPTU_PENDENCIA': 'Pendência IPTU',
    'CONDOMINIO_DEBITO': 'Débito Condominial',
    'USUFRUTO': 'Restrição Usufruto',
    'PENHORA_INVENTARIO': 'Penhora/Inventário',
    'INCOMPLETA': 'Incompleta',
  };
  return labels[status] || status;
}
