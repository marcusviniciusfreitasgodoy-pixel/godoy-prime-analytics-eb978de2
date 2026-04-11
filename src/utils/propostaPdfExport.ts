import jsPDF from 'jspdf';
import { drawGodoyHeader, drawGodoyFooter, BRAND_COLORS, fetchCompanyInfoForPDF } from './pdfTemplate';

interface PropostaData {
  codigo: string;
  numero_proposta?: string | null;
  data_hora: string;
  cidade_uf?: string | null;
  nome_completo: string;
  cpf_cnpj: string;
  telefone: string;
  email?: string | null;
  endereco_resumido: string;
  unidade?: string | null;
  matricula?: string | null;
  valor_ofertado?: number | null;
  moeda?: string;
  sinal_entrada?: string | null;
  parcelas?: string | null;
  financiamento?: string | null;
  outras_condicoes?: string | null;
  validade_proposta?: string | null;
  forma_aceite?: string;
  assinatura_proponente?: string | null;
  status?: string;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function drawSection(doc: jsPDF, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 18, y + 5.5);
  return y + 12;
}

function drawField(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth = 80): number {
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);

  doc.setTextColor(...BRAND_COLORS.darkGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const lines = doc.splitTextToSize(value || '—', maxWidth);
  doc.text(lines, x, y + 4);
  return y + 4 + lines.length * 4;
}

function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage();
    return 20;
  }
  return y;
}

export async function generatePropostaPdf(proposta: PropostaData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const companyInfo = await fetchCompanyInfoForPDF();

  let y = drawGodoyHeader(doc, 'PROPOSTA DE COMPRA', companyInfo);
  y += 2;

  // Identification bar
  doc.setFillColor(...BRAND_COLORS.lightGray);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Código: ${proposta.codigo}`, 18, y + 5.5);
  if (proposta.numero_proposta) {
    doc.text(`Nº Proposta: ${proposta.numero_proposta}`, 80, y + 5.5);
  }
  doc.text(`Data: ${formatDate(proposta.data_hora)}`, pageWidth - 18, y + 5.5, { align: 'right' });
  y += 12;

  // Proponent section
  y = drawSection(doc, 'IDENTIFICAÇÃO DO PROPONENTE (COMPRADOR)', y);
  const col1 = 18;
  const col2 = pageWidth / 2 + 5;
  const halfW = (pageWidth - 36) / 2 - 5;

  drawField(doc, 'Nome completo / Razão social', proposta.nome_completo, col1, y, halfW);
  y = drawField(doc, 'CPF / CNPJ', proposta.cpf_cnpj, col2, y, halfW);
  y += 4;

  drawField(doc, 'Telefone / WhatsApp', proposta.telefone, col1, y, halfW);
  y = drawField(doc, 'E-mail', proposta.email || '—', col2, y, halfW);
  y += 6;

  // Property section
  y = checkPage(doc, y, 40);
  y = drawSection(doc, 'IDENTIFICAÇÃO DO IMÓVEL', y);
  y = drawField(doc, 'Endereço', proposta.endereco_resumido, col1, y, pageWidth - 36);
  y += 2;
  drawField(doc, 'Unidade', proposta.unidade || '—', col1, y, halfW);
  y = drawField(doc, 'Matrícula', proposta.matricula || '—', col2, y, halfW);
  y += 6;

  // Values section
  y = checkPage(doc, y, 50);
  y = drawSection(doc, 'VALOR OFERTADO E CONDIÇÕES DE PAGAMENTO', y);
  y = drawField(doc, 'Valor total ofertado', formatCurrency(proposta.valor_ofertado), col1, y, pageWidth - 36);
  y += 2;
  drawField(doc, 'Sinal / Entrada', proposta.sinal_entrada || '—', col1, y, halfW);
  y = drawField(doc, 'Financiamento', proposta.financiamento || '—', col2, y, halfW);
  y += 2;
  if (proposta.parcelas) {
    y = drawField(doc, 'Parcelas', proposta.parcelas, col1, y, pageWidth - 36);
    y += 2;
  }
  if (proposta.outras_condicoes) {
    y = drawField(doc, 'Outras condições', proposta.outras_condicoes, col1, y, pageWidth - 36);
    y += 2;
  }
  y += 4;

  // Validity
  y = checkPage(doc, y, 25);
  y = drawSection(doc, 'VALIDADE E FORMA DE ACEITE', y);
  drawField(doc, 'Cidade/UF', proposta.cidade_uf || '—', col1, y, halfW);
  y = drawField(doc, 'Validade', proposta.validade_proposta ? formatDate(proposta.validade_proposta) : '—', col2, y, halfW);
  y += 2;
  const formaAceiteLabel = proposta.forma_aceite === 'escrito'
    ? 'Aceite por escrito (e-mail/WhatsApp)'
    : 'Assinatura neste documento';
  y = drawField(doc, 'Forma de aceite', formaAceiteLabel, col1, y, pageWidth - 36);
  y += 6;

  // Disclaimer
  y = checkPage(doc, y, 30);
  doc.setFillColor(255, 250, 235);
  doc.setDrawColor(...BRAND_COLORS.gold);
  doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, 22, 'FD');
  doc.setTextColor(...BRAND_COLORS.darkGray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Cláusula de Documento Posterior', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const disclaimerText = 'Este documento serve exclusivamente para validação de valor e condições de pagamento. ' +
    'Os demais termos, informações e condições completas — incluindo obrigações das partes, documentação, prazos, ' +
    'posse, responsabilidades, garantias, penalidades e formalização — constarão do Instrumento de Promessa/Compromisso ' +
    'de Compra e Venda a ser apresentado após o aceite.';
  const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 38);
  doc.text(disclaimerLines, 18, y + 9);
  y += 26;

  // Buyer signature
  y = checkPage(doc, y, 45);
  y = drawSection(doc, 'ASSINATURA DO PROPONENTE (COMPRADOR)', y);
  if (proposta.assinatura_proponente) {
    try {
      doc.addImage(proposta.assinatura_proponente, 'PNG', col1, y, 60, 25);
    } catch {
      doc.setTextColor(...BRAND_COLORS.gray);
      doc.setFontSize(8);
      doc.text('[Assinatura digital registrada]', col1, y + 12);
    }
  }
  doc.setDrawColor(...BRAND_COLORS.gray);
  doc.setLineWidth(0.3);
  doc.line(col1, y + 28, col1 + 70, y + 28);
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.setFontSize(7);
  doc.text(proposta.nome_completo, col1, y + 32);
  doc.text(`CPF/CNPJ: ${proposta.cpf_cnpj}`, col1, y + 36);
  y += 42;

  // Seller signature (blank space for seller to sign)
  y = checkPage(doc, y, 50);
  y = drawSection(doc, 'ACEITE DO VENDEDOR (PROPRIETÁRIO)', y);
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Eu, abaixo assinado, ACEITO os termos e valores desta proposta.', col1, y + 4);
  y += 10;

  // Blank fields for seller
  const fieldW = 70;
  doc.setDrawColor(...BRAND_COLORS.gray);
  doc.setLineWidth(0.3);

  // Name
  doc.setTextColor(...BRAND_COLORS.gray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Nome completo:', col1, y);
  doc.line(col1 + 22, y, col1 + fieldW + 22, y);
  y += 8;

  // CPF
  doc.text('CPF:', col1, y);
  doc.line(col1 + 10, y, col1 + fieldW - 10, y);
  doc.text('Data:', col2, y);
  doc.line(col2 + 10, y, col2 + fieldW - 10, y);
  y += 12;

  // Signature line
  doc.line(col1, y, col1 + 80, y);
  doc.setFontSize(7);
  doc.text('Assinatura do Vendedor', col1, y + 4);

  drawGodoyFooter(doc, companyInfo);

  return doc;
}

export async function exportPropostaPdf(proposta: PropostaData): Promise<void> {
  const doc = await generatePropostaPdf(proposta);
  doc.save(`proposta-${proposta.codigo}.pdf`);
}
