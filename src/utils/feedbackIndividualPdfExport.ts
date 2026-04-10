import jsPDF from 'jspdf';
import {
  BRAND_COLORS,
  drawGodoyHeader,
  drawSectionTitle,
  applyFootersToAllPages,
  fetchCompanyInfoForPDF,
  formatCurrencyPDF,
  getMaxContentY,
  addNewPageWithTemplate,
  drawDisclaimer,
} from './pdfTemplate';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedbackPdfData {
  avaliacao_geral: number | null;
  conexao_imovel: number | null;
  nivel_interesse: string | null;
  percepcao_valor: string | null;
  o_que_mais_gostou: string | null;
  o_que_menos_gostou: string | null;
  o_que_alteraria: string | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  ponto_resistencia: string | null;
  sugestoes_melhoria: string | null;
  gostaria_fazer_proposta: boolean | null;
  compraria_imovel: boolean | null;
  atende_necessidades: boolean | null;
  valor_ofertaria: number | null;
  forma_pagamento: string | null;
  sinal_entrada: number | null;
  valor_financiado: number | null;
  efeito_uau: string[] | null;
  efeito_uau_detalhe: string | null;
  campos_customizados: Record<string, unknown> | null;
  created_at: string | null;
  ficha?: {
    codigo: string;
    nome_visitante: string;
    endereco_imovel: string;
    data_visita: string;
    nome_corretor?: string;
    valor_imovel?: number | null;
  };
}

const INTERESSE_MAP: Record<string, string> = {
  muito_alto: 'Muito Alto',
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
};

const PERCEPCAO_MAP: Record<string, string> = {
  abaixo: 'Abaixo do mercado',
  justo: 'Justo',
  acima: 'Acima do mercado',
};

function drawLabelValue(doc: jsPDF, label: string, value: string, y: number, ml: number, maxWidth: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.text(`${label}:`, ml, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_COLORS.darkGray);
  const lines = doc.splitTextToSize(value, maxWidth - doc.getTextWidth(`${label}: `));
  doc.text(lines, ml + doc.getTextWidth(`${label}: `) + 2, y);
  return y + Math.max(lines.length * 5, 6);
}

function drawStars(doc: jsPDF, rating: number, y: number, ml: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.text('Avaliação Geral:', ml, y);
  
  const starX = ml + doc.getTextWidth('Avaliação Geral: ') + 2;
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      doc.setTextColor(...BRAND_COLORS.gold);
    } else {
      doc.setTextColor(200, 200, 200);
    }
    doc.setFontSize(12);
    doc.text('★', starX + (i - 1) * 7, y);
  }
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLORS.darkGray);
  doc.text(`(${rating}/5)`, starX + 38, y);
  return y + 8;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > getMaxContentY()) {
    return addNewPageWithTemplate(doc);
  }
  return y;
}

export async function exportFeedbackIndividualPdf(feedback: FeedbackPdfData): Promise<jsPDF> {
  const companyInfo = await fetchCompanyInfoForPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  const ml = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - ml * 2;
  const codigo = feedback.ficha?.codigo || 'N/A';

  let y = drawGodoyHeader(doc, `Feedback da Visita — ${codigo}`, companyInfo);

  // Section 1: Visit data
  y = drawSectionTitle(doc, 'Dados da Visita', y, ml);

  if (feedback.ficha) {
    y = drawLabelValue(doc, 'Visitante', feedback.ficha.nome_visitante, y, ml, contentWidth);
    y = drawLabelValue(doc, 'Imóvel', feedback.ficha.endereco_imovel, y, ml, contentWidth);
    if (feedback.ficha.data_visita) {
      y = drawLabelValue(doc, 'Data da Visita', format(new Date(feedback.ficha.data_visita), "dd/MM/yyyy", { locale: ptBR }), y, ml, contentWidth);
    }
    if (feedback.ficha.nome_corretor) {
      y = drawLabelValue(doc, 'Corretor', feedback.ficha.nome_corretor, y, ml, contentWidth);
    }
    if (feedback.ficha.valor_imovel) {
      y = drawLabelValue(doc, 'Valor do Imóvel', formatCurrencyPDF(feedback.ficha.valor_imovel), y, ml, contentWidth);
    }
  }
  if (feedback.created_at) {
    y = drawLabelValue(doc, 'Feedback enviado em', format(new Date(feedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), y, ml, contentWidth);
  }
  y += 4;

  // Section 2: Ratings
  y = checkPageBreak(doc, y, 30);
  y = drawSectionTitle(doc, 'Avaliações', y, ml);

  if (feedback.avaliacao_geral != null) {
    y = drawStars(doc, feedback.avaliacao_geral, y, ml);
  }
  if (feedback.conexao_imovel != null) {
    y = drawLabelValue(doc, 'Conexão com o imóvel', `${feedback.conexao_imovel}/5`, y, ml, contentWidth);
  }
  if (feedback.nivel_interesse) {
    y = drawLabelValue(doc, 'Nível de Interesse', INTERESSE_MAP[feedback.nivel_interesse] || feedback.nivel_interesse, y, ml, contentWidth);
  }
  if (feedback.percepcao_valor) {
    y = drawLabelValue(doc, 'Percepção de Valor', PERCEPCAO_MAP[feedback.percepcao_valor] || feedback.percepcao_valor, y, ml, contentWidth);
  }
  if (feedback.atende_necessidades != null) {
    y = drawLabelValue(doc, 'Atende necessidades', feedback.atende_necessidades ? 'Sim' : 'Não', y, ml, contentWidth);
  }
  if (feedback.compraria_imovel != null) {
    y = drawLabelValue(doc, 'Compraria o imóvel', feedback.compraria_imovel ? 'Sim' : 'Não', y, ml, contentWidth);
  }
  y += 4;

  // Section 3: Comments
  const comments = [
    { label: 'O que mais gostou', value: feedback.o_que_mais_gostou },
    { label: 'O que menos gostou', value: feedback.o_que_menos_gostou },
    { label: 'O que alteraria', value: feedback.o_que_alteraria },
    { label: 'Pontos positivos', value: feedback.pontos_positivos },
    { label: 'Pontos negativos', value: feedback.pontos_negativos },
    { label: 'Ponto de resistência', value: feedback.ponto_resistencia },
    { label: 'Sugestões de melhoria', value: feedback.sugestoes_melhoria },
  ].filter(c => c.value);

  if (comments.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionTitle(doc, 'Comentários', y, ml);
    for (const c of comments) {
      y = checkPageBreak(doc, y, 12);
      y = drawLabelValue(doc, c.label, c.value!, y, ml, contentWidth);
    }
    y += 4;
  }

  // Section 4: Efeitos UAU
  if (feedback.efeito_uau && feedback.efeito_uau.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionTitle(doc, 'Efeitos UAU', y, ml);
    y = drawLabelValue(doc, 'Selecionados', feedback.efeito_uau.join(', '), y, ml, contentWidth);
    if (feedback.efeito_uau_detalhe) {
      y = drawLabelValue(doc, 'Detalhes', feedback.efeito_uau_detalhe, y, ml, contentWidth);
    }
    y += 4;
  }

  // Section 5: Interesse e Proposta
  y = checkPageBreak(doc, y, 30);
  y = drawSectionTitle(doc, 'Interesse e Proposta', y, ml);

  if (feedback.gostaria_fazer_proposta != null) {
    y = drawLabelValue(doc, 'Gostaria de fazer proposta', feedback.gostaria_fazer_proposta ? 'Sim' : 'Não', y, ml, contentWidth);
  }
  if (feedback.valor_ofertaria != null) {
    y = drawLabelValue(doc, 'Valor que ofertaria', formatCurrencyPDF(feedback.valor_ofertaria), y, ml, contentWidth);
  }
  if (feedback.forma_pagamento) {
    y = drawLabelValue(doc, 'Forma de pagamento', feedback.forma_pagamento, y, ml, contentWidth);
  }
  if (feedback.sinal_entrada != null) {
    y = drawLabelValue(doc, 'Sinal / Entrada', formatCurrencyPDF(feedback.sinal_entrada), y, ml, contentWidth);
  }
  if (feedback.valor_financiado != null) {
    y = drawLabelValue(doc, 'Valor financiado', formatCurrencyPDF(feedback.valor_financiado), y, ml, contentWidth);
  }
  y += 4;

  // Section 6: Custom fields
  if (feedback.campos_customizados && Object.keys(feedback.campos_customizados).length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionTitle(doc, 'Campos Customizados', y, ml);
    for (const [key, val] of Object.entries(feedback.campos_customizados)) {
      y = checkPageBreak(doc, y, 8);
      y = drawLabelValue(doc, key, String(val ?? ''), y, ml, contentWidth);
    }
    y += 4;
  }

  // Disclaimer
  y = checkPageBreak(doc, y, 30);
  drawDisclaimer(doc, y, ml);

  applyFootersToAllPages(doc, companyInfo);
  return doc;
}
