import jsPDF from 'jspdf';
import type { ValuationResult, CombinedPrices } from './valuationCalculations';
import type { ValuationState } from '@/types/valuation';
import type { PricingStrategyState, StrategyType, StrategyCalculation } from '@/types/pricingStrategy';
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

// Interface para dados da estratégia de precificação no PDF
export interface PricingStrategyPDFData {
  valorItbi: number;
  estrategiaSelecionada: StrategyType;
  estrategiaRecomendada: StrategyType;
  calculos: {
    atracao: StrategyCalculation;
    mercado: StrategyCalculation;
    premium: StrategyCalculation;
  };
  planoAjusteAtivo: boolean;
}

// Internal function that creates the PDF document (shared between export and email)
function createValuationPDF(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null,
  anuncioFontes?: AnuncioFonte[],
  pricingStrategy?: PricingStrategyPDFData | null
): jsPDF {
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
      'reais no período selecionado, características declaradas e análise estatística.',
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
  doc.setFontSize(11);
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
    ['Área:', `${state.area_m2} m²`],
  ];

  identificationData.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.text(item[0], marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    const textValue = doc.splitTextToSize(item[1], contentWidth - 55);
    doc.text(textValue, marginLeft + 50, yPos);
    yPos += textValue.length > 1 ? 10 : 7;
  });

  // Características físicas em cards visuais
  yPos += 4;
  const caracteristicasItems = [
    state.quartos ? { label: 'quartos', value: state.quartos } : null,
    state.suites ? { label: 'suítes', value: state.suites } : null,
    state.banheiros ? { label: 'banheiros', value: state.banheiros } : null,
    state.vagas ? { label: 'vagas', value: state.vagas } : null,
    state.andar ? { label: 'Andar', value: state.andar } : null,
  ].filter(Boolean) as { label: string; value: number | string }[];
  
  if (caracteristicasItems.length > 0) {
    // Draw mini cards for characteristics
    const cardWidth = 30;
    const cardHeight = 22;
    const cardSpacing = 4;
    
    caracteristicasItems.forEach((item, index) => {
      const cardX = marginLeft + 5 + (cardWidth + cardSpacing) * index;
      
      // Card background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, 'FD');
      
      // Value (large)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.navy);
      doc.text(String(item.value), cardX + cardWidth / 2, yPos + 10, { align: 'center' });
      
      // Label (small)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND_COLORS.gray);
      doc.text(item.label, cardX + cardWidth / 2, yPos + 18, { align: 'center' });
    });
    
    yPos += cardHeight + 6;
  }

  // Proprietário (se informado)
  if (state.proprietario) {
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Proprietário:', marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(state.proprietario, marginLeft + 50, yPos);
    yPos += 7;
    
    if (state.telefone) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Tel:', marginLeft + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(state.telefone, marginLeft + 50, yPos);
      yPos += 7;
    }
  }

  // Data da avaliação
  if (state.dataAvaliacao) {
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text('Data da Avaliação:', marginLeft + 5, yPos);
    const dataFormatada = new Date(state.dataAvaliacao + 'T00:00:00').toLocaleDateString('pt-BR');
    doc.setFont('helvetica', 'bold');
    doc.text(dataFormatada, marginLeft + 50, yPos);
    yPos += 7;
  }

  // 2. TRANSAÇÕES REALIZADAS NA REGIÃO (Card consolidado ITBI)
  if (state.itbiData) {
    // Verificar se há espaço suficiente (precisa de ~65mm para esta seção)
    if (yPos > getMaxContentY() - 70) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 6;
    yPos = drawSectionTitle(doc, 'Transações Realizadas na Região', yPos, marginLeft);
    
    // Texto explicativo melhorado
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    const textoExplicativo = 'Para fundamentar esta avaliação, foram identificadas transações de imóveis com características semelhantes, localizados na mesma região do imóvel avaliado, realizadas no período selecionado e registradas nos órgãos oficiais.';
    const splitTexto = doc.splitTextToSize(textoExplicativo, contentWidth);
    doc.text(splitTexto, marginLeft, yPos);
    yPos += splitTexto.length * 4 + 6;
    
    // Card principal com design equilibrado
    const cardHeight = 42;
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, cardHeight, 3, 3, 'FD');
    
    // Grid de 2 colunas com estatísticas - tamanhos equalizados
    const colWidth = (contentWidth + 10) / 2;
    const col1X = marginLeft;
    const col2X = marginLeft + colWidth;
    
    // Separador vertical sutil
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.3);
    doc.line(col2X - 5, yPos + 4, col2X - 5, yPos + cardHeight - 8);
    
    // Coluna 1: Total de transações - tamanhos equalizados
    const transCount = String(state.itbiData.transaction_count);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TRANSAÇÕES', col1X + 5, yPos + 8);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(transCount, col1X + 5, yPos + 22);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('identificadas na região', col1X + 5, yPos + 30);
    
    // Coluna 2: Valor médio do m² - tamanhos equalizados
    const valorMedM2 = `R$ ${state.itbiData.med_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('VALOR MÉDIO', col2X + 5, yPos + 8);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text(valorMedM2, col2X + 5, yPos + 22);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('por m² (mediana)', col2X + 5, yPos + 30);
    
    yPos += cardHeight + 2;
    
    // Fonte com ícone
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Fonte: Transações oficiais - Secretaria Municipal de Fazenda do Rio de Janeiro', marginLeft, yPos + 2);
    yPos += 10;
  }

  // 3. REFERÊNCIA DE MERCADO (Preços combinados)
  if (combined) {
    // Verificar se há espaço suficiente para esta seção (~50mm)
    if (yPos > getMaxContentY() - 55) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 4;
    yPos = drawSectionTitle(doc, 'Referência de Mercado', yPos, marginLeft);
    
    // Nota explicativa sobre metodologia de ponderação
    const temAnuncios = anuncioFontes && anuncioFontes.length > 0;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...BRAND_COLORS.gray);
    
    const metodologiaTexto = temAnuncios
      ? 'Metodologia: Os valores de referência (P10, mediana e P90 do R$/m², ponderados pelo número de escrituras) são calculados exclusivamente com dados oficiais de transações. Os anúncios de mercado informados não entram na base: eles medem o gap entre preço pedido e preço fechado, usado na recomendação.'
      : 'Metodologia: Os valores de referência (P10, mediana e P90 do R$/m², ponderados pelo número de escrituras) são calculados exclusivamente com base em dados oficiais de transações (100%), garantindo máxima objetividade baseada em negócios efetivamente realizados.';
    
    const splitMetodologia = doc.splitTextToSize(metodologiaTexto, contentWidth);
    doc.text(splitMetodologia, marginLeft, yPos);
    yPos += splitMetodologia.length * 5 + 5;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);

    // Indicar base personalizada se selecionada
    const baseLabel = state.baseSelected === 'custom' && state.customBaseM2
      ? `Preço Base Personalizado: R$ ${state.customBaseM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m²`
      : state.baseSelected === 'min'
      ? 'Base selecionada: Preço Mínimo'
      : state.baseSelected === 'max'
      ? 'Base selecionada: Preço Máximo'
      : null;

    if (baseLabel) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.gold);
      doc.text(baseLabel, marginLeft + 5, yPos);
      yPos += 7;
    }

    const marketData = [
      ['Preço Mínimo/m²:', `R$ ${combined.min_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Preço Médio/m²:', `R$ ${combined.med_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Preço Máximo/m²:', `R$ ${combined.max_m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`],
      ['Tendência:', combined.trend_percentage === null
        ? 'N/A (sem amostra suficiente de anúncios)'
        : `${combined.trend_percentage > 0 ? '+' : ''}${combined.trend_percentage.toFixed(1)}% (${combined.trend_direction === 'UP' ? 'Alta' : combined.trend_direction === 'DOWN' ? 'Baixa' : 'Estável'})`],
    ];

    marketData.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.text(item[0], marginLeft + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], marginLeft + 55, yPos);
      yPos += 7;
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
  // Verificar se há espaço suficiente para o resultado (~55mm)
  if (yPos > getMaxContentY() - 60) {
    doc.addPage();
    yPos = 20;
  }
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
  if (yPos > getMaxContentY() - 140) {
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
  // Faixa P10–P90 sem compressão: limiares alinhados a valuationCalculations (SPREAD_*).
  const spreadQuality = result.spread_percentage <= 35 ? 'excellent' : 
                        result.spread_percentage <= 50 ? 'good' : 
                        result.spread_percentage <= 65 ? 'moderate' : 'poor';
  
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
  
  // PDF-safe icons (avoiding emojis that corrupt in jsPDF)
  const getQualityIcon = (quality: string): string => {
    switch(quality) {
      case 'excellent': return '[+++]';
      case 'good': return '[++]';
      case 'moderate': return '[+]';
      default: return '[-]';
    }
  };

  // Enhanced metrics cards - 4 columns with visual indicators
  const metricsData = [
    { 
      label: 'Ajuste Total', 
      value: `${result.total_adjustment >= 0 ? '+' : ''}${(result.total_adjustment * 100).toFixed(1)}%`, 
      color: result.total_adjustment >= 0 ? [22, 163, 74] : [220, 38, 38] as [number, number, number],
      icon: result.total_adjustment >= 0 ? '^' : 'v',
      sublabel: result.total_adjustment >= 0 ? 'Valorizacao' : 'Desvalorizacao'
    },
    { 
      label: 'Spread', 
      value: `${result.spread_percentage.toFixed(1)}%`, 
      color: getQualityColor(spreadQuality),
      icon: getQualityIcon(spreadQuality),
      sublabel: spreadQuality === 'excellent' ? 'Precisao Alta' : 
                spreadQuality === 'good' ? 'Precisao Boa' : 
                spreadQuality === 'moderate' ? 'Precisao Moderada' : 'Precisao Baixa'
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
      label: 'Nivel', 
      value: confidenceLabel, 
      color: confidenceColor,
      icon: result.confidence_level === 'green' ? '(*)' : 
            result.confidence_level === 'yellow_high' ? '(o)' : 
            result.confidence_level === 'yellow_medium' ? '(-)' : '( )',
      sublabel: 'Confiabilidade'
    },
  ];
  
  // Main metrics card with enhanced styling - PADRONIZADO
  const metricCardHeight = 50;
  const metricColWidth = (contentWidth + 10) / 4;
  
  metricsData.forEach((metric, i) => {
    const colX = marginLeft - 5 + (metricColWidth * i);
    const cardWidth = metricColWidth - 3;
    
    // Individual card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...(metric.color as [number, number, number]));
    doc.setLineWidth(0.5);
    doc.roundedRect(colX + 1.5, yPos - 3, cardWidth, metricCardHeight, 3, 3, 'FD');
    
    // Colored top bar
    doc.setFillColor(...(metric.color as [number, number, number]));
    doc.rect(colX + 1.5, yPos - 3, cardWidth, 5, 'F');
    
    // Label - padronizado 10pt
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(metric.label, colX + cardWidth / 2, yPos + 12, { align: 'center' });
    
    // Value - padronizado 20pt
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(metric.color as [number, number, number]));
    doc.text(metric.value, colX + cardWidth / 2, yPos + 30, { align: 'center' });
    
    // Sublabel - padronizado 9pt
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(metric.sublabel, colX + cardWidth / 2, yPos + 40, { align: 'center' });
  });
  
  yPos += metricCardHeight + 10;
  
  // Verificar se há espaço para os cards informativos (~60mm)
  if (yPos > getMaxContentY() - 65) {
    doc.addPage();
    yPos = 20;
  }
  
  // Cards informativos com altura e estilo padronizado
  const infoCardHeight = 58;
  const infoCardWidth = (contentWidth + 10) / 2 - 4;
  
  // Card 1: Entenda Indicadores (lado esquerdo)
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginLeft - 5, yPos, infoCardWidth, infoCardHeight, 3, 3, 'FD');
  
  // Blue accent bar on left
  doc.setFillColor(14, 165, 233);
  doc.rect(marginLeft - 5, yPos, 4, infoCardHeight, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text('[i] Entenda os Indicadores', marginLeft + 3, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  
  const explanations = [
    `Ajuste: valor. ou desval. por características`,
    `Spread: <=20% Alta | 21-35% Boa | >35% Baixa`,
    `Score: confiabilidade (0-100)`,
    `Nível: Alta (80+) | Média (40-79) | Baixa (<40)`
  ];
  
  let expY = yPos + 20;
  explanations.forEach((exp) => {
    doc.text(exp, marginLeft + 3, expY);
    expY += 9;
  });
  
  // Card 2: Como Melhorar (lado direito)
  const rightCardX = marginLeft - 5 + infoCardWidth + 8;
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.5);
  doc.roundedRect(rightCardX, yPos, infoCardWidth, infoCardHeight, 3, 3, 'FD');
  
  // Amber accent bar on left
  doc.setFillColor(202, 138, 4);
  doc.rect(rightCardX, yPos, 4, infoCardHeight, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('[^] Como Melhorar a Precisão?', rightCardX + 8, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  
  const tips = [
    `> Preencha todas as características`,
    `> Vistoria Digital: ajuste de ±15%`,
    `> Mais transações = maior score`
  ];
  
  let tipY = yPos + 22;
  tips.forEach((tip) => {
    doc.text(tip, rightCardX + 8, tipY);
    tipY += 11;
  });
  
  yPos += infoCardHeight + 8;

  // 5. ANÁLISE HISTÓRICA (5 ANOS)
  if (state.historicalAnalysis && state.historicalAnalysis.yearlyData.length > 0) {
    // Check if we need a new page - seção grande precisa de espaço
    if (yPos > getMaxContentY() - 140) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 4;
    const historicalTitle = state.historicalAnalysis.dataSource === 'bairro' 
      ? `Análise Histórica (5 Anos) — Dados do Bairro: ${state.historicalAnalysis.bairroUsado || state.bairro}`
      : 'Análise Histórica (5 Anos)';
    yPos = drawSectionTitle(doc, historicalTitle, yPos, marginLeft);
    
    const historical = state.historicalAnalysis;
    
    // KPIs em cards padronizados (mesmo estilo das Métricas de Confiança)
    const kpiHeight = 50;
    const kpiColWidth = (contentWidth + 10) / 4;
    
    // Dados dos KPIs
    const liquidityColor: [number, number, number] = historical.liquidityLevel === 'alta' ? [22, 163, 74] :
      historical.liquidityLevel === 'media' ? [202, 138, 4] : [220, 38, 38];
    const liquidityLabel = historical.liquidityLevel === 'alta' ? 'Alta' : historical.liquidityLevel === 'media' ? 'Média' : 'Baixa';
    
    const transColor: [number, number, number] = historical.transactionTrend === 'crescente' ? [22, 163, 74] :
      historical.transactionTrend === 'decrescente' ? [220, 38, 38] : [100, 100, 100];
    const transIcon = historical.transactionTrend === 'crescente' ? '+' : historical.transactionTrend === 'decrescente' ? '-' : '=';
    
    const priceColor: [number, number, number] = historical.priceTrend === 'alta' ? [22, 163, 74] :
      historical.priceTrend === 'baixa' ? [220, 38, 38] : [100, 100, 100];
    const priceIcon = historical.priceTrend === 'alta' ? '+' : historical.priceTrend === 'baixa' ? '-' : '=';
    
    const totalTrans = historical.yearlyData.reduce((sum, y) => sum + y.transacoes, 0);
    
    const kpiData = [
      { label: 'Liquidez', value: `${historical.liquidityScore}/100`, sublabel: liquidityLabel, color: liquidityColor },
      { label: 'Vol. Transações', value: `${transIcon}${Math.abs(historical.transactionGrowth).toFixed(1)}%`, sublabel: 'a.a.', color: transColor },
      { label: 'Evolução Preço', value: `${priceIcon}${Math.abs(historical.priceGrowth).toFixed(1)}%`, sublabel: 'a.a.', color: priceColor },
      { label: 'Total 5 Anos', value: `${totalTrans}`, sublabel: 'transações', color: [59, 130, 246] as [number, number, number] },
    ];
    
    kpiData.forEach((kpi, i) => {
      const colX = marginLeft - 5 + (kpiColWidth * i);
      const cardWidth = kpiColWidth - 3;
      
      // Individual card background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...kpi.color);
      doc.setLineWidth(0.5);
      doc.roundedRect(colX + 1.5, yPos - 3, cardWidth, kpiHeight, 3, 3, 'FD');
      
      // Colored top bar
      doc.setFillColor(...kpi.color);
      doc.rect(colX + 1.5, yPos - 3, cardWidth, 5, 'F');
      
      // Label - padronizado 10pt
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(kpi.label, colX + cardWidth / 2, yPos + 12, { align: 'center' });
      
      // Value - padronizado 20pt
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...kpi.color);
      doc.text(kpi.value, colX + cardWidth / 2, yPos + 30, { align: 'center' });
      
      // Sublabel - padronizado 9pt
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(kpi.sublabel, colX + cardWidth / 2, yPos + 40, { align: 'center' });
    });
    
    yPos += kpiHeight + 6;
    
    // Tabela de dados por ano - FONTES AUMENTADAS
    const tableY = yPos;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    
    // Headers
    const colWidths = [25, 30, 38, 38, 38];
    let tableX = marginLeft;
    ['Ano', 'Trans.', 'Mín/m²', 'Méd/m²', 'Máx/m²'].forEach((header, i) => {
      doc.text(header, tableX, yPos);
      tableX += colWidths[i];
    });
    
    doc.setLineWidth(0.2);
    doc.setDrawColor(203, 213, 225);
    doc.line(marginLeft, yPos + 2, marginLeft + contentWidth, yPos + 2);
    yPos += 7;
    
    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    historical.yearlyData.forEach((year, i) => {
      tableX = marginLeft;
      doc.setTextColor(71, 85, 105);
      doc.text(year.ano.toString(), tableX, yPos);
      tableX += colWidths[0];
      
      doc.setTextColor(59, 130, 246);
      doc.text(year.transacoes.toString(), tableX, yPos);
      tableX += colWidths[1];
      
      doc.setTextColor(71, 85, 105);
      doc.text(year.valorMinM2 > 0 ? `R$ ${year.valorMinM2.toLocaleString('pt-BR')}` : '-', tableX, yPos);
      tableX += colWidths[2];
      
      doc.setFont('helvetica', 'bold');
      doc.text(year.valorMedioM2 > 0 ? `R$ ${year.valorMedioM2.toLocaleString('pt-BR')}` : '-', tableX, yPos);
      doc.setFont('helvetica', 'normal');
      tableX += colWidths[3];
      
      doc.text(year.valorMaxM2 > 0 ? `R$ ${year.valorMaxM2.toLocaleString('pt-BR')}` : '-', tableX, yPos);
      
      yPos += 6;
    });
    
    yPos += 2;
    
    // Diagnóstico - Card azul com fonte aumentada
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    
    const diagText = historical.diagnostico;
    const splitDiag = doc.splitTextToSize(diagText, contentWidth - 5);
    const diagHeight = 12 + splitDiag.length * 5;
    
    doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, diagHeight, 2, 2, 'FD');
    
    // Barra azul lateral
    doc.setFillColor(59, 130, 246);
    doc.rect(marginLeft - 5, yPos, 3, diagHeight, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 64, 175);
    doc.text(splitDiag, marginLeft + 2, yPos + 7);
    
    yPos += diagHeight + 4;
    
    // Alertas
    if (historical.alertas.length > 0) {
      const alertText = historical.alertas.join(' | ');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(146, 64, 14);
      const splitAlert = doc.splitTextToSize(alertText, contentWidth);
      doc.text(splitAlert, marginLeft, yPos);
      yPos += splitAlert.length * 4 + 4;
    }
    
    // ========== GRÁFICO DE EVOLUÇÃO ANUAL DO PREÇO/M² ==========
    // Check if we need a new page - precisa de mais espaço para o gráfico completo
    if (yPos > getMaxContentY() - 100) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Gráfico de Evolução Anual do Preço/m²', marginLeft, yPos);
    yPos += 8;
    
    // Dimensões do gráfico
    const chartWidth = contentWidth;
    const chartHeight = 55;
    const chartX = marginLeft;
    const chartY = yPos;
    
    // Background do gráfico
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(chartX - 2, chartY - 2, chartWidth + 4, chartHeight + 4, 2, 2, 'FD');
    
    // Calcular valores para escala
    const yearlyValues = historical.yearlyData.filter(y => y.valorMedioM2 > 0);
    if (yearlyValues.length > 0) {
      const maxValue = Math.max(...yearlyValues.map(y => y.valorMedioM2));
      const minValue = Math.min(...yearlyValues.map(y => y.valorMedioM2));
      const valueRange = maxValue - minValue || maxValue * 0.1;
      const paddedMin = minValue - valueRange * 0.15;
      const paddedMax = maxValue + valueRange * 0.15;
      const scaledRange = paddedMax - paddedMin;
      
      // Área útil do gráfico
      const graphAreaX = chartX + 35; // Espaço para labels Y
      const graphAreaY = chartY + 5;
      const graphAreaWidth = chartWidth - 45;
      const graphAreaHeight = chartHeight - 18;
      
      // Eixo Y - linhas de grade e labels
      const numYLines = 4;
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      
      for (let i = 0; i <= numYLines; i++) {
        const yValue = paddedMin + (scaledRange * i / numYLines);
        const yPosition = graphAreaY + graphAreaHeight - (graphAreaHeight * i / numYLines);
        
        // Linha de grade horizontal
        doc.setLineDashPattern([1, 1], 0);
        doc.line(graphAreaX, yPosition, graphAreaX + graphAreaWidth, yPosition);
        doc.setLineDashPattern([], 0);
        
        // Label do valor
        const valueLabel = `R$ ${Math.round(yValue).toLocaleString('pt-BR')}`;
        doc.text(valueLabel, chartX + 2, yPosition + 1);
      }
      
      // Desenhar barras
      const barCount = yearlyValues.length;
      const barWidth = Math.min(20, (graphAreaWidth - 10) / barCount - 4);
      const barSpacing = (graphAreaWidth - barWidth * barCount) / (barCount + 1);
      
      yearlyValues.forEach((year, i) => {
        const barHeight = ((year.valorMedioM2 - paddedMin) / scaledRange) * graphAreaHeight;
        const barX = graphAreaX + barSpacing + (barWidth + barSpacing) * i;
        const barY = graphAreaY + graphAreaHeight - barHeight;
        
        // Gradiente simulado com cores
        const isGrowing = i > 0 && year.valorMedioM2 > yearlyValues[i - 1].valorMedioM2;
        const baseColor: [number, number, number] = isGrowing ? [34, 197, 94] : [59, 130, 246];
        
        // Barra principal
        doc.setFillColor(...baseColor);
        doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');
        
        // Borda da barra
        doc.setDrawColor(baseColor[0] - 20, baseColor[1] - 20, baseColor[2] - 20);
        doc.setLineWidth(0.3);
        doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'S');
        
        // Valor acima da barra
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...baseColor);
        const valueText = `R$ ${Math.round(year.valorMedioM2).toLocaleString('pt-BR')}`;
        const textWidth = doc.getTextWidth(valueText);
        doc.text(valueText, barX + barWidth / 2 - textWidth / 2, barY - 2);
        
        // Label do ano (eixo X)
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        const yearText = year.ano.toString();
        const yearWidth = doc.getTextWidth(yearText);
        doc.text(yearText, barX + barWidth / 2 - yearWidth / 2, graphAreaY + graphAreaHeight + 6);
        
        // Número de transações
        doc.setFontSize(4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        const transText = `${year.transacoes} trans.`;
        const transWidth = doc.getTextWidth(transText);
        doc.text(transText, barX + barWidth / 2 - transWidth / 2, graphAreaY + graphAreaHeight + 10);
      });
      
      // Legenda
      yPos = chartY + chartHeight + 8;
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      
      // Verde = crescimento
      doc.setFillColor(34, 197, 94);
      doc.rect(chartX, yPos - 2, 4, 4, 'F');
      doc.text('Crescimento vs. ano anterior', chartX + 6, yPos + 1);
      
      // Azul = queda ou primeiro ano
      doc.setFillColor(59, 130, 246);
      doc.rect(chartX + 55, yPos - 2, 4, 4, 'F');
      doc.text('Queda ou primeiro ano da série', chartX + 61, yPos + 1);
      
      yPos += 8;
    }
    
    // ========== GRÁFICO DE PROJEÇÃO DE VALORIZAÇÃO ==========
    if (historical.futureProjection) {
      // Check if we need a new page - precisa de mais espaço para o gráfico completo
      if (yPos > getMaxContentY() - 110) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.navy);
      doc.text('Gráfico de Projeção de Valorização', marginLeft, yPos);
      
      // Badge de confiança
      const projection = historical.futureProjection;
      const confidenceColor: [number, number, number] = projection.confidence === 'alta' ? [22, 163, 74] :
        projection.confidence === 'media' ? [202, 138, 4] : [220, 38, 38];
      const confidenceLabel = projection.confidence === 'alta' ? 'ALTA' :
        projection.confidence === 'media' ? 'MÉDIA' : 'BAIXA';
      
      doc.setFillColor(...confidenceColor);
      const badgeX = marginLeft + 75;
      doc.roundedRect(badgeX, yPos - 4, 22, 6, 1, 1, 'F');
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Conf: ${confidenceLabel}`, badgeX + 2, yPos);
      
      yPos += 8;
      
      // Dimensões do gráfico de projeção
      const projChartWidth = contentWidth;
      const projChartHeight = 55;
      const projChartX = marginLeft;
      const projChartY = yPos;
      
      // Background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(projChartX - 2, projChartY - 2, projChartWidth + 4, projChartHeight + 4, 2, 2, 'FD');
      
      // Área útil
      const projGraphX = projChartX + 35;
      const projGraphY = projChartY + 5;
      const projGraphWidth = projChartWidth - 45;
      const projGraphHeight = projChartHeight - 18;
      
      // Dados de projeção - NOTA: projection.oneYear contém MULTIPLICADORES, não valores absolutos
      // Ex: { optimistic: 1.092, probable: 1.062, pessimistic: 1.032 } para taxas de 9.2%, 6.2%, 3.2%
      const currentValue = result.provavel;
      
      // Converter multiplicadores para valores absolutos
      const projectionData = [
        { label: 'Atual', optimistic: currentValue, probable: currentValue, pessimistic: currentValue },
        { 
          label: '1 Ano', 
          optimistic: currentValue * projection.oneYear.optimistic,
          probable: currentValue * projection.oneYear.probable,
          pessimistic: currentValue * projection.oneYear.pessimistic
        },
        { 
          label: '2 Anos', 
          optimistic: currentValue * projection.twoYears.optimistic,
          probable: currentValue * projection.twoYears.probable,
          pessimistic: currentValue * projection.twoYears.pessimistic
        },
        { 
          label: '3 Anos', 
          optimistic: currentValue * projection.threeYears.optimistic,
          probable: currentValue * projection.threeYears.probable,
          pessimistic: currentValue * projection.threeYears.pessimistic
        }
      ];
      
      // Calcular escala
      const allValues = projectionData.flatMap(p => [p.optimistic, p.probable, p.pessimistic]);
      const projMaxValue = Math.max(...allValues);
      const projMinValue = Math.min(...allValues);
      const projRange = projMaxValue - projMinValue || projMaxValue * 0.1;
      const projPaddedMin = projMinValue - projRange * 0.1;
      const projPaddedMax = projMaxValue + projRange * 0.1;
      const projScaledRange = projPaddedMax - projPaddedMin;
      
      // Eixo Y com labels
      const numProjYLines = 4;
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      
      for (let i = 0; i <= numProjYLines; i++) {
        const yValue = projPaddedMin + (projScaledRange * i / numProjYLines);
        const yPosition = projGraphY + projGraphHeight - (projGraphHeight * i / numProjYLines);
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(projGraphX, yPosition, projGraphX + projGraphWidth, yPosition);
        doc.setLineDashPattern([], 0);
        
        const formattedValue = yValue >= 1000000 
          ? `R$ ${(yValue / 1000000).toFixed(1)}M`
          : `R$ ${Math.round(yValue / 1000)}K`;
        doc.text(formattedValue, projChartX + 2, yPosition + 1);
      }
      
      // Função para mapear valor para posição Y
      const mapValueToY = (value: number) => {
        return projGraphY + projGraphHeight - ((value - projPaddedMin) / projScaledRange) * projGraphHeight;
      };
      
      // Espaçamento entre pontos
      const pointSpacing = projGraphWidth / (projectionData.length - 1);
      
      // Desenhar linhas
      const lineColors: { key: 'optimistic' | 'probable' | 'pessimistic'; color: [number, number, number]; label: string }[] = [
        { key: 'optimistic', color: [34, 197, 94], label: 'Otimista' },
        { key: 'probable', color: [59, 130, 246], label: 'Provável' },
        { key: 'pessimistic', color: [239, 68, 68], label: 'Pessimista' }
      ];
      
      lineColors.forEach(({ key, color }) => {
        doc.setDrawColor(...color);
        doc.setLineWidth(1.2);
        
        for (let i = 0; i < projectionData.length - 1; i++) {
          const x1 = projGraphX + pointSpacing * i;
          const y1 = mapValueToY(projectionData[i][key]);
          const x2 = projGraphX + pointSpacing * (i + 1);
          const y2 = mapValueToY(projectionData[i + 1][key]);
          
          doc.line(x1, y1, x2, y2);
        }
        
        // Pontos maiores
        projectionData.forEach((point, i) => {
          const x = projGraphX + pointSpacing * i;
          const y = mapValueToY(point[key]);
          
          doc.setFillColor(255, 255, 255);
          doc.circle(x, y, 3, 'FD');
          doc.setFillColor(...color);
          doc.circle(x, y, 2, 'F');
        });
      });
      
      // Labels do eixo X - FONTES AUMENTADAS
      projectionData.forEach((point, i) => {
        const x = projGraphX + pointSpacing * i;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        const labelWidth = doc.getTextWidth(point.label);
        doc.text(point.label, x - labelWidth / 2, projGraphY + projGraphHeight + 8);
      });
      
      // Valores no final (3 anos) - FONTES AUMENTADAS
      const lastPoint = projectionData[projectionData.length - 1];
      const lastX = projGraphX + projGraphWidth + 3;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      
      doc.setTextColor(34, 197, 94);
      const optText = lastPoint.optimistic >= 1000000 
        ? `R$ ${(lastPoint.optimistic / 1000000).toFixed(2)}M`
        : formatCurrencyPDF(lastPoint.optimistic);
      doc.text(optText, lastX, mapValueToY(lastPoint.optimistic) + 1);
      
      doc.setTextColor(59, 130, 246);
      const probText = lastPoint.probable >= 1000000 
        ? `R$ ${(lastPoint.probable / 1000000).toFixed(2)}M`
        : formatCurrencyPDF(lastPoint.probable);
      doc.text(probText, lastX, mapValueToY(lastPoint.probable) + 1);
      
      doc.setTextColor(239, 68, 68);
      const pessText = lastPoint.pessimistic >= 1000000 
        ? `R$ ${(lastPoint.pessimistic / 1000000).toFixed(2)}M`
        : formatCurrencyPDF(lastPoint.pessimistic);
      doc.text(pessText, lastX, mapValueToY(lastPoint.pessimistic) + 1);
      
      yPos = projChartY + projChartHeight + 10;
      
      // Legenda - FONTES AUMENTADAS
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Map keys to correct rate property names
      const rateKeyMap: Record<string, keyof typeof projection> = {
        'optimistic': 'optimisticRate',
        'probable': 'probableRate',
        'pessimistic': 'pessimisticRate'
      };
      
      lineColors.forEach((item, i) => {
        const legendX = projChartX + (i * 55);
        doc.setFillColor(...item.color);
        doc.circle(legendX + 2, yPos - 1, 2.5, 'F');
        doc.setTextColor(...item.color);
        const rateKey = rateKeyMap[item.key];
        const rateValue = rateKey ? (projection[rateKey] as number || 0) : 0;
        doc.text(`${item.label} (${rateValue.toFixed(1)}% a.a.)`, legendX + 7, yPos);
      });
      
      yPos += 10;
      
      // Disclaimer da projeção - FONTE AUMENTADA
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(202, 138, 4);
      doc.setLineWidth(0.2);
      doc.roundedRect(projChartX - 2, yPos, projChartWidth + 4, 14, 1, 1, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(146, 64, 14);
      const disclaimerText = projection.disclaimer || 'Projeção baseada em tendências históricas. Valores sujeitos a variações de mercado.';
      const splitDisclaimer = doc.splitTextToSize(disclaimerText, projChartWidth);
      doc.text(splitDisclaimer, projChartX, yPos + 6);
      
      yPos += 18;
    }
  }

  // 6. CARACTERÍSTICAS APLICADAS
  const appliedChars = state.responses.filter(r => r.response === 'sim' && r.weight_applied !== 0);
  if (appliedChars.length > 0) {
    // Check if we need a new page
    if (yPos > getMaxContentY() - 40) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 6;
    yPos = drawSectionTitle(doc, 'Caracteristicas Aplicadas', yPos, marginLeft);
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

  // 6. ESTRATÉGIA DE PRECIFICAÇÃO
  yPos += 4;
  
  // Se há dados da estratégia de precificação, exibir detalhadamente
  if (pricingStrategy && pricingStrategy.calculos) {
    // Check if we need a new page
    if (yPos > getMaxContentY() - 190) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos = drawSectionTitle(doc, 'Estratégia de Precificação', yPos, marginLeft);
    
    const { calculos, estrategiaSelecionada, estrategiaRecomendada, valorItbi, planoAjusteAtivo } = pricingStrategy;
    
    // Valor de referência
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`Valor de Referência (Avaliação): ${formatCurrencyPDF(valorItbi)}`, marginLeft, yPos);
    yPos += 8;
    
    // Cards das 3 estratégias
    const strategyCardHeight = 55;
    const strategyCardWidth = (contentWidth + 10) / 3 - 4;
    
    const strategies: { key: StrategyType; label: string; icon: string; color: [number, number, number]; bgColor: [number, number, number] }[] = [
      { key: 'atracao', label: 'ATRACAO', icon: '[!]', color: [59, 130, 246], bgColor: [239, 246, 255] },
      { key: 'mercado', label: 'MERCADO', icon: '[=]', color: [234, 88, 12], bgColor: [255, 247, 237] },
      { key: 'premium', label: 'PREMIUM', icon: '[+]', color: [139, 92, 246], bgColor: [250, 245, 255] },
    ];
    
    strategies.forEach((strategy, i) => {
      const cardX = marginLeft - 5 + (strategyCardWidth + 4) * i;
      const calculo = calculos[strategy.key];
      const isSelected = estrategiaSelecionada === strategy.key;
      const isRecommended = estrategiaRecomendada === strategy.key;
      
      // Card background
      doc.setFillColor(...strategy.bgColor);
      doc.setDrawColor(...strategy.color);
      doc.setLineWidth(isSelected ? 1.5 : 0.5);
      doc.roundedRect(cardX, yPos, strategyCardWidth, strategyCardHeight, 2, 2, 'FD');
      
      // Top bar
      doc.setFillColor(...strategy.color);
      doc.rect(cardX, yPos, strategyCardWidth, 4, 'F');
      
      // Header with icon and label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...strategy.color);
      let headerText = `${strategy.icon} ${strategy.label}`;
      if (isRecommended) headerText += ' *';
      if (isSelected) headerText += ' [OK]';
      doc.text(headerText, cardX + 3, yPos + 12);
      
      // Markup
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Markup: +${(calculo.percentual * 100).toFixed(0)}%`, cardX + 3, yPos + 19);
      
      // Preço de Anúncio
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...strategy.color);
      doc.text(formatCurrencyPDF(calculo.preco_anuncio), cardX + 3, yPos + 30);
      
      // Corretagem e Líquido
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Corretagem (6%): ${formatCurrencyPDF(calculo.corretagem)}`, cardX + 3, yPos + 38);
      doc.text(`Líquido: ${formatCurrencyPDF(calculo.liquido)}`, cardX + 3, yPos + 44);
      doc.text(`Prêmio vs Avaliação: +${calculo.premio_liquido_pct.toFixed(1)}%`, cardX + 3, yPos + 50);
    });
    
    yPos += strategyCardHeight + 8;
    
    // Legenda
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('* Estrategia Recomendada | [OK] Estrategia Selecionada', marginLeft, yPos);
    yPos += 8;
    
    // Detalhes da estratégia selecionada
    const selectedCalculo = calculos[estrategiaSelecionada];
    const selectedInfo = strategies.find(s => s.key === estrategiaSelecionada)!;
    
    // Box de destaque da seleção
    doc.setFillColor(...selectedInfo.bgColor);
    doc.setDrawColor(...selectedInfo.color);
    doc.setLineWidth(0.8);
    const selectedBoxHeight = 38;
    doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, selectedBoxHeight, 2, 2, 'FD');
    
    // Left accent bar
    doc.setFillColor(...selectedInfo.color);
    doc.rect(marginLeft - 5, yPos, 4, selectedBoxHeight, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...selectedInfo.color);
    doc.text(`Estratégia Selecionada: ${selectedInfo.icon} ${selectedInfo.label}`, marginLeft + 3, yPos + 8);
    
    // Grid de valores
    const detailColWidth = (contentWidth - 5) / 3;
    
    // Coluna 1: Anunciar por
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Anunciar por:', marginLeft + 3, yPos + 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...selectedInfo.color);
    doc.text(formatCurrencyPDF(selectedCalculo.preco_anuncio), marginLeft + 3, yPos + 24);
    
    // Coluna 2: Piso Planejado (97%)
    const col2X = marginLeft + 3 + detailColWidth;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Piso Planejado (97%):', col2X, yPos + 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(formatCurrencyPDF(selectedCalculo.piso_planejado), col2X, yPos + 24);
    
    // Coluna 3: Líquido Mínimo
    const col3X = marginLeft + 3 + detailColWidth * 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Líquido Mínimo:', col3X, yPos + 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(formatCurrencyPDF(selectedCalculo.liquido_min), col3X, yPos + 24);
    
    // Corretagem na linha de baixo
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Corretagem (6%): ${formatCurrencyPDF(selectedCalculo.corretagem)} | Líquido: ${formatCurrencyPDF(selectedCalculo.liquido)}`, marginLeft + 3, yPos + 33);
    
    yPos += selectedBoxHeight + 6;
    
    // Plano de Ajuste (se premium e ativo)
    if (estrategiaSelecionada === 'premium' && planoAjusteAtivo) {
      doc.setFillColor(250, 245, 255);
      doc.setDrawColor(139, 92, 246);
      doc.setLineWidth(0.3);
      const planoHeight = 22;
      doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, planoHeight, 2, 2, 'FD');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 92, 246);
      doc.text('[>] Plano de Ajuste Sugerido Ativo:', marginLeft, yPos + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text('30 dias: -4% | 60 dias: -4% adicional | 90 dias: migrar para MERCADO', marginLeft, yPos + 12);
      doc.text('Objetivo: maximizar valor com plano progressivo de ajuste caso necessário.', marginLeft, yPos + 17);
      
      yPos += planoHeight + 6;
    }
    
    // Tabela comparativa
    if (yPos > getMaxContentY() - 70) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Comparativo das Estratégias', marginLeft, yPos);
    yPos += 6;
    
    // Cabeçalho da tabela
    const tableColWidth = (contentWidth + 10) / 4;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginLeft - 5, yPos - 2, contentWidth + 10, 7, 1, 1, 'F');
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Métrica', marginLeft, yPos + 3);
    doc.text('ATRAÇÃO', marginLeft + tableColWidth, yPos + 3);
    doc.text('MERCADO', marginLeft + tableColWidth * 2, yPos + 3);
    doc.text('PREMIUM', marginLeft + tableColWidth * 3, yPos + 3);
    yPos += 8;
    
    // Linhas da tabela
    const tableRows = [
      ['Markup (%)', `+${(calculos.atracao.percentual * 100).toFixed(0)}%`, `+${(calculos.mercado.percentual * 100).toFixed(0)}%`, `+${(calculos.premium.percentual * 100).toFixed(0)}%`],
      ['Preço Anúncio', formatCurrencyPDF(calculos.atracao.preco_anuncio), formatCurrencyPDF(calculos.mercado.preco_anuncio), formatCurrencyPDF(calculos.premium.preco_anuncio)],
      ['Corretagem (6%)', formatCurrencyPDF(calculos.atracao.corretagem), formatCurrencyPDF(calculos.mercado.corretagem), formatCurrencyPDF(calculos.premium.corretagem)],
      ['Líquido', formatCurrencyPDF(calculos.atracao.liquido), formatCurrencyPDF(calculos.mercado.liquido), formatCurrencyPDF(calculos.premium.liquido)],
      ['Piso (97%)', formatCurrencyPDF(calculos.atracao.piso_planejado), formatCurrencyPDF(calculos.mercado.piso_planejado), formatCurrencyPDF(calculos.premium.piso_planejado)],
      ['Líq. Mínimo', formatCurrencyPDF(calculos.atracao.liquido_min), formatCurrencyPDF(calculos.mercado.liquido_min), formatCurrencyPDF(calculos.premium.liquido_min)],
      ['Prêmio vs Aval.', `+${calculos.atracao.premio_liquido_pct.toFixed(1)}%`, `+${calculos.mercado.premio_liquido_pct.toFixed(1)}%`, `+${calculos.premium.premio_liquido_pct.toFixed(1)}%`],
    ];
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    
    tableRows.forEach((row, rowIndex) => {
      // Alternar cor de fundo
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginLeft - 5, yPos - 2, contentWidth + 10, 5, 'F');
      }
      
      doc.setTextColor(71, 85, 105);
      doc.text(row[0], marginLeft, yPos + 2);
      
      // Destacar coluna selecionada
      strategies.forEach((strategy, colIndex) => {
        const isSelectedCol = strategy.key === estrategiaSelecionada;
        if (isSelectedCol) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...strategy.color);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
        }
        doc.text(row[colIndex + 1], marginLeft + tableColWidth * (colIndex + 1), yPos + 2);
      });
      
      yPos += 5;
    });
    
    yPos += 4;
    
  } else {
    // Fallback: estratégia simples - padronizada com cards individuais
    yPos = drawSectionTitle(doc, 'Estratégia de Preço', yPos, marginLeft);
    
    const listPrice = Math.round(result.provavel * 1.05);
    
    // Cards de 3 colunas padronizados
    const strategyCardHeight = 50;
    const strategyCardWidth = (contentWidth + 10) / 3 - 4;
    
    const priceCards = [
      { label: 'Anunciar por', value: listPrice, sublabel: 'margem de negociação', color: [202, 138, 4] as [number, number, number], bgColor: [254, 252, 232] as [number, number, number] },
      { label: 'Valor Target', value: result.provavel, sublabel: 'expectativa de fechamento', color: [22, 163, 74] as [number, number, number], bgColor: [240, 253, 244] as [number, number, number] },
      { label: 'Mínimo Aceitável', value: result.pessimista, sublabel: 'piso de negociação', color: [220, 38, 38] as [number, number, number], bgColor: [254, 242, 242] as [number, number, number] },
    ];
    
    priceCards.forEach((card, i) => {
      const cardX = marginLeft - 5 + (strategyCardWidth + 4) * i;
      
      // Card background
      doc.setFillColor(...card.bgColor);
      doc.setDrawColor(...card.color);
      doc.setLineWidth(0.5);
      doc.roundedRect(cardX, yPos, strategyCardWidth, strategyCardHeight, 3, 3, 'FD');
      
      // Colored top bar
      doc.setFillColor(...card.color);
      doc.rect(cardX, yPos, strategyCardWidth, 5, 'F');
      
      // Label - padronizado 10pt
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(card.label, cardX + strategyCardWidth / 2, yPos + 16, { align: 'center' });
      
      // Value - padronizado 14pt
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...card.color);
      doc.text(formatCurrencyPDF(card.value), cardX + strategyCardWidth / 2, yPos + 30, { align: 'center' });
      
      // Sublabel - padronizado 8pt
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`(${card.sublabel})`, cardX + strategyCardWidth / 2, yPos + 40, { align: 'center' });
    });
    
    yPos += strategyCardHeight + 8;
  }

  // 7. RECOMENDAÇÃO
  // Check if we need a new page for recommendation section
  if (yPos > getMaxContentY() - 50) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 6;
  
  // Determina cor de fundo baseada no status
  const getRecColor = (status: string): [number, number, number] => {
    switch (status) {
      case "READY_TO_MARKET": return [240, 253, 244]; // Verde claro
      case "WAIT_30_DAYS": return [239, 246, 255]; // Azul claro
      case "REGULARIZE_FIRST": return [254, 249, 195]; // Amarelo claro
      case "REVIEW_PRICING": return [255, 237, 213]; // Laranja claro
      case "CONSULT_SPECIALIST": 
      case "NEED_SPECIALIST_VALUATION":
      case "INSUFFICIENT_SAMPLE":
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
  if (yPos > getMaxContentY() - 40) {
    doc.addPage();
    yPos = 20;
  }

  // 8. DISCLAIMER ADICIONAL PARA AVALIAÇÃO SIMPLIFICADA
  if (isSimplified) {
    // Check if we need a new page
    if (yPos > getMaxContentY() - 50) {
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

  // 9. OBSERVAÇÕES E DADOS ADICIONAIS (apenas no relatório completo)
  if (!isSimplified && state.observacoesImovel && state.observacoesImovel.trim()) {
    if (yPos > getMaxContentY() - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos = drawSectionTitle(doc, 'Observações e Dados Adicionais', yPos, marginLeft);
    yPos += 2;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    const obsLines = doc.splitTextToSize(state.observacoesImovel.trim(), contentWidth);
    const obsHeight = obsLines.length * 4.5 + 10;
    
    // Box de fundo
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft - 3, yPos - 3, contentWidth + 6, obsHeight, 2, 2, 'FD');
    
    obsLines.forEach((line: string, i: number) => {
      doc.text(line, marginLeft, yPos + 4 + (i * 4.5));
    });
    
    yPos += obsHeight + 5;
  }

  // 10. DISCLAIMER PADRÃO
  drawDisclaimer(doc, yPos, marginLeft);

  // 10. GLOSSÁRIO DE TERMOS TÉCNICOS
  doc.addPage();
  yPos = 20;
  
  yPos = drawSectionTitle(doc, 'Glossário de Termos Técnicos', yPos, marginLeft);
  
  const glossaryItems = [
    {
      term: 'Valor Provável',
      definition: 'Valor mais provável de venda do imóvel: mediana do R$/m² das transações oficiais da região, ponderada pelo número de escrituras, aplicada à área e ajustada pelas características e documentação.'
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
      term: 'Dados Oficiais de Transações',
      definition: 'Base de dados de transações imobiliárias registradas junto à Secretaria Municipal de Fazenda. Reflete valores reais de compra e venda.'
    },
    {
      term: 'Ajuste Total',
      definition: 'Percentual de valorização ou desvalorização aplicado com base nas características do imóvel (acabamento, vista, estado de conservação, etc.).'
    },
    {
      term: 'Spread',
      definition: 'Diferença percentual entre o valor pessimista (P10) e o otimista (P90), relativa ao provável. Mede a dispersão real dos preços na região; quanto menor, mais homogêneo o mercado.'
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

  return doc;
}

// Export function that saves the PDF to disk
export function exportValuationEnginePDF(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null,
  anuncioFontes?: AnuncioFonte[],
  pricingStrategy?: PricingStrategyPDFData | null
): void {
  const doc = createValuationPDF(result, state, combined, anuncioFontes, pricingStrategy);
  
  const isSimplified = state.tipoAvaliacao === "simples";
  const tipoSuffix = isSimplified ? '_simplificada' : '';
  const filename = `avaliacao${tipoSuffix}_${state.logradouro?.replace(/\s+/g, '_').substring(0, 25) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// Generate PDF for email (returns jsPDF object without saving)
export function generateValuationPDFForEmail(
  result: ValuationResult,
  state: ValuationState,
  combined: CombinedPrices | null,
  anuncioFontes?: AnuncioFonte[],
  pricingStrategy?: PricingStrategyPDFData | null
): jsPDF {
  return createValuationPDF(result, state, combined, anuncioFontes, pricingStrategy);
}

// Get the filename for the PDF
export function getValuationPDFFilename(state: ValuationState): string {
  const isSimplified = state.tipoAvaliacao === "simples";
  const tipoSuffix = isSimplified ? '_simplificada' : '';
  return `avaliacao${tipoSuffix}_${state.logradouro?.replace(/\s+/g, '_').substring(0, 25) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
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
