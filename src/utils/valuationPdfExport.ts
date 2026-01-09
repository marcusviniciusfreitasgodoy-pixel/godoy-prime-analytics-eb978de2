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

  // 4. MÉTRICAS DE CONFIANÇA
  // Verificar se há espaço suficiente para a seção (título + 4 métricas = ~35mm)
  if (yPos > getMaxContentY() - 35) {
    doc.addPage();
    yPos = 20;
  }
  
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
