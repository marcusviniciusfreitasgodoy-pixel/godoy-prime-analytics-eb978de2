import jsPDF from 'jspdf';
import {
  drawGodoyHeader,
  drawSectionTitle,
  applyFootersToAllPages,
  BRAND_COLORS,
  getMaxContentY,
  fetchCompanyInfoForPDF,
  addNewPageWithTemplate,
  drawDisclaimer,
  CompanyInfo,
} from './pdfTemplate';
import type { FeedbackAnalytics } from '@/hooks/useFeedbackAnalytics';

// ── Helpers ──────────────────────────────────────────────

function drawHorizontalBar(
  doc: jsPDF,
  x: number,
  y: number,
  maxWidth: number,
  ratio: number,
  height: number,
  color: [number, number, number],
) {
  // background track
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(x, y, maxWidth, height, 1, 1, 'F');
  // filled bar
  if (ratio > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, Math.max(maxWidth * ratio, 3), height, 1, 1, 'F');
  }
}

function drawKPIBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  subtitle: string,
) {
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.text(title, x + w / 2, y + 8, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.text(value, x + w / 2, y + 20, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.text(subtitle, x + w / 2, y + 27, { align: 'center' });
}

// ── Main Export ──────────────────────────────────────────

export async function exportFeedbackAnalyticsPdf(
  analytics: FeedbackAnalytics,
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 15;
  const contentWidth = pageWidth - marginLeft * 2;
  const maxY = getMaxContentY();
  const companyInfo = await fetchCompanyInfoForPDF();

  // ═══════════ PAGE 1 — Header + KPIs ═══════════
  let y = drawGodoyHeader(doc, 'Relatório Analítico de Feedbacks de Visitas', companyInfo);

  // KPI grid 2×2
  const boxW = (contentWidth - 6) / 2;
  const boxH = 32;

  drawKPIBox(doc, marginLeft, y, boxW, boxH, 'AVALIAÇÃO MÉDIA', analytics.avgRating.toFixed(1), `de ${analytics.totalFeedbacks} avaliações`);
  drawKPIBox(doc, marginLeft + boxW + 6, y, boxW, boxH, 'TAXA DE PROPOSTA', `${analytics.proposalRate.toFixed(0)}%`, 'querem fazer proposta');
  y += boxH + 5;
  drawKPIBox(doc, marginLeft, y, boxW, boxH, 'VALOR JUSTO', `${analytics.justValueRate.toFixed(0)}%`, 'consideram preço justo');
  drawKPIBox(doc, marginLeft + boxW + 6, y, boxW, boxH, 'TOTAL FEEDBACKS', String(analytics.totalFeedbacks), '');
  y += boxH + 10;

  // Conexão emocional
  y = drawSectionTitle(doc, 'Conexão Emocional Média', y, marginLeft);
  const conexaoRatio = analytics.avgConexao / 10;
  drawHorizontalBar(doc, marginLeft, y, contentWidth, conexaoRatio, 6, BRAND_COLORS.gold);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.text(`${analytics.avgConexao.toFixed(1)} / 10`, marginLeft + contentWidth + 2, y + 5, { align: 'left' });
  y += 18;

  // ═══════════ PAGE 2 — Distribution & Perception ═══════════
  y = addNewPageWithTemplate(doc);

  // Rating distribution
  y = drawSectionTitle(doc, 'Distribuição de Avaliações', y, marginLeft);
  const maxRatingCount = Math.max(...analytics.distributionByRating.map((d) => d.count), 1);
  analytics.distributionByRating.forEach((item) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.text(item.nota, marginLeft, y + 4);
    drawHorizontalBar(doc, marginLeft + 25, y, contentWidth - 55, item.count / maxRatingCount, 5, BRAND_COLORS.gold);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.count), marginLeft + contentWidth - 25, y + 4, { align: 'right' });
    y += 9;
  });
  y += 8;

  // Interest distribution
  y = drawSectionTitle(doc, 'Nível de Interesse', y, marginLeft);
  const interestColors: Record<string, [number, number, number]> = {
    'Muito Alto': [16, 185, 129],
    'Alto': [34, 197, 94],
    'Médio': [234, 179, 8],
    'Baixo': [239, 68, 68],
  };
  const maxInterest = Math.max(...analytics.interestDistribution.map((d) => d.count), 1);
  analytics.interestDistribution.forEach((item) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.text(item.nivel, marginLeft, y + 4);
    const color = interestColors[item.nivel] || BRAND_COLORS.navy;
    drawHorizontalBar(doc, marginLeft + 30, y, contentWidth - 60, item.count / maxInterest, 5, color);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.count), marginLeft + contentWidth - 25, y + 4, { align: 'right' });
    y += 9;
  });
  y += 8;

  // Value perception
  y = drawSectionTitle(doc, 'Percepção de Valor', y, marginLeft);
  const valueColors: Record<string, [number, number, number]> = {
    'Abaixo': [239, 68, 68],
    'Justo': [16, 185, 129],
    'Acima': [234, 179, 8],
  };
  const maxValue = Math.max(...analytics.valuePerception.map((d) => d.count), 1);
  analytics.valuePerception.forEach((item) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.text(item.percepcao, marginLeft, y + 4);
    const color = valueColors[item.percepcao] || BRAND_COLORS.navy;
    drawHorizontalBar(doc, marginLeft + 25, y, contentWidth - 55, item.count / maxValue, 5, color);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.count), marginLeft + contentWidth - 25, y + 4, { align: 'right' });
    y += 9;
  });

  // ═══════════ PAGE 3 — Trends + UAU ═══════════
  y = addNewPageWithTemplate(doc);

  // Monthly trend table
  y = drawSectionTitle(doc, 'Evolução da Satisfação Mensal', y, marginLeft);

  // Table header
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(marginLeft, y, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.white);
  doc.text('Mês', marginLeft + 3, y + 5);
  doc.text('Média', marginLeft + 40, y + 5);
  doc.text('Qtd', marginLeft + 65, y + 5);
  doc.text('Tendência', marginLeft + 85, y + 5);
  y += 7;

  const maxMonthly = Math.max(...analytics.monthlyTrend.map((m) => m.mediaAvaliacao), 1);
  analytics.monthlyTrend.forEach((item, i) => {
    const bg = i % 2 === 0 ? BRAND_COLORS.lightGray : BRAND_COLORS.white;
    doc.setFillColor(...bg);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.text(item.mes, marginLeft + 3, y + 5);
    doc.text(item.mediaAvaliacao.toFixed(1), marginLeft + 40, y + 5);
    doc.text(String(item.totalFeedbacks), marginLeft + 65, y + 5);

    // mini bar
    drawHorizontalBar(doc, marginLeft + 85, y + 1.5, contentWidth - 90, item.mediaAvaliacao / 5, 4, BRAND_COLORS.gold);
    y += 7;
  });
  y += 10;

  // Efeitos UAU
  if (analytics.topEfeitosUau.length > 0) {
    y = drawSectionTitle(doc, 'Efeitos UAU Mais Citados', y, marginLeft);
    const maxUau = Math.max(...analytics.topEfeitosUau.map((e) => e.count), 1);
    analytics.topEfeitosUau.forEach((item) => {
      if (y > maxY) {
        y = addNewPageWithTemplate(doc);
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND_COLORS.darkGray);
      const label = item.efeito.length > 25 ? item.efeito.slice(0, 22) + '...' : item.efeito;
      doc.text(label, marginLeft, y + 4);
      drawHorizontalBar(doc, marginLeft + 45, y, contentWidth - 75, item.count / maxUau, 5, [139, 92, 246]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BRAND_COLORS.navy);
      doc.text(String(item.count), marginLeft + contentWidth - 25, y + 4, { align: 'right' });
      y += 9;
    });
  }

  // ═══════════ PAGE 4 — Recent Feedbacks ═══════════
  y = addNewPageWithTemplate(doc);
  y = drawSectionTitle(doc, 'Feedbacks Recentes', y, marginLeft);

  // Table header
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(marginLeft, y, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.white);
  doc.text('Data', marginLeft + 3, y + 5);
  doc.text('Visitante', marginLeft + 25, y + 5);
  doc.text('Endereço', marginLeft + 75, y + 5);
  doc.text('Nota', marginLeft + contentWidth - 10, y + 5, { align: 'right' });
  y += 7;

  analytics.recentFeedbacks.forEach((fb, i) => {
    if (y > maxY) {
      y = addNewPageWithTemplate(doc);
    }
    const bg = i % 2 === 0 ? BRAND_COLORS.lightGray : BRAND_COLORS.white;
    doc.setFillColor(...bg);
    doc.rect(marginLeft, y, contentWidth, 7, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.darkGray);

    const date = fb.created_at ? new Date(fb.created_at).toLocaleDateString('pt-BR') : '-';
    doc.text(date, marginLeft + 3, y + 5);

    const nome = (fb.ficha?.nome_visitante || 'Visitante').slice(0, 20);
    doc.text(nome, marginLeft + 25, y + 5);

    const endereco = (fb.ficha?.endereco_imovel || '-').slice(0, 35);
    doc.text(endereco, marginLeft + 75, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.text(fb.avaliacao_geral != null ? `${fb.avaliacao_geral} ★` : '-', marginLeft + contentWidth - 10, y + 5, { align: 'right' });
    y += 7;
  });

  y += 8;
  if (y < maxY - 30) {
    drawDisclaimer(doc, y, marginLeft);
  }

  // Apply footers to all pages
  applyFootersToAllPages(doc, companyInfo);

  return doc;
}
