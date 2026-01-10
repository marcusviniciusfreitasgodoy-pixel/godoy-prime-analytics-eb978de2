import jsPDF from 'jspdf';

// Godoy Prime Brand Colors (RGB)
export const BRAND_COLORS = {
  navy: [12, 35, 64] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  darkGray: [40, 40, 40] as [number, number, number],
};

// Default Contact Information (can be overridden by company settings)
export const CONTACT_INFO = {
  phone: '21. 96407 5124',
  address: 'Av. das Américas 10101 Bloco 2, Sala 316, Barra da Tijuca, RJ',
  creci: 'CRECI 11841-PJ',
  website: 'www.godoyprime.com.br',
  name: 'GODOY PRIME REALTY',
  cnpj: '',
};

export interface CompanyInfo {
  phone?: string;
  address?: string;
  creci?: string;
  name?: string;
  cnpj?: string;
  website?: string;
}

// Logo as base64 (simplified "GR" monogram for PDF embedding)
// This is a small placeholder - the actual logo would be embedded
const LOGO_WIDTH = 35;
const LOGO_HEIGHT = 12;

/**
 * Draw the standardized Godoy Prime header
 * Returns the Y position after the header for content to start
 */
export function drawGodoyHeader(doc: jsPDF, subtitle: string, companyInfo?: CompanyInfo): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerHeight = 38;
  const name = companyInfo?.name || CONTACT_INFO.name;
  
  // White background header
  doc.setFillColor(...BRAND_COLORS.white);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Company name centered - full name on one line
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(name, pageWidth / 2, 14, { align: 'center' });
  
  // Gold underline under company name
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.8);
  const nameWidth = doc.getTextWidth(name);
  doc.line(pageWidth / 2 - nameWidth / 2 - 5, 17, pageWidth / 2 + nameWidth / 2 + 5, 17);
  
  // Subtitle in gold
  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(subtitle, pageWidth / 2, 25, { align: 'center' });
  
  // Date in gray - smaller and compact
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(dateStr, pageWidth / 2, 32, { align: 'center' });
  
  return headerHeight + 8; // Start content at this Y position
}

/**
 * Draw the standardized Godoy Prime footer with navy bar - compact version
 * Should be called on each page
 */
export function drawGodoyFooter(doc: jsPDF, pageNumber?: number, totalPages?: number, companyInfo?: CompanyInfo): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = 10;
  const footerY = pageHeight - footerHeight;
  
  const phone = companyInfo?.phone || CONTACT_INFO.phone;
  const creci = companyInfo?.creci || CONTACT_INFO.creci;
  const website = companyInfo?.website || CONTACT_INFO.website;
  
  // Navy bar - thinner
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(0, footerY, pageWidth, footerHeight, 'F');
  
  // Single line footer with all info
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  // Left: phone
  doc.text(`Tel: ${phone}`, 10, footerY + 6);
  
  // Center: CRECI + page
  const centerText = pageNumber !== undefined && totalPages !== undefined 
    ? `${creci} | Pág. ${pageNumber}/${totalPages}`
    : creci;
  doc.text(centerText, pageWidth / 2, footerY + 6, { align: 'center' });
  
  // Right: website
  doc.text(website, pageWidth - 10, footerY + 6, { align: 'right' });
}

/**
 * Draw a section title with gold underline
 * Returns the new Y position after the title
 */
export function drawSectionTitle(doc: jsPDF, title: string, y: number, marginLeft: number = 20): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.text(title.toUpperCase(), marginLeft, y);
  
  // Gold underline
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  const titleWidth = doc.getTextWidth(title.toUpperCase());
  doc.line(marginLeft, y + 2, marginLeft + Math.min(titleWidth + 10, 70), y + 2);
  
  return y + 10;
}

/**
 * Add a new page with footer
 * Returns the starting Y position for content
 */
export function addNewPageWithTemplate(doc: jsPDF): number {
  doc.addPage();
  return 20; // Starting Y position for new pages
}

/**
 * Apply footers to all pages of the document
 * Call this before saving the PDF
 */
export function applyFootersToAllPages(doc: jsPDF, companyInfo?: CompanyInfo): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawGodoyFooter(doc, i, pageCount, companyInfo);
  }
}

/**
 * Format currency in BRL
 */
export function formatCurrencyPDF(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Get maximum Y position before footer (content area limit)
 * Footer starts at pageHeight - 10 = 287, so content should stop at ~270 to have safe margin
 */
export function getMaxContentY(): number {
  return 270; // Safe content area limit before footer
}

/**
 * Draw a highlighted result box (for valuation results)
 */
export function drawResultBox(
  doc: jsPDF,
  title: string,
  mainValue: string,
  subtitle: string,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string,
  y: number,
  marginLeft: number = 20
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginLeft * 2;
  const boxHeight = 45;
  
  // Navy box
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.roundedRect(marginLeft - 5, y - 5, contentWidth + 10, boxHeight, 3, 3, 'F');
  
  // Title in gold
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.gold);
  doc.text(title, pageWidth / 2, y + 5, { align: 'center' });
  
  // Main value in white
  doc.setFontSize(24);
  doc.setTextColor(...BRAND_COLORS.white);
  doc.text(mainValue, pageWidth / 2, y + 20, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(subtitle, pageWidth / 2, y + 28, { align: 'center' });
  
  // Bottom values
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`${leftLabel}: ${leftValue}`, marginLeft + 10, y + 38);
  doc.text(`${rightLabel}: ${rightValue}`, pageWidth - marginLeft - 10, y + 38, { align: 'right' });
  
  return y + boxHeight + 10;
}

/**
 * Draw disclaimer box
 */
export function drawDisclaimer(doc: jsPDF, y: number, marginLeft: number = 20): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginLeft * 2;
  
  // Yellow background
  doc.setFillColor(255, 248, 230);
  doc.roundedRect(marginLeft - 5, y - 3, contentWidth + 10, 22, 2, 2, 'F');
  
  // Title
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 80, 0);
  doc.text('AVISO LEGAL', marginLeft, y + 3);
  
  // Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 80, 40);
  const disclaimer = 'Este relatório é uma estimativa baseada em dados públicos de transações oficiais da Prefeitura do Rio de Janeiro. Não substitui laudo de avaliação profissional (PTAM - NBR 14653-2). Os valores são indicativos e devem ser validados por um corretor ou avaliador credenciado.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisclaimer, marginLeft, y + 9);
  
  return y + 25;
}
