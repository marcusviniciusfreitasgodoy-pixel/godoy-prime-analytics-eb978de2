import jsPDF from 'jspdf';
import { BRAND_COLORS, fetchCompanyInfoForPDF, drawGodoyFooter } from './pdfTemplate';

export async function exportProductOnePagerPDF(): Promise<void> {
  const companyInfo = await fetchCompanyInfoForPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── HEADER ──
  const headerH = 28;
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const companyName = companyInfo?.name || 'GODOY PRIME ANALYTICS';
  doc.text(companyName, pageWidth / 2, 11, { align: 'center' });

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Inteligência Imobiliária Premium', pageWidth / 2, 18, { align: 'center' });

  // Gold line
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(margin + 30, 22, pageWidth - margin - 30, 22);

  // Date
  doc.setTextColor(180, 190, 210);
  doc.setFontSize(6.5);
  const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), pageWidth / 2, 26, { align: 'center' });

  y = headerH + 4;

  // ── MERCADO ──
  const mercadoH = 42;
  doc.setFillColor(18, 45, 78);
  doc.roundedRect(margin, y, contentWidth, mercadoH, 2, 2, 'F');

  // Title
  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('O MERCADO', margin + 5, y + 7);

  // Left text
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const mercadoLines = [
    'Nicho: Imóveis de alto padrão — Barra da Tijuca, RJ',
    'Decisor: Corretores e imobiliárias com faturamento R$ 10-100K+/mês',
    'Ticket médio por imóvel: R$ 3M a R$ 30M',
    'Mercado endereçável: 5.000+ corretores ativos na região',
  ];
  mercadoLines.forEach((line, i) => {
    doc.text(`•  ${line}`, margin + 5, y + 14 + i * 5);
  });

  // Right stats box
  const statsX = margin + contentWidth - 45;
  doc.setFillColor(10, 28, 52);
  doc.roundedRect(statsX, y + 3, 40, mercadoH - 6, 2, 2, 'F');

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('80.000+', statsX + 20, y + 15, { align: 'center' });

  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('transações ITBI', statsX + 20, y + 20, { align: 'center' });
  doc.text('registradas', statsX + 20, y + 24, { align: 'center' });

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('5 anos', statsX + 20, y + 32, { align: 'center' });

  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('de histórico', statsX + 20, y + 36, { align: 'center' });

  y += mercadoH + 4;

  // ── A DOR ──
  const dorH = 30;
  doc.setFillColor(255, 248, 230);
  doc.roundedRect(margin, y, contentWidth, dorH, 2, 2, 'F');
  doc.setDrawColor(220, 180, 80);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, dorH, 2, 2, 'S');

  doc.setTextColor(150, 100, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('⚠  A DOR DO MERCADO', margin + 5, y + 7);

  doc.setTextColor(80, 60, 20);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const dorLines = [
    'Assimetria de informação: corretores precificam com base em anúncios inflados, não em valores reais de transação.',
    'Custo do erro: R$ 100K–300K por transação mal precificada — imóvel encalha ou vende abaixo do justo.',
    'Resultado: perda de comissões, clientes insatisfeitos e reputação comprometida.',
  ];
  dorLines.forEach((line, i) => {
    const splitLine = doc.splitTextToSize(`•  ${line}`, contentWidth - 10);
    doc.text(splitLine, margin + 5, y + 13 + i * 6);
  });

  y += dorH + 4;

  // ── A SOLUÇÃO ──
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('A SOLUÇÃO', margin, y + 4);

  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 6, margin + 30, y + 6);

  y += 10;

  // 2x2 grid
  const cellW = (contentWidth - 4) / 2;
  const cellH = 28;
  const modules = [
    { title: 'Motor de Avaliação', lines: ['3 cenários (pessimista, provável, otimista)', '26 fatores de ajuste calibráveis', 'Baseado em dados ITBI oficiais'] },
    { title: 'Vistoria Digital', lines: ['55+ itens de checklist', 'Score automático de conservação', 'Ajuste de valor por estado do imóvel'] },
    { title: 'CRM + Gestão de Visitas', lines: ['Pipeline Kanban com drag & drop', 'Fichas digitais com assinatura eletrônica', 'Notificações WhatsApp + Email'] },
    { title: 'Sofia IA — Assistente', lines: ['Consultas em linguagem natural', 'Base de conhecimento proprietária', 'Análise contextual de mercado'] },
  ];

  modules.forEach((mod, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cellW + 4);
    const cy = y + row * (cellH + 3);

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, cy, cellW, cellH, 2, 2, 'F');

    doc.setTextColor(...BRAND_COLORS.navy);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(mod.title, x + 4, cy + 6);

    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(0.4);
    doc.line(x + 4, cy + 8, x + 4 + doc.getTextWidth(mod.title), cy + 8);

    doc.setTextColor(...BRAND_COLORS.darkGray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    mod.lines.forEach((line, li) => {
      doc.text(`•  ${line}`, x + 4, cy + 13 + li * 4.5);
    });
  });

  y += (cellH + 3) * 2 + 4;

  // ── DIFERENCIAIS ──
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DIFERENCIAIS COMPETITIVOS', margin, y + 4);

  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 6, margin + 55, y + 6);

  y += 10;

  const diffs = [
    { title: 'Dados Oficiais ITBI', desc: 'Transações reais da prefeitura, não anúncios inflados' },
    { title: 'Metodologia NBR 14653-2', desc: 'Conformidade com norma técnica de avaliação imobiliária' },
    { title: 'Resultado em 5 Minutos', desc: 'Da busca ao laudo profissional em PDF pronto para apresentação' },
    { title: 'Multi-tenant com RLS', desc: 'Isolamento total de dados por organização, segurança enterprise' },
  ];

  const diffColW = (contentWidth - 6) / 2;
  diffs.forEach((d, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (diffColW + 6);
    const dy = y + row * 12;

    // Gold bullet
    doc.setFillColor(...BRAND_COLORS.gold);
    doc.circle(x + 2, dy + 1.5, 1.2, 'F');

    doc.setTextColor(...BRAND_COLORS.navy);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(d.title, x + 6, dy + 2.5);

    doc.setTextColor(...BRAND_COLORS.gray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(d.desc, x + 6, dy + 7);
  });

  y += 28;

  // ── PLANOS ──
  const planosH = 22;
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.roundedRect(margin, y, contentWidth, planosH, 2, 2, 'F');

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANOS', pageWidth / 2, y + 6, { align: 'center' });

  const plans = [
    { name: 'STARTER', price: 'R$ 197/mês', desc: '1 usuário · 10 avaliações' },
    { name: 'PROFESSIONAL', price: 'R$ 497/mês', desc: '5 usuários · 50 avaliações' },
    { name: 'ENTERPRISE', price: 'R$ 997/mês', desc: 'Ilimitado · API · Suporte dedicado' },
  ];

  const planW = (contentWidth - 20) / 3;
  plans.forEach((p, i) => {
    const px = margin + 5 + i * (planW + 5);
    const isPro = i === 1;

    if (isPro) {
      doc.setFillColor(30, 60, 100);
      doc.roundedRect(px - 1, y + 8, planW + 2, 12, 1, 1, 'F');
    }

    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(p.name, px + planW / 2, y + 12, { align: 'center' });

    doc.setTextColor(...BRAND_COLORS.gold);
    doc.setFontSize(9);
    doc.text(p.price, px + planW / 2, y + 17, { align: 'center' });

    doc.setTextColor(180, 190, 210);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(p.desc, px + planW / 2, y + 20.5, { align: 'center' });
  });

  // ── FOOTER ──
  drawGodoyFooter(doc, undefined, undefined, companyInfo);

  doc.save('Godoy-Prime-Analytics-OnePager.pdf');
}
