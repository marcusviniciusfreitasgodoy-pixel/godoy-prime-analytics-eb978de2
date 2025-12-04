import jsPDF from 'jspdf';
import type { ValuationResult, CombinedPrices } from './valuationCalculations';
import type { ValuationState } from '@/components/valuation/ValuationEngine';

export function exportValuationEnginePDF(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Header
  doc.setFillColor(12, 35, 64); // Navy
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME ANALYTICS', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Avaliação Imobiliária', pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 38, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  // Localização
  let yPos = 60;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text('📍 Localização', 20, yPos);
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(state.logradouro || 'Não informado', 20, yPos);
  
  if (state.bairro) {
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Bairro: ${state.bairro}`, 20, yPos);
  }

  // Dados do Imóvel
  yPos += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text('🏠 Dados do Imóvel', 20, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const propertyData = [
    ['Área', `${state.area_m2} m²`],
    ['Base de Preço', state.baseSelected === 'min' ? 'Conservador' : 
                      state.baseSelected === 'max' ? 'Otimista' : 
                      state.baseSelected === 'custom' ? 'Personalizado' : 'Mediana'],
    ['Status Documentação', getDocStatusLabel(state.docStatus)],
  ];

  propertyData.forEach((item, idx) => {
    const currentY = yPos + idx * 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`${item[0]}:`, 25, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(item[1], 80, currentY);
  });

  // Referência de Mercado
  if (combined) {
    yPos += 35;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 35, 64);
    doc.text('📊 Referência de Mercado', 20, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const marketData = [
      ['Preço Mínimo/m²', `R$ ${combined.min_m2.toLocaleString('pt-BR')}`],
      ['Preço Médio/m²', `R$ ${combined.med_m2.toLocaleString('pt-BR')}`],
      ['Preço Máximo/m²', `R$ ${combined.max_m2.toLocaleString('pt-BR')}`],
      ['Tendência', `${combined.trend_direction === 'UP' ? '↑' : combined.trend_direction === 'DOWN' ? '↓' : '→'} ${combined.trend_percentage > 0 ? '+' : ''}${combined.trend_percentage.toFixed(1)}%`],
    ];

    marketData.forEach((item, idx) => {
      const currentY = yPos + idx * 7;
      doc.setFont('helvetica', 'bold');
      doc.text(`${item[0]}:`, 25, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(item[1], 80, currentY);
    });
  }

  // Resultado da Avaliação - Box destacado
  yPos = combined ? yPos + 40 : yPos + 30;
  doc.setFillColor(212, 175, 55, 0.15);
  doc.setDrawColor(212, 175, 55);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 55, 3, 3, 'FD');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text('💰 Resultado da Avaliação', pageWidth / 2, yPos + 5, { align: 'center' });

  yPos += 18;
  doc.setFontSize(28);
  doc.setTextColor(212, 175, 55);
  doc.text(formatCurrency(result.provavel), pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Valor Provável de Mercado', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Pessimista: ${formatCurrency(result.pessimista)}`, 40, yPos);
  doc.text(`Otimista: ${formatCurrency(result.otimista)}`, pageWidth - 40, yPos, { align: 'right' });

  // Métricas de Confiança
  yPos += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text('📈 Métricas de Confiança', 20, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const confidenceLabel = result.confidence_level === 'green' ? 'ALTA' :
                          result.confidence_level === 'yellow_high' ? 'MÉDIA-ALTA' :
                          result.confidence_level === 'yellow_medium' ? 'MÉDIA' : 'BAIXA';
  
  const metrics = [
    ['Ajuste Total', `${result.total_adjustment >= 0 ? '+' : ''}${(result.total_adjustment * 100).toFixed(1)}%`],
    ['Spread', `${result.spread_percentage.toFixed(1)}%`],
    ['Score de Confiança', `${result.confidence_score}/100`],
    ['Nível de Confiança', confidenceLabel],
  ];

  metrics.forEach((item, idx) => {
    const currentY = yPos + idx * 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`${item[0]}:`, 25, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(item[1], 80, currentY);
  });

  // Características Aplicadas
  const appliedChars = state.responses.filter(r => r.response === 'sim' && r.weight_applied !== 0);
  if (appliedChars.length > 0) {
    yPos += 40;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 35, 64);
    doc.text('✅ Características Aplicadas', 20, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const charTexts = appliedChars.map(r => 
      `${r.char_code.replace(/_/g, ' ')} (${r.weight_applied > 0 ? '+' : ''}${(r.weight_applied * 100).toFixed(0)}%)`
    );
    
    const charLine = charTexts.join(' • ');
    const splitChars = doc.splitTextToSize(charLine, pageWidth - 40);
    doc.text(splitChars, 20, yPos);
    yPos += splitChars.length * 5;
  }

  // Recomendação
  yPos = Math.max(yPos + 10, 220);
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 35, 3, 3, 'F');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text(`🎯 ${result.recommendation.title}`, 20, yPos + 5);

  yPos += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const splitRec = doc.splitTextToSize(result.recommendation.message, pageWidth - 45);
  doc.text(splitRec, 20, yPos);

  // Estratégia de Preço
  const listPrice = Math.round(result.provavel * 1.05);
  yPos += 30;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text('💼 Estratégia de Preço Sugerida', 20, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const priceStrategy = [
    ['Anunciar por', formatCurrency(listPrice)],
    ['Valor Target', formatCurrency(result.provavel)],
    ['Mínimo Aceitável', formatCurrency(result.pessimista)],
  ];

  priceStrategy.forEach((item, idx) => {
    const currentY = yPos + idx * 6;
    doc.text(`${item[0]}:`, 25, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], 80, currentY);
    doc.setFont('helvetica', 'normal');
  });

  // Disclaimer
  yPos = 268;
  doc.setFillColor(255, 250, 240);
  doc.rect(15, yPos - 3, pageWidth - 30, 18, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('AVISO LEGAL', 20, yPos);
  
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const disclaimer = 'Este relatório é uma estimativa baseada em dados públicos de transações ITBI da Prefeitura do Rio de Janeiro. Não substitui laudo de avaliação profissional (PTAM - NBR 14653-2). Os valores são indicativos e devem ser validados por um corretor ou avaliador credenciado.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
  doc.text(splitDisclaimer, 20, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Godoy Prime Realty - Analytics Dashboard', pageWidth / 2, 290, { align: 'center' });
  doc.text('www.godoyprime.com.br | CRECI 11841 - PJ', pageWidth / 2, 295, { align: 'center' });

  // Save
  const filename = `avaliacao_${state.logradouro?.replace(/\s+/g, '_').substring(0, 25) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function getDocStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'OK': 'Documentação OK',
    'IPTU_PENDENCIA': 'Pendência IPTU',
    'CONDOMINIO_DEBITO': 'Débito Condominial',
    'USUFRUTO': 'Restrição Usufruto',
    'PENHORA_INVENTARIO': 'Penhora/Inventário',
    'INCOMPLETA': 'Documentação Incompleta',
  };
  return labels[status] || status;
}
