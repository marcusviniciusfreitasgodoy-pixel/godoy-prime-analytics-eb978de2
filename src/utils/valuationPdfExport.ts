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

  const isSimplified = state.tipoAvaliacao === "simples";
  const reportTitle = isSimplified 
    ? 'Avaliação Imobiliária Simplificada' 
    : 'Relatório de Avaliação Imobiliária';

  // Header
  let yPos = drawGodoyHeader(doc, reportTitle);

  // AVISO DE AVALIAÇÃO SIMPLIFICADA
  if (isSimplified) {
    yPos += 5;
    
    // Box de aviso amarelo/laranja
    doc.setFillColor(255, 243, 205); // Amarelo claro
    doc.setDrawColor(255, 193, 7); // Amarelo
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 50, 2, 2, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(133, 100, 4); // Marrom/amarelo escuro
    doc.text('⚠️ AVALIAÇÃO SIMPLIFICADA', marginLeft, yPos + 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 77, 3);
    
    const disclaimerText = [
      'Este relatório apresenta uma estimativa de valor baseada em:',
      '• Dados ITBI de transações reais (últimos 12 meses)',
      '• Características declaradas do imóvel',
      '• Análise estatística de mercado',
      '',
      'IMPORTANTE: Para uma avaliação mais assertiva e próxima da realidade de mercado,',
      'recomenda-se complementar com a Vistoria Digital, que pode ajustar o valor em',
      'até ±15% com base nas condições reais verificadas in loco.',
    ];
    
    disclaimerText.forEach((line, index) => {
      doc.text(line, marginLeft, yPos + 12 + (index * 4));
    });
    
    yPos += 55;
  }

  // 1. IDENTIFICAÇÃO DO IMÓVEL
  yPos = drawSectionTitle(doc, 'Identificação do Imóvel', yPos, marginLeft);
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.darkGray);
  
  const endereco = [
    state.logradouro,
    state.numero ? `nº ${state.numero}` : '',
    state.complemento,
  ].filter(Boolean).join(', ');
  
  const identificationData = [
    ['Endereço:', endereco || 'Não informado'],
    ['Bairro:', state.bairro || 'Não informado'],
    ['Condomínio:', state.nomeCondominio || '-'],
    ['Tipo:', state.tipoImovel || 'Não informado'],
  ];

  identificationData.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    const textValue = doc.splitTextToSize(item[1], contentWidth - 55);
    doc.text(textValue, marginLeft + 50, yPos);
    yPos += textValue.length > 1 ? 10 : 6;
  });

  // Características físicas em linha
  yPos += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const caracteristicas = [
    `Área: ${state.area_m2} m²`,
    state.quartos ? `${state.quartos} quartos` : null,
    state.suites ? `${state.suites} suítes` : null,
    state.banheiros ? `${state.banheiros} banheiros` : null,
    state.vagas ? `${state.vagas} vagas` : null,
    state.andar ? `Andar: ${state.andar}` : null,
  ].filter(Boolean).join(' | ');
  doc.text(caracteristicas, marginLeft + 5, yPos);
  yPos += 8;

  // Proprietário (se informado)
  if (state.proprietario) {
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`Proprietário: ${state.proprietario}${state.telefone ? ` | Tel: ${state.telefone}` : ''}`, marginLeft + 5, yPos);
    yPos += 6;
  }

  // Data da avaliação
  if (state.dataAvaliacao) {
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.gray);
    const dataFormatada = new Date(state.dataAvaliacao + 'T00:00:00').toLocaleDateString('pt-BR');
    doc.text(`Data da Avaliação: ${dataFormatada}`, marginLeft + 5, yPos);
    yPos += 6;
  }

  // 2. REFERÊNCIA DE MERCADO
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

  // 3. RESULTADO DA AVALIAÇÃO - Box destacado
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

  // 4. MÉTRICAS DE CONFIANÇA
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

  // 5. CARACTERÍSTICAS APLICADAS
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

  // 6. ESTRATÉGIA DE PREÇO
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

  // 7. RECOMENDAÇÃO
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

  // 8. DISCLAIMER ADICIONAL PARA AVALIAÇÃO SIMPLIFICADA
  if (isSimplified) {
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 35, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('PARA MAIOR PRECISÃO:', marginLeft, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const vistoriaInfo = [
      'A Vistoria Digital analisa 21 categorias detalhadas incluindo:',
      '• Instalações elétricas e hidráulicas • Acabamentos e materiais',
      '• Estrutura e fundações • Climatização e segurança',
      'Realize a vistoria completa para uma avaliação mais assertiva.',
    ];
    vistoriaInfo.forEach((line, i) => {
      doc.text(line, marginLeft, yPos + 12 + (i * 4));
    });
    
    yPos += 40;
  }

  // 9. DISCLAIMER PADRÃO
  drawDisclaimer(doc, yPos, marginLeft);

  // Apply footers to all pages
  applyFootersToAllPages(doc);

  // Save
  const tipoSuffix = isSimplified ? '_simplificada' : '';
  const filename = `avaliacao${tipoSuffix}_${state.logradouro?.replace(/\s+/g, '_').substring(0, 25) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
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
