import jsPDF from 'jspdf';
import { BRAND_COLORS, fetchCompanyInfoForPDF, drawGodoyFooter } from './pdfTemplate';
import { supabase } from '@/integrations/supabase/client';

interface TractionMetrics {
  totalTransacoes: number;
  bairrosMapeados: number;
  avaliacoes: number;
  usuarios: number;
}

async function fetchTractionMetrics(): Promise<TractionMetrics> {
  const defaults: TractionMetrics = { totalTransacoes: 0, bairrosMapeados: 0, avaliacoes: 0, usuarios: 0 };
  try {
    const [bairroRes, valRes, usersRes] = await Promise.all([
      supabase.from('bairros_cache').select('bairro, total_transacoes'),
      supabase.from('valuations').select('id'),
      supabase.from('profiles').select('id'),
    ]);

    const bairros = bairroRes.data ?? [];
    const totalTx = bairros.reduce((sum, r) => sum + (r.total_transacoes ?? 0), 0);
    return {
      totalTransacoes: totalTx,
      bairrosMapeados: bairros.length,
      avaliacoes: valRes.data?.length ?? 0,
      usuarios: usersRes.data?.length ?? 0,
    };
  } catch {
    return defaults;
  }
}

const formatNumber = (n: number) => n.toLocaleString('pt-BR');

// ─── Page 1 Drawing ───

function drawHeader(doc: jsPDF, pageWidth: number, companyName: string): number {
  const headerH = 28;
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, 11, { align: 'center' });

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Inteligência Imobiliária Premium', pageWidth / 2, 18, { align: 'center' });

  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.8);
  const margin = 15;
  doc.line(margin + 30, 22, pageWidth - margin - 30, 22);

  doc.setTextColor(180, 190, 210);
  doc.setFontSize(6.5);
  const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), pageWidth / 2, 26, { align: 'center' });

  return headerH + 4;
}

function drawMercado(doc: jsPDF, y: number, margin: number, contentWidth: number): number {
  const mercadoH = 42;
  doc.setFillColor(18, 45, 78);
  doc.roundedRect(margin, y, contentWidth, mercadoH, 2, 2, 'F');

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('O MERCADO', margin + 5, y + 7);

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

  return y + mercadoH + 4;
}

function drawDorMercado(doc: jsPDF, y: number, margin: number, contentWidth: number): number {
  const dorH = 34;
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
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const dorLines = [
    'Assimetria de informação: corretores precificam com base em anúncios inflados, não em valores reais de transação.',
    'Custo do erro: R$ 100K–300K por transação mal precificada — imóvel encalha ou vende abaixo do justo.',
    'Operação manual: fichas em papel, controle por WhatsApp, sem rastreabilidade de leads ou visitas.',
    'Falta de inteligência de mercado: sem dados de tendência por microbairro, decisões no "achismo".',
  ];
  dorLines.forEach((line, i) => {
    const splitLine = doc.splitTextToSize(`•  ${line}`, contentWidth - 10);
    doc.text(splitLine, margin + 5, y + 13 + i * 5.2);
  });

  return y + dorH + 4;
}

function drawSolucaoModulos(doc: jsPDF, y: number, margin: number, contentWidth: number): number {
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('A SOLUÇÃO', margin, y + 4);

  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 6, margin + 30, y + 6);

  y += 10;

  const cellW = (contentWidth - 4) / 2;
  const cellH = 32;
  const modules = [
    { title: 'Motor de Avaliação', dor: 'Precificação por "achismo" sem base em dados reais', beneficio: 'Laudo NBR 14653-2 em 5 min com 3 cenários calibráveis' },
    { title: 'Vistoria Digital 3.1', dor: 'Vistorias sem padrão geram disputas jurídicas', beneficio: 'Score 0-100 automático, checklist 55+ itens, PDF profissional' },
    { title: 'CRM + Pipeline', dor: 'Leads perdidos em WhatsApp, sem follow-up estruturado', beneficio: 'Kanban 8 estágios, conversão rastreável, notificações automáticas' },
    { title: 'Sofia IA', dor: 'Horas pesquisando dados dispersos em múltiplas fontes', beneficio: 'Resposta contextual instantânea com base em dados ITBI oficiais' },
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

    // Dor in dark red
    doc.setTextColor(160, 30, 30);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const dorSplit = doc.splitTextToSize(`Dor: ${mod.dor}`, cellW - 8);
    doc.text(dorSplit, x + 4, cy + 13);

    // Benefício in dark green
    doc.setTextColor(20, 120, 50);
    doc.setFontSize(7);
    const benSplit = doc.splitTextToSize(`Benefício: ${mod.beneficio}`, cellW - 8);
    doc.text(benSplit, x + 4, cy + 21);
  });

  return y + (cellH + 3) * 2 + 4;
}

function drawDiferenciais(doc: jsPDF, y: number, margin: number, contentWidth: number): number {
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

  return y + 28;
}

function drawMetricasTracao(doc: jsPDF, y: number, margin: number, contentWidth: number, pageWidth: number, metrics: TractionMetrics): number {
  const metricasH = 22;
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.roundedRect(margin, y, contentWidth, metricasH, 2, 2, 'F');

  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('MÉTRICAS DE TRAÇÃO', pageWidth / 2, y + 6, { align: 'center' });

  const metricItems = [
    { value: formatNumber(metrics.totalTransacoes), label: 'Transações ITBI' },
    { value: formatNumber(metrics.bairrosMapeados), label: 'Bairros Mapeados' },
    { value: formatNumber(metrics.avaliacoes), label: 'Avaliações' },
    { value: formatNumber(metrics.usuarios), label: 'Usuários Ativos' },
  ];

  const colW = contentWidth / 4;
  metricItems.forEach((m, i) => {
    const cx = margin + colW * i + colW / 2;
    doc.setTextColor(...BRAND_COLORS.gold);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, cx, y + 14, { align: 'center' });

    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, cx, y + 19, { align: 'center' });
  });

  return y + metricasH + 4;
}

// ─── Page 2 Drawing ───

function drawPage2FuncionalidadesDetalhadas(doc: jsPDF, margin: number, contentWidth: number, pageWidth: number): number {
  let y = 12;

  // Page 2 header bar
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FUNCIONALIDADES DETALHADAS', margin, y + 4);

  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 6, margin + 60, y + 6);

  y += 12;

  const detailedModules = [
    {
      title: 'Dashboard Analytics',
      dor: 'Sem visão consolidada do mercado, decisões às cegas',
      entrega: '4 KPIs em tempo real, gráficos de 60 meses, exportação PDF/Excel',
      persona: 'Gerente / Imobiliária',
    },
    {
      title: 'Microbairros',
      dor: 'Barra tratada como região única, ignorando variações de R$/m²',
      entrega: 'Ranking e evolução por sub-região com dados ITBI segmentados',
      persona: 'Corretor de Luxo',
    },
    {
      title: 'Gestão de Visitas',
      dor: 'Agendamento por WhatsApp, fichas em papel, sem controle',
      entrega: 'Fichas digitais com assinatura eletrônica, badge de proximidade',
      persona: 'Corretor de Luxo',
    },
    {
      title: 'Propostas Digitais',
      dor: 'Propostas informais sem validade jurídica ou rastreio',
      entrega: 'Modelos simplificado/completo com aceite eletrônico e PDF',
      persona: 'Corretor de Luxo',
    },
    {
      title: 'Estratégia de Precificação',
      dor: 'Preço de anúncio definido sem metodologia, sem plano B',
      entrega: 'Diagnóstico 9 perguntas, 3 faixas (Atração/Mercado/Premium)',
      persona: 'Gerente / Imobiliária',
    },
    {
      title: 'Parecer Godoy Prime',
      dor: 'Comprador não tem validação independente do preço pedido',
      entrega: 'Laudo independente baseado em ITBI, transparência total',
      persona: 'Comprador Premium',
    },
  ];

  const cellW = (contentWidth - 4) / 2;
  const cellH = 38;

  detailedModules.forEach((mod, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cellW + 4);
    const cy = y + row * (cellH + 3);

    // Card background with gold border
    doc.setFillColor(248, 249, 252);
    doc.roundedRect(x, cy, cellW, cellH, 2, 2, 'F');
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cy, cellW, cellH, 2, 2, 'S');

    // Title
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(mod.title, x + 4, cy + 6);

    doc.setDrawColor(...BRAND_COLORS.gold);
    doc.setLineWidth(0.3);
    doc.line(x + 4, cy + 7.5, x + 4 + doc.getTextWidth(mod.title), cy + 7.5);

    // Dor in dark red italic
    doc.setTextColor(160, 30, 30);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    const dorSplit = doc.splitTextToSize(`Dor: ${mod.dor}`, cellW - 8);
    doc.text(dorSplit, x + 4, cy + 12);

    // Entrega in dark green
    doc.setTextColor(20, 120, 50);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const entSplit = doc.splitTextToSize(`Entrega: ${mod.entrega}`, cellW - 8);
    doc.text(entSplit, x + 4, cy + 21);

    // Persona badge
    doc.setFillColor(212, 175, 55);
    const badgeW = doc.getTextWidth(mod.persona) * 0.85 + 6;
    doc.roundedRect(x + 4, cy + cellH - 8, badgeW, 5, 1, 1, 'F');
    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(mod.persona, x + 7, cy + cellH - 4.5);
  });

  return y + (cellH + 3) * 3 + 4;
}

function drawParaQuem(doc: jsPDF, y: number, margin: number, contentWidth: number): number {
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PARA QUEM', margin, y + 4);

  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 6, margin + 30, y + 6);

  y += 12;

  const barH = 28;
  doc.setFillColor(18, 45, 78);
  doc.roundedRect(margin, y, contentWidth, barH, 2, 2, 'F');

  const personas = [
    { title: 'Corretor de Luxo', desc: 'Avaliação + Visitas + CRM + Propostas' },
    { title: 'Gerente / Imobiliária', desc: 'Dashboard + Controle operacional' },
    { title: 'Administrador', desc: 'Calibradores + Gestão de usuários' },
    { title: 'Comprador Premium', desc: 'Parecer independente + Transparência' },
  ];

  const colW = contentWidth / 4;
  personas.forEach((p, i) => {
    const cx = margin + colW * i + colW / 2;

    // Separator lines
    if (i > 0) {
      doc.setDrawColor(60, 80, 110);
      doc.setLineWidth(0.2);
      doc.line(margin + colW * i, y + 4, margin + colW * i, y + barH - 4);
    }

    doc.setTextColor(...BRAND_COLORS.gold);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(p.title, cx, y + 10, { align: 'center' });

    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const descSplit = doc.splitTextToSize(p.desc, colW - 6);
    descSplit.forEach((line: string, li: number) => {
      doc.text(line, cx, y + 16 + li * 4, { align: 'center' });
    });
  });

  return y + barH + 4;
}

// ─── Main Export ───

export async function exportProductOnePagerPDF(): Promise<void> {
  const [companyInfo, metrics] = await Promise.all([fetchCompanyInfoForPDF(), fetchTractionMetrics()]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const companyName = companyInfo?.name || 'GODOY PRIME ANALYTICS';

  // ── PAGE 1 ──
  let y = drawHeader(doc, pageWidth, companyName);
  y = drawMercado(doc, y, margin, contentWidth);
  y = drawDorMercado(doc, y, margin, contentWidth);
  y = drawSolucaoModulos(doc, y, margin, contentWidth);
  y = drawDiferenciais(doc, y, margin, contentWidth);
  y = drawMetricasTracao(doc, y, margin, contentWidth, pageWidth, metrics);

  // ── PAGE 2 ──
  doc.addPage();
  const page2Y = drawPage2FuncionalidadesDetalhadas(doc, margin, contentWidth, pageWidth);
  drawParaQuem(doc, page2Y, margin, contentWidth);

  // ── FOOTERS on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawGodoyFooter(doc, i, totalPages, companyInfo);
  }

  doc.save('Godoy-Prime-Analytics-OnePager.pdf');
}
