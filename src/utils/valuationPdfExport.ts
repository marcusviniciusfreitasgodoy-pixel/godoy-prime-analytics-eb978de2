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

// Interface para fontes dos anúncios
export interface AnuncioFonte {
  valor: number;
  area: number;
  fonte?: string;
}

export function exportValuationEnginePDF(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null,
  anuncioFontes?: AnuncioFonte[]
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
    yPos += 3;
    
    // Box de aviso com borda dourada (estilo premium)
    doc.setFillColor(250, 248, 240);
    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 42, 2, 2, 'FD');
    
    // Título da seção
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('AVALIAÇÃO SIMPLIFICADA', marginLeft, yPos + 5);
    
    // Linha dourada sob o título
    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, yPos + 7, marginLeft + 55, yPos + 7);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    const disclaimerText = [
      'Este relatório apresenta uma estimativa baseada em dados oficiais de transações',
      'reais (últimos 12 meses), características declaradas e análise estatística.',
      '',
      'RECOMENDAÇÃO: Complemente com a Vistoria Digital para ajuste de até ±15%',
      'com base nas condições reais verificadas in loco.',
    ];
    
    disclaimerText.forEach((line, index) => {
      doc.text(line, marginLeft, yPos + 14 + (index * 4));
    });
    
    yPos += 47;
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

  // 2. TRANSAÇÕES REALIZADAS NA REGIÃO (Card consolidado ITBI)
  if (state.itbiData) {
    yPos += 6;
    yPos = drawSectionTitle(doc, 'Transações Realizadas na Região', yPos, marginLeft);
    
    // Texto explicativo melhorado
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    const textoExplicativo = 'Para fundamentar esta avaliação, foram identificadas transações de imóveis com características semelhantes, localizados na mesma região do imóvel avaliado, realizadas nos últimos 12 meses e registradas nos órgãos oficiais.';
    const splitTexto = doc.splitTextToSize(textoExplicativo, contentWidth);
    doc.text(splitTexto, marginLeft, yPos);
    yPos += splitTexto.length * 4 + 6;
    
    // Card principal com gradiente azul
    const cardHeight = 38;
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, cardHeight, 3, 3, 'FD');
    
    // Grid de 3 colunas com estatísticas
    const colWidth = (contentWidth + 10) / 3;
    const col1X = marginLeft;
    const col2X = marginLeft + colWidth;
    const col3X = marginLeft + colWidth * 2;
    
    // Separadores verticais sutis
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.3);
    doc.line(col2X - 5, yPos + 2, col2X - 5, yPos + cardHeight - 8);
    doc.line(col3X - 5, yPos + 2, col3X - 5, yPos + cardHeight - 8);
    
    // Coluna 1: Total de transações
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    const transCount = String(state.itbiData.transaction_count);
    doc.text(transCount, col1X + colWidth / 2 - 10, yPos + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('transações', col1X + colWidth / 2 - 14, yPos + 22);
    doc.text('identificadas', col1X + colWidth / 2 - 16, yPos + 28);
    
    // Coluna 2: Valor médio do m²
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    const valorMedM2 = `R$ ${state.itbiData.med_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
    doc.text(valorMedM2, col2X + colWidth / 2 - 20, yPos + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('valor médio', col2X + colWidth / 2 - 14, yPos + 22);
    doc.text('por m²', col2X + colWidth / 2 - 9, yPos + 28);
    
    // Coluna 3: Preço médio total
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    const avgTransaction = state.itbiData.avg_valor_transacao;
    let precoMedio = '-';
    if (avgTransaction) {
      if (avgTransaction >= 1000000) {
        precoMedio = `R$ ${(avgTransaction / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
      } else {
        precoMedio = `R$ ${(avgTransaction / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
      }
    }
    doc.text(precoMedio, col3X + colWidth / 2 - 18, yPos + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('preço médio', col3X + colWidth / 2 - 14, yPos + 22);
    doc.text('total', col3X + colWidth / 2 - 6, yPos + 28);
    
    yPos += cardHeight;
    
    // Fonte com ícone
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Fonte: Guias de ITBI - Secretaria Municipal de Fazenda do Rio de Janeiro', marginLeft, yPos + 4);
    yPos += 12;
  }

  // 3. REFERÊNCIA DE MERCADO (Preços combinados)
  if (combined) {
    yPos += 4;
    yPos = drawSectionTitle(doc, 'Referência de Mercado', yPos, marginLeft);
    
    // Nota explicativa sobre metodologia de ponderação
    const temAnuncios = anuncioFontes && anuncioFontes.length > 0;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...BRAND_COLORS.gray);
    
    const metodologiaTexto = temAnuncios
      ? 'Metodologia: Os valores de referência são calculados com ponderação de 70% dados oficiais (ITBI) e 30% anúncios de mercado, garantindo equilíbrio entre transações reais e preços praticados atualmente.'
      : 'Metodologia: Os valores de referência são calculados exclusivamente com base em dados oficiais de transações (100% ITBI), garantindo máxima objetividade baseada em negócios efetivamente realizados.';
    
    const splitMetodologia = doc.splitTextToSize(metodologiaTexto, contentWidth);
    doc.text(splitMetodologia, marginLeft, yPos);
    yPos += splitMetodologia.length * 4 + 4;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
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
    
    // Fontes dos Anúncios (se disponíveis)
    const fontes = anuncioFontes?.filter(f => f.fonte && f.fonte.trim() !== '') || [];
    if (fontes.length > 0) {
      yPos += 3;
      doc.setFillColor(250, 250, 250);
      const fontesHeight = 8 + (fontes.length * 5);
      doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, fontesHeight, 2, 2, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.navy);
      doc.text('Fontes dos Anúncios de Referência:', marginLeft, yPos + 3);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...BRAND_COLORS.gray);
      
      fontes.forEach((f, i) => {
        const valorM2 = f.valor / f.area;
        const text = `${i + 1}. R$ ${f.valor.toLocaleString('pt-BR')} | ${f.area}m² | R$ ${valorM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m²`;
        doc.text(text, marginLeft, yPos);
        
        // Link em cor azul
        doc.setTextColor(59, 130, 246);
        const linkText = doc.splitTextToSize(f.fonte!, contentWidth - 80);
        doc.text(linkText[0], marginLeft + 65, yPos);
        doc.setTextColor(...BRAND_COLORS.gray);
        
        yPos += 5;
      });
      yPos += 2;
    }
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

  // 4. MÉTRICAS DE CONFIANÇA - Design visual aprimorado
  // Verificar se há espaço suficiente para a seção expandida
  if (yPos > getMaxContentY() - 120) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos = drawSectionTitle(doc, 'Métricas de Confiança', yPos, marginLeft);
  
  const confidenceLabel = result.confidence_level === 'green' ? 'ALTA' :
                          result.confidence_level === 'yellow_high' ? 'MÉDIA-ALTA' :
                          result.confidence_level === 'yellow_medium' ? 'MÉDIA' : 'BAIXA';
  
  const confidenceColor: [number, number, number] = result.confidence_level === 'green' ? [22, 163, 74] :
                                                     result.confidence_level === 'yellow_high' ? [202, 138, 4] :
                                                     result.confidence_level === 'yellow_medium' ? [234, 88, 12] : [220, 38, 38];
  
  // Determine quality indicators for each metric
  const spreadQuality = result.spread_percentage <= 20 ? 'excellent' : 
                        result.spread_percentage <= 35 ? 'good' : 
                        result.spread_percentage <= 50 ? 'moderate' : 'poor';
  
  const scoreQuality = result.confidence_score >= 80 ? 'excellent' : 
                       result.confidence_score >= 60 ? 'good' : 
                       result.confidence_score >= 40 ? 'moderate' : 'poor';
  
  const getQualityColor = (quality: string): [number, number, number] => {
    switch(quality) {
      case 'excellent': return [22, 163, 74];
      case 'good': return [34, 197, 94];
      case 'moderate': return [234, 179, 8];
      default: return [239, 68, 68];
    }
  };
  
  const getQualityIcon = (quality: string): string => {
    switch(quality) {
      case 'excellent': return '★★★';
      case 'good': return '★★☆';
      case 'moderate': return '★☆☆';
      default: return '○○○';
    }
  };

  // Enhanced metrics cards - 4 columns with visual indicators
  const metricsData = [
    { 
      label: 'Ajuste Total', 
      value: `${result.total_adjustment >= 0 ? '+' : ''}${(result.total_adjustment * 100).toFixed(1)}%`, 
      color: result.total_adjustment >= 0 ? [22, 163, 74] : [220, 38, 38] as [number, number, number],
      icon: result.total_adjustment >= 0 ? '↗' : '↘',
      sublabel: result.total_adjustment >= 0 ? 'Valorização' : 'Desvalorização'
    },
    { 
      label: 'Spread', 
      value: `${result.spread_percentage.toFixed(1)}%`, 
      color: getQualityColor(spreadQuality),
      icon: getQualityIcon(spreadQuality),
      sublabel: spreadQuality === 'excellent' ? 'Precisão Alta' : 
                spreadQuality === 'good' ? 'Precisão Boa' : 
                spreadQuality === 'moderate' ? 'Precisão Moderada' : 'Precisão Baixa'
    },
    { 
      label: 'Score', 
      value: `${result.confidence_score}/100`, 
      color: getQualityColor(scoreQuality),
      icon: getQualityIcon(scoreQuality),
      sublabel: scoreQuality === 'excellent' ? 'Excelente' : 
                scoreQuality === 'good' ? 'Bom' : 
                scoreQuality === 'moderate' ? 'Moderado' : 'Baixo'
    },
    { 
      label: 'Nível', 
      value: confidenceLabel, 
      color: confidenceColor,
      icon: result.confidence_level === 'green' ? '●' : 
            result.confidence_level === 'yellow_high' ? '◐' : 
            result.confidence_level === 'yellow_medium' ? '◔' : '○',
      sublabel: 'Confiabilidade'
    },
  ];
  
  // Main metrics card with enhanced styling
  const metricCardHeight = 36;
  const metricColWidth = (contentWidth + 10) / 4;
  
  metricsData.forEach((metric, i) => {
    const colX = marginLeft - 5 + (metricColWidth * i);
    const cardWidth = metricColWidth - 4;
    
    // Individual card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...(metric.color as [number, number, number]));
    doc.setLineWidth(0.5);
    doc.roundedRect(colX + 2, yPos - 3, cardWidth, metricCardHeight, 2, 2, 'FD');
    
    // Colored top bar
    doc.setFillColor(...(metric.color as [number, number, number]));
    doc.rect(colX + 2, yPos - 3, cardWidth, 3, 'F');
    
    // Icon
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(metric.color as [number, number, number]));
    doc.text(metric.icon, colX + cardWidth - 8, yPos + 8);
    
    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(metric.label, colX + 5, yPos + 8);
    
    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(metric.color as [number, number, number]));
    doc.text(metric.value, colX + 5, yPos + 20);
    
    // Sublabel
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(metric.sublabel, colX + 5, yPos + 27);
  });
  
  yPos += metricCardHeight + 8;
  
  // Explanation box with improved design
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.3);
  const explanationHeight = 38;
  doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, explanationHeight, 2, 2, 'FD');
  
  // Blue accent bar on left
  doc.setFillColor(14, 165, 233);
  doc.rect(marginLeft - 5, yPos, 3, explanationHeight, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text('💡 Entenda os Indicadores de Confiança', marginLeft + 2, yPos + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 64, 175);
  
  const explanations = [
    `• Ajuste Total: Valorização ou desvalorização aplicada com base nas características do imóvel (acabamento, vista, posição, etc.).`,
    `• Spread: Variação entre valor mínimo e máximo. Spread ≤20% = Precisão Alta | 21-35% = Boa | 36-50% = Moderada | >50% = Baixa.`,
    `• Score (0-100): Pontuação de confiabilidade baseada na quantidade e qualidade dos dados disponíveis na região.`,
    `• Nível: Alta (80-100) | Média-Alta (60-79) | Média (40-59) | Baixa (<40) - Resume a qualidade geral desta avaliação.`
  ];
  
  let expY = yPos + 12;
  explanations.forEach((exp) => {
    const splitExp = doc.splitTextToSize(exp, contentWidth + 2);
    doc.text(splitExp, marginLeft + 2, expY);
    expY += splitExp.length * 4;
  });
  
  yPos += explanationHeight + 4;
  
  // Tips box: How to improve evaluation quality
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.3);
  const tipsHeight = 32;
  doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, tipsHeight, 2, 2, 'FD');
  
  // Amber accent bar on left
  doc.setFillColor(202, 138, 4);
  doc.rect(marginLeft - 5, yPos, 3, tipsHeight, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('📈 Como Melhorar a Precisão da Avaliação?', marginLeft + 2, yPos + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(120, 53, 15);
  
  const tips = [
    `→ Preencha todas as características do imóvel com precisão (vista, andar, estado de conservação, reformas realizadas).`,
    `→ Realize a Vistoria Digital completa para ajuste de até ±15% com base nas condições reais verificadas in loco.`,
    `→ Quanto mais transações na região, maior o score. Aguarde mais dados se a região for recente ou pouco movimentada.`
  ];
  
  let tipY = yPos + 11;
  tips.forEach((tip) => {
    const splitTip = doc.splitTextToSize(tip, contentWidth + 2);
    doc.text(splitTip, marginLeft + 2, tipY);
    tipY += splitTip.length * 3.8;
  });
  
  yPos += tipsHeight + 6;

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

  // 6. ESTRATÉGIA DE PREÇO - Card visual
  yPos += 4;
  yPos = drawSectionTitle(doc, 'Estratégia de Preço', yPos, marginLeft);
  
  // Card para estratégia
  const strategyHeight = 32;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, strategyHeight, 2, 2, 'FD');

  const listPrice = Math.round(result.provavel * 1.05);
  const priceY = yPos + 4;
  
  // Grid de 3 colunas
  const priceColWidth = (contentWidth + 10) / 3;
  
  // Coluna 1: Anunciar por
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(146, 64, 14);
  doc.text('Anunciar por:', marginLeft, priceY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(formatCurrencyPDF(listPrice), marginLeft, priceY + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(146, 64, 14);
  doc.text('(margem de negociação)', marginLeft, priceY + 14);
  
  // Coluna 2: Valor Target
  const col2X = marginLeft + priceColWidth;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(21, 128, 61);
  doc.text('Valor Target:', col2X, priceY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrencyPDF(result.provavel), col2X, priceY + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(21, 128, 61);
  doc.text('(expectativa de fechamento)', col2X, priceY + 14);
  
  // Coluna 3: Mínimo Aceitável
  const col3X = marginLeft + priceColWidth * 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 29, 29);
  doc.text('Mínimo Aceitável:', col3X, priceY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text(formatCurrencyPDF(result.pessimista), col3X, priceY + 8);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 29, 29);
  doc.text('(piso de negociação)', col3X, priceY + 14);
  
  yPos += strategyHeight + 4;

  // 7. RECOMENDAÇÃO
  yPos += 6;
  
  // Determina cor de fundo baseada no status
  const getRecColor = (status: string): [number, number, number] => {
    switch (status) {
      case "READY_TO_MARKET": return [240, 253, 244]; // Verde claro
      case "WAIT_30_DAYS": return [239, 246, 255]; // Azul claro
      case "REGULARIZE_FIRST": return [254, 249, 195]; // Amarelo claro
      case "CONSULT_SPECIALIST": 
      case "NEED_SPECIALIST_VALUATION":
      case "BLOCKED_EVALUATION": return [254, 226, 226]; // Vermelho claro
      default: return [...BRAND_COLORS.lightGray] as [number, number, number];
    }
  };
  
  const recBgColor = getRecColor(result.recommendation.status);
  doc.setFillColor(...recBgColor);
  const recBoxY = yPos - 3;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const splitRec = doc.splitTextToSize(result.recommendation.message, contentWidth - 10);
  const recBoxHeight = 16 + (splitRec.length * 4);
  
  // Desenha box com borda colorida
  doc.setDrawColor(...BRAND_COLORS.navy);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginLeft - 5, recBoxY, contentWidth + 10, recBoxHeight, 2, 2, 'FD');
  
  // Título com ícone PDF-safe
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  const recIcon = result.recommendation.icon || "";
  const recTitle = `RECOMENDAÇÃO: ${recIcon} ${result.recommendation.title}`;
  doc.text(recTitle, marginLeft, yPos + 5);
  
  // Linha decorativa
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, yPos + 8, marginLeft + 80, yPos + 8);
  
  // Mensagem
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(splitRec, marginLeft, yPos + 14);
  
  yPos += recBoxHeight + 8;

  // Check if we need a new page for disclaimer
  if (yPos > getMaxContentY() - 30) {
    doc.addPage();
    yPos = 20;
  }

  // 8. DISCLAIMER ADICIONAL PARA AVALIAÇÃO SIMPLIFICADA
  if (isSimplified) {
    // Check if we need a new page
    if (yPos > getMaxContentY() - 40) {
      doc.addPage();
      yPos = 20;
    }
    
    // Box estilizado com borda
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 32, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('PARA MAIOR PRECISÃO', marginLeft, yPos + 5);
    
    // Linha dourada
    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos + 7, marginLeft + 45, yPos + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.darkGray);
    const vistoriaInfo = [
      'A Vistoria Digital analisa 21 categorias detalhadas: instalações elétricas e',
      'hidráulicas, acabamentos, estrutura, climatização e segurança.',
      'Realize a vistoria completa para uma avaliação mais assertiva.',
    ];
    vistoriaInfo.forEach((line, i) => {
      doc.text(line, marginLeft, yPos + 13 + (i * 4));
    });
    
    yPos += 37;
  }

  // 9. DISCLAIMER PADRÃO
  drawDisclaimer(doc, yPos, marginLeft);

  // 10. GLOSSÁRIO DE TERMOS TÉCNICOS
  doc.addPage();
  yPos = 20;
  
  yPos = drawSectionTitle(doc, 'Glossário de Termos Técnicos', yPos, marginLeft);
  
  const glossaryItems = [
    {
      term: 'Valor Provável',
      definition: 'Valor mais provável de venda do imóvel, calculado como média ponderada entre dados de transações oficiais (ITBI) e anúncios de mercado.'
    },
    {
      term: 'Valor Pessimista',
      definition: 'Estimativa conservadora do valor do imóvel, representando o cenário de venda rápida ou mercado desfavorável.'
    },
    {
      term: 'Valor Otimista',
      definition: 'Estimativa máxima do valor do imóvel, representando o cenário de venda sem urgência em mercado aquecido.'
    },
    {
      term: 'ITBI (Imposto de Transmissão)',
      definition: 'Base de dados oficial de transações imobiliárias registradas na Secretaria Municipal de Fazenda. Reflete valores reais de compra e venda.'
    },
    {
      term: 'Ajuste Total',
      definition: 'Percentual de valorização ou desvalorização aplicado com base nas características do imóvel (acabamento, vista, estado de conservação, etc.).'
    },
    {
      term: 'Spread',
      definition: 'Diferença percentual entre o valor mínimo e máximo estimados. Quanto menor o spread, maior a precisão e confiabilidade da avaliação.'
    },
    {
      term: 'Score de Confiança (0-100)',
      definition: 'Pontuação que indica a confiabilidade da avaliação, baseada na quantidade e qualidade dos dados disponíveis na região.'
    },
    {
      term: 'Nível de Confiança',
      definition: 'Classificação qualitativa: Alta (score 80-100), Média-Alta (60-79), Média (40-59) ou Baixa (<40).'
    },
    {
      term: 'Tendência de Mercado',
      definition: 'Variação percentual dos preços praticados na região nos últimos 6 a 12 meses. Indica valorização ou desvalorização da área.'
    },
    {
      term: 'Preço de Anúncio',
      definition: 'Valor sugerido para anunciar o imóvel, considerando margem para negociação típica do mercado.'
    },
    {
      term: 'Valor Target',
      definition: 'Valor objetivo da negociação, representando o valor esperado de fechamento do negócio.'
    },
    {
      term: 'Mínimo Aceitável',
      definition: 'Valor abaixo do qual a venda não é recomendada, pois representaria prejuízo em relação ao valor de mercado.'
    }
  ];
  
  glossaryItems.forEach((item) => {
    if (yPos > getMaxContentY() - 18) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.gold);
    doc.text(`• ${item.term}`, marginLeft, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitDef = doc.splitTextToSize(item.definition, contentWidth - 10);
    doc.text(splitDef, marginLeft + 5, yPos + 5);
    
    yPos += 5 + (splitDef.length * 3.5) + 4;
  });
  
  // Nota final do glossário
  if (yPos > getMaxContentY() - 22) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 5;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, 16, 2, 2, 'FD');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('Nota Importante', marginLeft, yPos + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const noteText = 'Esta avaliação é uma ferramenta estatística de apoio à decisão e não substitui laudo de avaliação formal emitido por profissional habilitado (engenheiro ou arquiteto com registro no CREA/CAU).';
  const splitNote = doc.splitTextToSize(noteText, contentWidth + 5);
  doc.text(splitNote, marginLeft, yPos + 10);

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
