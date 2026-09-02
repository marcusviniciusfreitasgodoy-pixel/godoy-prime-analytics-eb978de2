import jsPDF from "jspdf";
import { FichaVisita, FeedbackVisita, Acompanhante } from "@/types/visitas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BRAND_COLORS, CONTACT_INFO, applyFootersToAllPages } from "./pdfTemplate";
import godoyLogoWhite from "@/assets/godoy-logo-white.png";

interface FichaVisitaPdfData {
  ficha: FichaVisita;
  feedback?: FeedbackVisita | null;
  customLogoBase64?: string | null;
  companySettings?: {
    company_name?: string;
    company_cnpj?: string;
    company_address?: string;
    company_phone?: string;
    company_website?: string;
    company_creci?: string;
  } | null;
  corretorInfo?: {
    creci?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

const COLORS = {
  navy: BRAND_COLORS.navy,
  gold: BRAND_COLORS.gold,
  white: BRAND_COLORS.white,
  gray: BRAND_COLORS.gray,
  lightGray: BRAND_COLORS.lightGray,
  black: [0, 0, 0] as [number, number, number],
};

// Layout constants — full A4 usage between header and footer
const M = 12; // margin
const FOOTER_H = 10; // footer height
const PAGE_H = 297; // A4 height
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 4; // usable bottom limit

const LH_FIELD = 5; // line height for fields
const LH_LEGAL = 3.2; // line height for legal text
const FONT_FIELD = 7.5;
const FONT_LEGAL = 6.5;
const SECTION_H = 6; // section header height
const SECTION_PAD = 2.5; // padding between section title and first field
const LEGAL_GAP = 2.5; // gap after legal text block

// Helper to load default logo as base64
async function loadDefaultLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch(godoyLogoWhite);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportFichaVisitaPdf({ ficha, feedback, customLogoBase64, companySettings, corretorInfo }: FichaVisitaPdfData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - M * 2;
  let y = 0;

  const company = {
    name: companySettings?.company_name || CONTACT_INFO.name || "GODOY PRIME REALTY",
    cnpj: companySettings?.company_cnpj || CONTACT_INFO.cnpj || "",
    address: companySettings?.company_address || CONTACT_INFO.address,
    phone: companySettings?.company_phone || CONTACT_INFO.phone,
    website: companySettings?.company_website || CONTACT_INFO.website,
    creci: companySettings?.company_creci || CONTACT_INFO.creci,
  };

  const corretorCreci = corretorInfo?.creci || "_______________";
  const corretorContato = corretorInfo?.phone || corretorInfo?.email || "_______________";
  const dataVisita = format(new Date(ficha.data_visita), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Load logo — prefer custom, fallback to default white GR symbol
  let logoToUse = customLogoBase64;
  if (!logoToUse) {
    logoToUse = await loadDefaultLogoBase64();
  }

  // ========== HEADER (22mm) ==========
  const headerH = 22;
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, headerH, "F");

  if (logoToUse) {
    try { doc.addImage(logoToUse, "PNG", M, 2, 18, 18); } catch { /* imagem inválida: segue sem ela */ }
  }

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE VISITA / TERMO DE APRESENTAÇÃO DE IMÓVEL", pageWidth / 2, headerH / 2 + 2, { align: "center" });

  y = headerH + 3;

  // ========== INTERMEDIAÇÃO (compact box) ==========
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(M, y, contentWidth, 11, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("INTERMEDIAÇÃO", M + 2, y + 3.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Imobiliária: ${company.name} | CNPJ: ${company.cnpj} | Registro: ${ficha.codigo} | Data: ${dataVisita}`, M + 2, y + 7);
  doc.text(`Corretor(a): ${ficha.nome_corretor} | CRECI: ${corretorCreci} | Contato: ${corretorContato}`, M + 2, y + 10);

  y += 14;

  // ========== 1) IDENTIFICAÇÃO DO CLIENTE ==========
  y = drawSectionHeader(doc, "1) IDENTIFICAÇÃO DO CLIENTE (VISITANTE)", M, y, contentWidth);

  doc.setTextColor(...COLORS.black);
  doc.setFontSize(FONT_FIELD);

  drawField(doc, "Nome:", ficha.nome_visitante, M, y, 14);
  y += LH_FIELD;
  drawField(doc, "CPF:", ficha.cpf_visitante, M, y, 12);
  drawField(doc, "RG:", ficha.rg_visitante || "_______________", M + 55, y, 10);
  drawField(doc, "Tel:", ficha.telefone_visitante, M + 100, y, 10);
  y += LH_FIELD;
  drawField(doc, "E-mail:", ficha.email_visitante || "___________________", M, y, 16);
  drawField(doc, "End.:", ficha.endereco_visitante || "________________________________", M + 80, y, 12);
  y += LH_FIELD;

  // Acompanhantes (inline)
  const acompanhantes = (ficha.acompanhantes || []) as Acompanhante[];
  if (acompanhantes.length > 0) {
    const acompStr = acompanhantes.map(a => `${a.nome} (CPF: ${a.cpf || "—"})`).join("  |  ");
    drawField(doc, "Acomp.:", acompStr, M, y, 16);
  } else {
    doc.setFont("helvetica", "normal");
    doc.text("Acomp.: _________________________________  CPF: _______________", M, y);
  }
  y += LH_FIELD + 2;

  // ========== 2) IDENTIFICAÇÃO DO IMÓVEL ==========
  y = drawSectionHeader(doc, "2) IDENTIFICAÇÃO DO IMÓVEL VISITADO", M, y, contentWidth);

  doc.setFontSize(FONT_FIELD);
  drawField(doc, "End.:", ficha.endereco_imovel, M, y, 12);
  y += LH_FIELD;
  drawField(doc, "Cond./Edif.:", ficha.condominio_edificio || "___________________", M, y, 24);
  drawField(doc, "Unid.:", ficha.unidade_imovel || "________", M + 80, y, 14);
  drawField(doc, "Cód.:", ficha.codigo_imovel || "________", M + 120, y, 12);
  y += LH_FIELD + 2;

  // ========== 3) DECLARAÇÃO DE VISITA ==========
  y = drawSectionHeader(doc, "3) DECLARAÇÃO DE VISITA E CIÊNCIA", M, y, contentWidth);

  doc.setFontSize(FONT_LEGAL);
  doc.setTextColor(...COLORS.black);
  const decl3 = doc.splitTextToSize(
    `O(a) Cliente acima identificado(a) declara que, nesta data, visitou e conheceu o imóvel descrito no item 2, apresentado pela intermediação indicada neste documento, para fins de avaliação de interesse.`,
    contentWidth
  );
  doc.text(decl3, M, y);
  y += decl3.length * LH_LEGAL + LEGAL_GAP;

  // ========== 4) NÃO VINCULAÇÃO ==========
  y = drawSectionHeader(doc, "4) NÃO VINCULAÇÃO E ESCOPO DESTE TERMO", M, y, contentWidth);

  doc.setFontSize(FONT_LEGAL);
  doc.setTextColor(...COLORS.black);
  const decl4 = doc.splitTextToSize(
    `Este documento: a) não constitui proposta de compra, reserva, promessa, contrato de compra e venda ou compromisso; b) não obriga o Cliente, o Vendedor ou a Intermediadora à realização de negócio; e c) tem como finalidade registrar a apresentação/visita do imóvel e a atuação de intermediação.`,
    contentWidth
  );
  doc.text(decl4, M, y);
  y += decl4.length * LH_LEGAL + LEGAL_GAP;

  // ========== 5) CIÊNCIA DE INTERMEDIAÇÃO ==========
  y = drawSectionHeader(doc, "5) CIÊNCIA DE INTERMEDIAÇÃO E JANELA DE PROTEÇÃO", M, y, contentWidth);

  doc.setFontSize(FONT_LEGAL);
  doc.setTextColor(...COLORS.black);
  const clausula = doc.splitTextToSize(
    `CIÊNCIA DE INTERMEDIAÇÃO E JANELA DE PROTEÇÃO: O(a) Cliente declara ciência e reconhece que tomou conhecimento do imóvel identificado neste termo por meio da intermediação da Imobiliária/Corretor(a) acima indicado(a), razão pela qual, caso venha a iniciar, retomar ou concluir tratativas relativas a este mesmo imóvel, direta ou indiretamente, pelo prazo de 180 (cento e oitenta) dias contados da data desta visita, compromete-se a comunicar previamente a Imobiliária/Corretor(a) para fins de registro e adequada condução da negociação, permanecendo a remuneração de corretagem sujeita à disciplina dos instrumentos de intermediação aplicáveis e/ou ajuste específico entre as partes, não constituindo este termo, por si só, reserva, proposta, promessa de compra e venda ou título de cobrança.`,
    contentWidth
  );
  doc.text(clausula, M, y);
  y += clausula.length * LH_LEGAL + LEGAL_GAP;

  // ========== 6) LGPD ==========
  y = drawSectionHeader(doc, "6) LGPD (TRATAMENTO DE DADOS)", M, y, contentWidth);

  doc.setFontSize(FONT_LEGAL);
  doc.setTextColor(...COLORS.black);
  const lgpd = doc.splitTextToSize(
    `O(a) Cliente declara ciência de que seus dados pessoais serão tratados pela Imobiliária/Corretor(a) exclusivamente para: (i) registro da visita, (ii) comunicação sobre esta negociação e (iii) envio de informações relacionadas ao imóvel visitado e similares quando autorizado. Solicitações de acesso, correção ou exclusão de dados pelo canal: ${corretorInfo?.email || company.phone}.`,
    contentWidth
  );
  doc.text(lgpd, M, y);
  y += lgpd.length * LH_LEGAL + 1.5;

  // Opt-in
  const optSim = ficha.aceita_ofertas_similares ? "X" : " ";
  const optNao = ficha.aceita_ofertas_similares ? " " : "X";
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(`Ofertas similares:  [${optSim}] SIM   [${optNao}] NÃO`, M, y);
  doc.setFont("helvetica", "normal");
  y += 5;

  // ========== ASSINATURAS (separator line) ==========
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + contentWidth, y);
  y += 3;

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURAS", M, y);
  doc.setFont("helvetica", "normal");
  y += 2;

  const dataAtual = format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.black);
  doc.text(`Rio de Janeiro/RJ, ${dataAtual}`, M, y);
  y += 4;

  // Dynamically size signature boxes to fill remaining space
  const remainingSpace = CONTENT_BOTTOM - y - 5; // 5mm for label below
  const sigH = Math.min(Math.max(remainingSpace, 14), 28); // clamp 14-28mm
  const sigW = 72;

  // Cliente
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.3);
  doc.rect(M, y, sigW, sigH);
  if (ficha.assinatura_visitante) {
    try { doc.addImage(ficha.assinatura_visitante, "PNG", M + 1, y + 1, sigW - 2, sigH - 2); } catch { /* imagem inválida: segue sem ela */ }
  }
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.navy);
  doc.text(`Cliente — ${ficha.nome_visitante}`, M, y + sigH + 3);

  // Corretor
  const sigX2 = pageWidth / 2 + 8;
  doc.rect(sigX2, y, sigW, sigH);
  if (ficha.assinatura_corretor) {
    try { doc.addImage(ficha.assinatura_corretor, "PNG", sigX2 + 1, y + 1, sigW - 2, sigH - 2); } catch { /* imagem inválida: segue sem ela */ }
  }
  doc.text(`Corretor(a) — ${ficha.nome_corretor} | CRECI: ${corretorCreci}`, sigX2, y + sigH + 3);

  // ========== FOOTER ==========
  applyFootersToAllPages(doc);

  return doc;
}

// Alias for generating PDF doc for email
export const generateFichaVisitaPdfDoc = exportFichaVisitaPdf;

export async function saveFichaVisitaPdf(data: FichaVisitaPdfData): Promise<void> {
  const doc = await exportFichaVisitaPdf(data);
  const filename = `ficha-visita-${data.ficha.codigo}.pdf`;
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========== HELPERS ==========

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number): number {
  doc.setFillColor(...COLORS.gold);
  doc.rect(x, y, width, SECTION_H, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + 2, y + 4);
  doc.setFont("helvetica", "normal");
  return y + SECTION_H + SECTION_PAD; // return Y after header + padding
}

function drawField(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth: number): void {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.black);
  doc.text(value, x + labelWidth, y);
}
