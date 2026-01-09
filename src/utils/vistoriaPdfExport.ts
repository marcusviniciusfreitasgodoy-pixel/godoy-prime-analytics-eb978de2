import jsPDF from 'jspdf';
import { drawGodoyHeader, drawSectionTitle, applyFootersToAllPages, BRAND_COLORS, getMaxContentY, drawResultBox } from './pdfTemplate';
import { calculateVistoriaAdjustment, calculateAdjustedValues } from '@/components/vistoria/VistoriaAvaliacaoComparativo';

interface ChecklistItem {
  id: string;
  label: string;
  tooltip?: string;
  score: 1 | 2 | 3 | 4 | 5 | 'na' | null;
}

interface ChecklistCategory {
  id: string;
  title: string;
  weight: number;
  items: ChecklistItem[];
}

interface PropertyData {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  nomeCondominio: string;
  tipoImovel: string;
  areaM2: string;
  quartos: string;
  suites: string;
  banheiros: string;
  vagas: string;
  proprietario: string;
  telefone: string;
  vistoriador: string;
  dataVistoria: string;
  observacoes: string;
}

interface PhotoItem {
  id: string;
  categoryId: string;
  itemId: string;
  dataUrl: string;
  timestamp: string;
  caption: string;
}

// Dados completos da avaliação para relatório integrado
interface AvaliacaoData {
  valorProvavel: number;
  valorPessimista: number;
  valorOtimista: number;
  confidenceLevel: string;
  confidenceScore?: number;
  dataAvaliacao: string;
  // Dados de mercado (opcionais para compatibilidade)
  itbiMinM2?: number;
  itbiMedM2?: number;
  itbiMaxM2?: number;
  transactionCount?: number;
  trendPercentage?: number;
  trendDirection?: string;
  // Fonte dos anúncios
  anuncioFontes?: string[];
  // Ajustes
  totalAdjustment?: number;
  spreadPercentage?: number;
  // Recomendação
  recommendationTitle?: string;
  recommendationMessage?: string;
}

// Fontes dos anúncios para rastreabilidade
interface AnuncioFonte {
  valor: number;
  area: number;
  fonte?: string;
}

interface VistoriaPDFParams {
  propertyData: PropertyData;
  checklist: ChecklistCategory[];
  photos: PhotoItem[];
  tipoVistoria: 'casa' | 'apartamento' | null;
  finalScore: number;
  progress: number;
  criticalCount: number;
  avaliacaoData?: AvaliacaoData | null;
  anuncioFontes?: AnuncioFonte[];
}

const scoreLabels: Record<number | string, { label: string; color: [number, number, number] }> = {
  5: { label: 'Excelente', color: [5, 150, 105] },
  4: { label: 'Bom', color: [34, 197, 94] },
  3: { label: 'Adequado', color: [234, 179, 8] },
  2: { label: 'Atenção', color: [249, 115, 22] },
  1: { label: 'Crítico', color: [220, 38, 38] },
  'na': { label: 'N/A', color: [148, 163, 184] },
};

// Calculate category average scores for radar chart
function calculateCategoryScores(checklist: ChecklistCategory[]): { name: string; score: number; weight: number }[] {
  return checklist.map(category => {
    const scoredItems = category.items.filter(item => item.score !== null && item.score !== 'na');
    if (scoredItems.length === 0) return { name: category.title.replace(/^\d+\.\s*/, ''), score: 0, weight: category.weight };
    
    const sum = scoredItems.reduce((acc, item) => acc + (item.score as number), 0);
    const avg = (sum / scoredItems.length) * 20; // Convert 1-5 to 0-100 scale
    return { name: category.title.replace(/^\d+\.\s*/, ''), score: Math.round(avg), weight: category.weight };
  }).filter(cat => cat.score > 0);
}

// Draw radar chart on PDF
function drawRadarChart(doc: jsPDF, centerX: number, centerY: number, radius: number, categoryScores: { name: string; score: number }[]): void {
  if (categoryScores.length < 3) return;
  
  const numCategories = Math.min(categoryScores.length, 8); // Limit to 8 categories for readability
  const topCategories = categoryScores.slice(0, numCategories);
  const angleStep = (2 * Math.PI) / numCategories;
  
  // Draw background circles (20, 40, 60, 80, 100)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    drawPolygon(doc, centerX, centerY, r, numCategories, false);
  }
  
  // Draw axis lines
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  for (let i = 0; i < numCategories; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    doc.line(centerX, centerY, x, y);
  }
  
  // Draw data polygon
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setFillColor(212, 175, 55, 0.3);
  doc.setLineWidth(1.5);
  
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < numCategories; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const scoreRadius = (topCategories[i].score / 100) * radius;
    const x = centerX + Math.cos(angle) * scoreRadius;
    const y = centerY + Math.sin(angle) * scoreRadius;
    points.push({ x, y });
  }
  
  // Draw filled polygon
  if (points.length >= 3) {
    doc.setFillColor(212, 175, 55);
    doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
    doc.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      doc.lineTo(points[i].x, points[i].y);
    }
    doc.lineTo(points[0].x, points[0].y);
    doc.fill();
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    
    // Draw outline
    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(1.5);
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      doc.line(points[i].x, points[i].y, points[next].x, points[next].y);
    }
    
    // Draw points
    doc.setFillColor(...BRAND_COLORS.gold);
    for (const point of points) {
      doc.circle(point.x, point.y, 2, 'F');
    }
  }
  
  // Draw category labels
  doc.setFontSize(6);
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFont('helvetica', 'bold');
  
  for (let i = 0; i < numCategories; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const labelRadius = radius + 12;
    const x = centerX + Math.cos(angle) * labelRadius;
    const y = centerY + Math.sin(angle) * labelRadius;
    
    // Truncate long names
    let name = topCategories[i].name;
    if (name.length > 12) name = name.substring(0, 11) + '...';
    
    // Adjust text alignment based on position
    let align: 'center' | 'left' | 'right' = 'center';
    if (Math.cos(angle) < -0.3) align = 'right';
    else if (Math.cos(angle) > 0.3) align = 'left';
    
    doc.text(name, x, y, { align });
  }
}

function drawPolygon(doc: jsPDF, cx: number, cy: number, r: number, sides: number, fill: boolean = false): void {
  const angleStep = (2 * Math.PI) / sides;
  const points: { x: number; y: number }[] = [];
  
  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }
  
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    doc.line(points[i].x, points[i].y, points[next].x, points[next].y);
  }
}

export async function generateVistoriaPDFDoc(params: VistoriaPDFParams): Promise<jsPDF> {
  const { propertyData, checklist, photos, tipoVistoria, finalScore, progress, criticalCount, avaliacaoData, anuncioFontes } = params;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const contentWidth = pageWidth - marginLeft * 2;
  
  // Helper function
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  
  // ========== IF AVALIAÇÃO EXISTS: START WITH COMPLETE VALUATION REPORT ==========
  if (avaliacaoData && avaliacaoData.itbiMedM2) {
    // Page 1: Complete Valuation Report
    let yPos = drawGodoyHeader(doc, 'Relatório Integrado: Avaliação + Vistoria');
    
    // Badge: Relatório Completo
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(pageWidth / 2 - 40, yPos - 5, 80, 12, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('RELATÓRIO COMPLETO', pageWidth / 2, yPos + 2, { align: 'center' });
    yPos += 12;
    
    // Result Box (main values)
    yPos = drawResultBox(
      doc,
      'RESULTADO DA AVALIAÇÃO',
      formatCurrency(avaliacaoData.valorProvavel),
      'Valor Provável de Mercado',
      'Pessimista',
      formatCurrency(avaliacaoData.valorPessimista),
      'Otimista',
      formatCurrency(avaliacaoData.valorOtimista),
      yPos,
      marginLeft
    );
    
    // Market Reference Section
    yPos = drawSectionTitle(doc, 'Referência de Mercado', yPos, marginLeft);
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    const marketData = [
      ['Preço Mínimo/m²:', `R$ ${avaliacaoData.itbiMinM2?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) || '-'}`],
      ['Preço Médio/m²:', `R$ ${avaliacaoData.itbiMedM2?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) || '-'}`],
      ['Preço Máximo/m²:', `R$ ${avaliacaoData.itbiMaxM2?.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) || '-'}`],
      ['Transações ITBI:', `${avaliacaoData.transactionCount || '-'} (últimos 12 meses)`],
    ];
    
    if (avaliacaoData.trendPercentage !== undefined) {
      const trendLabel = avaliacaoData.trendDirection === 'UP' ? 'Alta' : avaliacaoData.trendDirection === 'DOWN' ? 'Baixa' : 'Estável';
      marketData.push(['Tendência:', `${avaliacaoData.trendPercentage > 0 ? '+' : ''}${avaliacaoData.trendPercentage.toFixed(1)}% (${trendLabel})`]);
    }
    
    marketData.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.text(item[0], marginLeft + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], marginLeft + 50, yPos);
      yPos += 5;
    });
    
    // Fontes dos Anúncios (se disponíveis)
    const fontes = anuncioFontes?.filter(f => f.fonte && f.fonte.trim() !== '') || [];
    if (fontes.length > 0 || (avaliacaoData.anuncioFontes && avaliacaoData.anuncioFontes.length > 0)) {
      yPos += 5;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 8 + (fontes.length * 4), 2, 2, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.navy);
      doc.text('Fontes dos Anúncios de Referência:', marginLeft, yPos + 3);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...BRAND_COLORS.gray);
      
      if (fontes.length > 0) {
        fontes.forEach((f, i) => {
          const valorM2 = f.valor / f.area;
          const text = `${i + 1}. R$ ${f.valor.toLocaleString('pt-BR')} | ${f.area}m² | R$ ${valorM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m² → ${f.fonte}`;
          const splitText = doc.splitTextToSize(text, contentWidth - 10);
          doc.text(splitText[0], marginLeft, yPos);
          yPos += 4;
        });
      } else if (avaliacaoData.anuncioFontes) {
        avaliacaoData.anuncioFontes.forEach((fonte, i) => {
          const splitText = doc.splitTextToSize(`${i + 1}. ${fonte}`, contentWidth - 10);
          doc.text(splitText[0], marginLeft, yPos);
          yPos += 4;
        });
      }
      yPos += 3;
    }
    
    // Metrics
    yPos += 3;
    yPos = drawSectionTitle(doc, 'Métricas de Confiança', yPos, marginLeft);
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    const confidenceLabel = avaliacaoData.confidenceLevel === 'green' ? 'ALTA' :
                            avaliacaoData.confidenceLevel === 'yellow_high' ? 'MÉDIA-ALTA' :
                            avaliacaoData.confidenceLevel === 'yellow_medium' ? 'MÉDIA' : 'BAIXA';
    
    const metrics = [
      ['Ajuste Total:', `${(avaliacaoData.totalAdjustment || 0) >= 0 ? '+' : ''}${((avaliacaoData.totalAdjustment || 0) * 100).toFixed(1)}%`],
      ['Spread:', `${(avaliacaoData.spreadPercentage || 0).toFixed(1)}%`],
      ['Score:', `${avaliacaoData.confidenceScore || '-'}/100`],
      ['Nível:', confidenceLabel],
    ];
    
    metrics.forEach((item) => {
      doc.setFont('helvetica', 'normal');
      doc.text(item[0], marginLeft + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], marginLeft + 50, yPos);
      yPos += 5;
    });
    
    // Recommendation
    if (avaliacaoData.recommendationTitle) {
      yPos += 5;
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(...BRAND_COLORS.gold);
      doc.setLineWidth(0.5);
      const recHeight = 16 + (avaliacaoData.recommendationMessage ? doc.splitTextToSize(avaliacaoData.recommendationMessage, contentWidth - 10).length * 4 : 0);
      doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, recHeight, 2, 2, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.navy);
      doc.text(`RECOMENDAÇÃO: ${avaliacaoData.recommendationTitle}`, marginLeft, yPos + 5);
      
      if (avaliacaoData.recommendationMessage) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BRAND_COLORS.darkGray);
        const splitRec = doc.splitTextToSize(avaliacaoData.recommendationMessage, contentWidth - 10);
        doc.text(splitRec, marginLeft, yPos + 12);
      }
      
      yPos += recHeight + 5;
    }
    
    // Date of valuation
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`Data da Avaliação: ${new Date(avaliacaoData.dataAvaliacao).toLocaleDateString('pt-BR')}`, marginLeft, yPos);
    
    // ========== NEW PAGE: VISTORIA SECTION ==========
    doc.addPage();
  }
  
  // ========== VISTORIA COVER PAGE ==========
  let yPos = drawGodoyHeader(doc, avaliacaoData?.itbiMedM2 ? 'Complemento: Vistoria Digital' : 'Relatório de Vistoria Digital');
  
  // Property type badge
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.text(`Tipo: ${tipoVistoria === 'casa' ? 'Casa' : 'Apartamento'}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // ========== SUMMARY BOX ==========
  const summaryBoxHeight = 50;
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, summaryBoxHeight, 3, 3, 'F');
  
  // Score in center
  const scoreColor = finalScore >= 80 ? [5, 150, 105] : finalScore >= 60 ? [234, 179, 8] : [220, 38, 38];
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(scoreColor as [number, number, number]));
  doc.text(`${finalScore}`, pageWidth / 2, yPos + 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text('SCORE FINAL', pageWidth / 2, yPos + 35, { align: 'center' });
  
  // Left: Progress
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_COLORS.gold);
  doc.text(`${progress}%`, marginLeft + 15, yPos + 22);
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('Progresso', marginLeft + 15, yPos + 30);
  
  // Right: Critical count
  if (criticalCount > 0) {
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text(`${criticalCount}`, pageWidth - marginLeft - 15, yPos + 22, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('Críticos', pageWidth - marginLeft - 15, yPos + 30, { align: 'right' });
  }
  
  yPos += summaryBoxHeight + 15;
  
  // ========== RADAR CHART ==========
  const categoryScores = calculateCategoryScores(checklist);
  if (categoryScores.length >= 3) {
    yPos = drawSectionTitle(doc, 'Diagnóstico por Categoria', yPos, marginLeft);
    
    const radarCenterX = pageWidth / 2;
    const radarCenterY = yPos + 45;
    const radarRadius = 35;
    
    drawRadarChart(doc, radarCenterX, radarCenterY, radarRadius, categoryScores);
    
    yPos = radarCenterY + radarRadius + 25;
  }
  
  // ========== PROPERTY IDENTIFICATION ==========
  // Check if there's enough space for the property info section (needs ~50mm)
  if (yPos > getMaxContentY() - 55) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos = drawSectionTitle(doc, 'Identificação do Imóvel', yPos, marginLeft);
  
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLORS.darkGray);
  
  const configuracao = [
    propertyData.quartos ? `${propertyData.quartos} Qts` : null,
    propertyData.suites ? `${propertyData.suites} Stes` : null,
    propertyData.banheiros ? `${propertyData.banheiros} Bnh` : null,
    propertyData.vagas ? `${propertyData.vagas} Vgs` : null,
  ].filter(Boolean).join(' | ');
  
  const propertyInfo = [
    ['Endereço:', `${propertyData.logradouro || 'Não informado'}${propertyData.numero ? ', ' + propertyData.numero : ''}${propertyData.complemento ? ' - ' + propertyData.complemento : ''}`],
    ['Condomínio:', propertyData.nomeCondominio || '-'],
    ['Bairro:', propertyData.bairro || 'Não informado'],
    ['Tipo:', propertyData.tipoImovel || 'Não informado'],
    ['Área:', propertyData.areaM2 ? `${propertyData.areaM2} m²` : 'Não informada'],
    ['Configuração:', configuracao || 'Não informada'],
    ['Vistoriador:', propertyData.vistoriador || 'Não informado'],
    ['Data:', propertyData.dataVistoria ? new Date(propertyData.dataVistoria).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')],
  ];
  
  propertyInfo.forEach(([label, value]) => {
    // Check if we need a page break before each line
    if (yPos > getMaxContentY() - 8) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.text(label, marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    const splitValue = doc.splitTextToSize(value, contentWidth - 45);
    doc.text(splitValue[0], marginLeft + 35, yPos);
    yPos += 5;
  });
  
  // ========== VALUATION REFERENCE (if available) ==========
  if (avaliacaoData) {
    yPos += 5;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, 20, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Valores de Referência da Avaliação', marginLeft, yPos + 6);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    doc.text(`Pessimista: ${formatCurrency(avaliacaoData.valorPessimista)}`, marginLeft, yPos + 13);
    doc.text(`Provável: ${formatCurrency(avaliacaoData.valorProvavel)}`, marginLeft + 50, yPos + 13);
    doc.text(`Otimista: ${formatCurrency(avaliacaoData.valorOtimista)}`, marginLeft + 100, yPos + 13);
    
    yPos += 25;
    
    // ========== COMPARATIVO AVALIAÇÃO vs VISTORIA ==========
    const adjusted = calculateAdjustedValues(avaliacaoData, finalScore);
    
    // Check if we need a new page
    if (yPos > getMaxContentY() - 70) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos = drawSectionTitle(doc, 'Comparativo: Avaliação vs Vistoria', yPos, marginLeft);
    
    // Box with adjusted values
    const compBoxHeight = 55;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...BRAND_COLORS.navy);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, compBoxHeight, 2, 2, 'FD');
    
    // Score and adjustment header
    const adjColor = adjusted.adjustment.adjustment >= 0 ? [5, 150, 105] : [220, 38, 38];
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Score Vistoria:', marginLeft, yPos + 8);
    doc.setTextColor(...(adjColor as [number, number, number]));
    doc.text(`${finalScore}/100 (${adjusted.adjustment.label})`, marginLeft + 30, yPos + 8);
    
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Ajuste Aplicado:', marginLeft + 90, yPos + 8);
    doc.setTextColor(...(adjColor as [number, number, number]));
    const adjSign = adjusted.diferencaPercentual >= 0 ? '+' : '';
    doc.text(`${adjSign}${adjusted.diferencaPercentual.toFixed(1)}%`, marginLeft + 120, yPos + 8);
    
    // Comparison table header
    yPos += 16;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text('CENÁRIO', marginLeft + 2, yPos);
    doc.text('AVALIAÇÃO', marginLeft + 40, yPos);
    doc.text('PÓS-VISTORIA', marginLeft + 80, yPos);
    doc.text('DIFERENÇA', marginLeft + 125, yPos);
    
    // Table rows
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    // Pessimista
    doc.text('Pessimista', marginLeft + 2, yPos);
    doc.text(formatCurrency(avaliacaoData.valorPessimista), marginLeft + 40, yPos);
    doc.text(formatCurrency(adjusted.valorPessimistaAjustado), marginLeft + 80, yPos);
    doc.setTextColor(...(adjColor as [number, number, number]));
    doc.text(`${adjSign}${adjusted.diferencaPercentual.toFixed(1)}%`, marginLeft + 125, yPos);
    
    // Provável (highlighted)
    yPos += 7;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(marginLeft - 3, yPos - 3.5, contentWidth + 6, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Provável', marginLeft + 2, yPos);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(formatCurrency(avaliacaoData.valorProvavel), marginLeft + 40, yPos);
    doc.setTextColor(5, 150, 105);
    doc.text(formatCurrency(adjusted.valorProvavelAjustado), marginLeft + 80, yPos);
    doc.setTextColor(...(adjColor as [number, number, number]));
    doc.text(`${adjSign}${adjusted.diferencaPercentual.toFixed(1)}%`, marginLeft + 125, yPos);
    
    // Otimista
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.text('Otimista', marginLeft + 2, yPos);
    doc.text(formatCurrency(avaliacaoData.valorOtimista), marginLeft + 40, yPos);
    doc.text(formatCurrency(adjusted.valorOtimistaAjustado), marginLeft + 80, yPos);
    doc.setTextColor(...(adjColor as [number, number, number]));
    doc.text(`${adjSign}${adjusted.diferencaPercentual.toFixed(1)}%`, marginLeft + 125, yPos);
    
    // Justification note
    yPos += 12;
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(marginLeft - 5, yPos - 3, contentWidth + 10, 14, 2, 2, 'F');
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('METODOLOGIA:', marginLeft, yPos + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const justification = finalScore >= 70 
      ? `Estado físico acima do esperado (score ${finalScore}). Prêmio de ${adjusted.diferencaPercentual.toFixed(1)}% aplicado.`
      : finalScore >= 50
        ? `Estado físico adequado (score ${finalScore}). Ajuste mínimo de ${adjusted.diferencaPercentual.toFixed(1)}%.`
        : `Pendências identificadas (score ${finalScore}). Desconto de ${Math.abs(adjusted.diferencaPercentual).toFixed(1)}% para cobrir reparos.`;
    doc.text(justification, marginLeft + 22, yPos + 2);
    
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text('Score da vistoria (0-100) aplica ajuste de -15% a +10% sobre o valor da avaliação prévia.', marginLeft, yPos + 8);
    
    yPos += 20;
  }
  
  // ========== TOP 5 CRITICAL ITEMS ==========
  const criticalItems: { category: string; label: string; score: number }[] = [];
  checklist.forEach(cat => {
    cat.items.forEach(item => {
      if (item.score === 1 || item.score === 2) {
        criticalItems.push({ category: cat.title, label: item.label, score: item.score });
      }
    });
  });
  
  if (criticalItems.length > 0) {
    yPos += 3;
    yPos = drawSectionTitle(doc, 'Pontos Críticos', yPos, marginLeft);
    
    criticalItems.slice(0, 5).forEach((item) => {
      if (yPos > getMaxContentY() - 15) return;
      
      const config = scoreLabels[item.score];
      doc.setFillColor(...config.color);
      doc.circle(marginLeft + 3, yPos - 1, 1.5, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      doc.setFont('helvetica', 'normal');
      const text = doc.splitTextToSize(item.label, contentWidth - 12);
      doc.text(text[0], marginLeft + 8, yPos);
      yPos += 6;
    });
  }
  
  // ========== PAGE 2+: CHECKLIST DETAILS ==========
  doc.addPage();
  yPos = 20;
  
  yPos = drawSectionTitle(doc, 'Checklist Detalhado', yPos, marginLeft);
  
  for (const category of checklist) {
    const scoredItems = category.items.filter(i => i.score !== null);
    if (scoredItems.length === 0) continue;
    
    if (yPos > getMaxContentY() - 25) {
      doc.addPage();
      yPos = 20;
    }
    
    // Category header
    doc.setFillColor(...BRAND_COLORS.lightGray);
    doc.rect(marginLeft - 5, yPos - 3, contentWidth + 10, 7, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text(category.title, marginLeft, yPos + 1);
    yPos += 8;
    
    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    for (const item of category.items) {
      if (item.score === null) continue;
      
      if (yPos > getMaxContentY() - 8) {
        doc.addPage();
        yPos = 20;
      }
      
      const config = scoreLabels[item.score];
      
      // Score badge
      doc.setFillColor(...config.color);
      doc.roundedRect(marginLeft, yPos - 2.5, 10, 4, 1, 1, 'F');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(item.score === 'na' ? 'N/A' : String(item.score), marginLeft + 5, yPos, { align: 'center' });
      
      // Item label
      doc.setFontSize(8);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      const splitLabel = doc.splitTextToSize(item.label, contentWidth - 20);
      doc.text(splitLabel[0], marginLeft + 14, yPos);
      yPos += 5;
    }
    
    yPos += 3;
  }
  
  // ========== PHOTOS SECTION (if any) ==========
  if (photos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    yPos = drawSectionTitle(doc, 'Registro Fotográfico', yPos, marginLeft);
    
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`${photos.length} foto(s) registrada(s)`, marginLeft, yPos);
    yPos += 8;
    
    const imgWidth = 50;
    const imgHeight = 38;
    let xPos = marginLeft;
    
    for (const photo of photos) {
      if (xPos + imgWidth > pageWidth - marginLeft) {
        xPos = marginLeft;
        yPos += imgHeight + 12;
      }
      
      if (yPos + imgHeight > getMaxContentY()) {
        doc.addPage();
        yPos = 20;
        xPos = marginLeft;
      }
      
      try {
        doc.addImage(photo.dataUrl, 'JPEG', xPos, yPos, imgWidth, imgHeight);
        
        // Caption
        doc.setFontSize(5);
        doc.setTextColor(80, 80, 80);
        const captionLines = doc.splitTextToSize(photo.caption, imgWidth);
        doc.text(captionLines.slice(0, 2), xPos, yPos + imgHeight + 3);
        
        xPos += imgWidth + 6;
      } catch (imgError) {
        console.error('Error adding image:', imgError);
        xPos += imgWidth + 6;
      }
    }
  }
  
  // ========== OBSERVATIONS (if any) ==========
  if (propertyData.observacoes) {
    if (yPos > getMaxContentY() - 30) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 8;
    yPos = drawSectionTitle(doc, 'Observações Gerais', yPos, marginLeft);
    
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.darkGray);
    const splitObs = doc.splitTextToSize(propertyData.observacoes, contentWidth);
    doc.text(splitObs.slice(0, 10), marginLeft, yPos);
    yPos += splitObs.length * 4 + 8;
  }
  
  // ========== GLOSSÁRIO ==========
  doc.addPage();
  yPos = 20;
  
  yPos = drawSectionTitle(doc, 'Glossário de Termos Técnicos', yPos, marginLeft);
  
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  
  const glossaryItems = [
    {
      term: 'Score Final (0-100)',
      definition: 'Pontuação geral do imóvel calculada com base na média ponderada de todas as categorias avaliadas. Quanto maior o score, melhor o estado geral do imóvel.'
    },
    {
      term: 'Itens Críticos',
      definition: 'Quantidade de itens que receberam nota 1 (crítico) ou 2 (atenção) na vistoria. Estes itens necessitam de intervenção prioritária.'
    },
    {
      term: 'Ajuste Percentual',
      definition: 'Percentual de valorização ou desvalorização aplicado ao valor da avaliação prévia com base no resultado da vistoria. Scores altos valorizam, scores baixos desvalorizam.'
    },
    {
      term: 'Valor Avaliação (Prévia)',
      definition: 'Valor estimado do imóvel antes da vistoria, calculado com base em transações de mercado (ITBI), anúncios e características informadas.'
    },
    {
      term: 'Valor Ajustado (Pós-Vistoria)',
      definition: 'Valor final recomendado após aplicação do ajuste da vistoria sobre o valor de avaliação prévia. Reflete o estado real do imóvel.'
    },
    {
      term: 'Escala de Avaliação',
      definition: '5 = Excelente (estado perfeito), 4 = Bom (pequenos desgastes), 3 = Adequado (uso normal), 2 = Atenção (necessita manutenção), 1 = Crítico (necessita reforma).'
    },
    {
      term: 'Categorias de Vistoria',
      definition: 'Agrupamentos temáticos dos itens vistoriados: Estrutura, Hidráulica, Elétrica, Acabamentos, etc. Cada categoria tem um peso diferente no cálculo do score final.'
    },
    {
      term: 'Peso da Categoria',
      definition: 'Importância relativa de cada categoria no cálculo do score final. Categorias estruturais têm maior peso que categorias estéticas.'
    },
    {
      term: 'ITBI (Imposto de Transmissão)',
      definition: 'Base de dados oficial de transações imobiliárias registradas na prefeitura, utilizada como referência de valores de mercado.'
    },
    {
      term: 'Spread',
      definition: 'Diferença percentual entre o valor mínimo e máximo estimados. Quanto menor o spread, maior a precisão da avaliação.'
    },
    {
      term: 'Confiança da Avaliação',
      definition: 'Nível de certeza da estimativa: Alta (muitos dados comparáveis), Média-Alta, Média ou Baixa (poucos dados disponíveis).'
    },
    {
      term: 'Tendência de Mercado',
      definition: 'Variação percentual dos preços na região nos últimos meses. Positiva indica valorização, negativa indica desvalorização.'
    }
  ];
  
  glossaryItems.forEach((item, index) => {
    if (yPos > getMaxContentY() - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    // Term
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.gold);
    doc.text(`• ${item.term}`, marginLeft, yPos);
    
    // Definition
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitDef = doc.splitTextToSize(item.definition, contentWidth - 10);
    doc.text(splitDef, marginLeft + 5, yPos + 5);
    
    yPos += 5 + (splitDef.length * 3.5) + 4;
  });
  
  // Nota final do glossário
  if (yPos > getMaxContentY() - 25) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 5;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, 18, 2, 2, 'FD');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('Nota Importante', marginLeft, yPos + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const noteText = 'Este relatório é uma ferramenta de apoio à decisão e não substitui uma avaliação formal realizada por profissional habilitado (engenheiro ou arquiteto com registro no CREA/CAU). Os valores apresentados são estimativas baseadas em dados de mercado e na vistoria visual do imóvel.';
  const splitNote = doc.splitTextToSize(noteText, contentWidth + 5);
  doc.text(splitNote, marginLeft, yPos + 10);
  
  // Apply footers to all pages
  applyFootersToAllPages(doc);
  
  return doc;
}

// Wrapper function that saves the PDF (original behavior)
export async function generateVistoriaPDF(params: VistoriaPDFParams): Promise<void> {
  const doc = await generateVistoriaPDFDoc(params);
  const filename = `vistoria_${params.propertyData.logradouro?.replace(/\s+/g, '_').substring(0, 20) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
