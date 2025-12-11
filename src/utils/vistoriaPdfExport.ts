import jsPDF from 'jspdf';
import { drawGodoyHeader, drawSectionTitle, applyFootersToAllPages, BRAND_COLORS, getMaxContentY } from './pdfTemplate';

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

interface AvaliacaoData {
  valorProvavel: number;
  valorPessimista: number;
  valorOtimista: number;
  confidenceLevel: string;
  dataAvaliacao: string;
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
}

const scoreLabels: Record<number | string, { label: string; color: [number, number, number] }> = {
  5: { label: 'Excelente', color: [5, 150, 105] },
  4: { label: 'Bom', color: [34, 197, 94] },
  3: { label: 'Adequado', color: [234, 179, 8] },
  2: { label: 'Atenção', color: [249, 115, 22] },
  1: { label: 'Crítico', color: [220, 38, 38] },
  'na': { label: 'N/A', color: [148, 163, 184] },
};

export async function generateVistoriaPDF(params: VistoriaPDFParams): Promise<void> {
  const { propertyData, checklist, photos, tipoVistoria, finalScore, progress, criticalCount, avaliacaoData } = params;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const contentWidth = pageWidth - marginLeft * 2;
  
  // ========== PAGE 1: Cover + Summary ==========
  let yPos = drawGodoyHeader(doc, 'Relatório de Vistoria Digital');
  
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
  
  // ========== PROPERTY IDENTIFICATION ==========
  yPos = drawSectionTitle(doc, 'Identificação do Imóvel', yPos, marginLeft);
  
  doc.setFontSize(10);
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
    ['Data Vistoria:', propertyData.dataVistoria ? new Date(propertyData.dataVistoria).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')],
  ];
  
  propertyInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, marginLeft + 5, yPos);
    doc.setFont('helvetica', 'bold');
    const splitValue = doc.splitTextToSize(value, contentWidth - 50);
    doc.text(splitValue[0], marginLeft + 40, yPos);
    yPos += 6;
  });
  
  // ========== VALUATION REFERENCE (if available) ==========
  if (avaliacaoData) {
    yPos += 5;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(marginLeft - 5, yPos, contentWidth + 10, 25, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Valores de Referência da Avaliação', marginLeft, yPos + 7);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    
    const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
    doc.text(`Pessimista: ${formatCurrency(avaliacaoData.valorPessimista)}`, marginLeft, yPos + 15);
    doc.text(`Provável: ${formatCurrency(avaliacaoData.valorProvavel)}`, marginLeft + 55, yPos + 15);
    doc.text(`Otimista: ${formatCurrency(avaliacaoData.valorOtimista)}`, marginLeft + 110, yPos + 15);
    
    yPos += 30;
  }
  
  // ========== TOP 3 CRITICAL ITEMS ==========
  const criticalItems: { category: string; label: string; score: number }[] = [];
  checklist.forEach(cat => {
    cat.items.forEach(item => {
      if (item.score === 1 || item.score === 2) {
        criticalItems.push({ category: cat.title, label: item.label, score: item.score });
      }
    });
  });
  
  if (criticalItems.length > 0) {
    yPos += 5;
    yPos = drawSectionTitle(doc, 'Pontos Críticos', yPos, marginLeft);
    
    criticalItems.slice(0, 5).forEach((item) => {
      if (yPos > getMaxContentY() - 20) return;
      
      const config = scoreLabels[item.score];
      doc.setFillColor(...config.color);
      doc.circle(marginLeft + 3, yPos - 1, 2, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      doc.setFont('helvetica', 'normal');
      const text = doc.splitTextToSize(item.label, contentWidth - 15);
      doc.text(text[0], marginLeft + 10, yPos);
      yPos += 7;
    });
  }
  
  // ========== PAGE 2+: CHECKLIST DETAILS ==========
  doc.addPage();
  yPos = 20;
  
  yPos = drawSectionTitle(doc, 'Checklist Detalhado', yPos, marginLeft);
  
  for (const category of checklist) {
    const scoredItems = category.items.filter(i => i.score !== null);
    if (scoredItems.length === 0) continue;
    
    if (yPos > getMaxContentY() - 30) {
      doc.addPage();
      yPos = 20;
    }
    
    // Category header
    doc.setFillColor(...BRAND_COLORS.lightGray);
    doc.rect(marginLeft - 5, yPos - 4, contentWidth + 10, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text(category.title, marginLeft, yPos);
    yPos += 10;
    
    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    for (const item of category.items) {
      if (item.score === null) continue;
      
      if (yPos > getMaxContentY() - 10) {
        doc.addPage();
        yPos = 20;
      }
      
      const config = scoreLabels[item.score];
      
      // Score badge
      doc.setFillColor(...config.color);
      doc.roundedRect(marginLeft, yPos - 3, 12, 5, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(item.score === 'na' ? 'N/A' : String(item.score), marginLeft + 6, yPos, { align: 'center' });
      
      // Item label
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      const splitLabel = doc.splitTextToSize(item.label, contentWidth - 25);
      doc.text(splitLabel[0], marginLeft + 16, yPos);
      yPos += splitLabel.length > 1 ? 8 : 6;
    }
    
    yPos += 4;
  }
  
  // ========== PHOTOS SECTION (if any) ==========
  if (photos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    yPos = drawSectionTitle(doc, 'Registro Fotográfico', yPos, marginLeft);
    
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`${photos.length} foto(s) registrada(s)`, marginLeft, yPos);
    yPos += 10;
    
    const imgWidth = 55;
    const imgHeight = 42;
    let xPos = marginLeft;
    
    for (const photo of photos) {
      if (xPos + imgWidth > pageWidth - marginLeft) {
        xPos = marginLeft;
        yPos += imgHeight + 15;
      }
      
      if (yPos + imgHeight > getMaxContentY()) {
        doc.addPage();
        yPos = 20;
        xPos = marginLeft;
      }
      
      try {
        doc.addImage(photo.dataUrl, 'JPEG', xPos, yPos, imgWidth, imgHeight);
        
        // Caption
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        const captionLines = doc.splitTextToSize(photo.caption, imgWidth);
        doc.text(captionLines.slice(0, 2), xPos, yPos + imgHeight + 4);
        
        xPos += imgWidth + 8;
      } catch (imgError) {
        console.error('Error adding image:', imgError);
        xPos += imgWidth + 8;
      }
    }
  }
  
  // ========== OBSERVATIONS (if any) ==========
  if (propertyData.observacoes) {
    if (yPos > getMaxContentY() - 40) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 10;
    yPos = drawSectionTitle(doc, 'Observações Gerais', yPos, marginLeft);
    
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_COLORS.darkGray);
    const splitObs = doc.splitTextToSize(propertyData.observacoes, contentWidth);
    doc.text(splitObs, marginLeft, yPos);
  }
  
  // Apply footers to all pages
  applyFootersToAllPages(doc);
  
  // Save
  const filename = `vistoria_${propertyData.logradouro?.replace(/\s+/g, '_').substring(0, 20) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
