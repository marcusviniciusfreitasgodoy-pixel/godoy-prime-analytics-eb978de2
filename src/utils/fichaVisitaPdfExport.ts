import jsPDF from "jspdf";
import { FichaVisita, FeedbackVisita, Acompanhante } from "@/types/visitas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BRAND_COLORS, CONTACT_INFO, applyFootersToAllPages } from "./pdfTemplate";

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

export async function exportFichaVisitaPdf({ ficha, feedback, customLogoBase64, companySettings, corretorInfo }: FichaVisitaPdfData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 10;

  const company = {
    name: companySettings?.company_name || CONTACT_INFO.name || "GODOY PRIME REALTY",
    cnpj: companySettings?.company_cnpj || CONTACT_INFO.cnpj || "",
    address: companySettings?.company_address || CONTACT_INFO.address,
    phone: companySettings?.company_phone || CONTACT_INFO.phone,
    website: companySettings?.company_website || CONTACT_INFO.website,
    creci: companySettings?.company_creci || CONTACT_INFO.creci,
  };

  // ========== HEADER ==========
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 30, "F");

  if (customLogoBase64) {
    try { doc.addImage(customLogoBase64, "PNG", margin, 4, 22, 22); } catch {}
  }

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE VISITA / TERMO DE APRESENTAÇÃO DE IMÓVEL", pageWidth / 2, 13, { align: "center" });

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BARRA DA TIJUCA / RJ", pageWidth / 2, 20, { align: "center" });

  // Registration & date
  const dataVisita = format(new Date(ficha.data_visita), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.setFontSize(7.5);
  doc.text(`Nº do registro: ${ficha.codigo}  |  Data/hora: ${dataVisita}  |  Local: Rio de Janeiro/RJ`, pageWidth / 2, 27, { align: "center" });

  y = 34;

  // ========== INTERMEDIAÇÃO ==========
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin, y, contentWidth, 14, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("INTERMEDIAÇÃO", margin + 3, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(`Imobiliária: ${company.name} | CNPJ: ${company.cnpj}`, margin + 3, y + 8);
  const corretorCreci = corretorInfo?.creci || "_______________";
  const corretorContato = corretorInfo?.phone || corretorInfo?.email || "_______________";
  doc.text(`Corretor(a): ${ficha.nome_corretor} | CRECI: ${corretorCreci} | Contato: ${corretorContato}`, margin + 3, y + 12);

  y += 18;

  // ========== 1) IDENTIFICAÇÃO DO CLIENTE ==========
  drawSectionHeader(doc, "1) IDENTIFICAÇÃO DO CLIENTE (VISITANTE)", margin, y, contentWidth);
  y += 10;

  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8.5);

  drawFieldLine(doc, "Nome completo:", ficha.nome_visitante, margin, y, 32);
  y += 6;
  drawFieldLine(doc, "CPF:", ficha.cpf_visitante, margin, y, 12);
  drawFieldLine(doc, "RG:", ficha.rg_visitante || "_______________", margin + 55, y, 10);
  y += 6;
  drawFieldLine(doc, "Telefone/WhatsApp:", ficha.telefone_visitante, margin, y, 38);
  drawFieldLine(doc, "E-mail:", ficha.email_visitante || "___________________", margin + 90, y, 16);
  y += 6;
  drawFieldLine(doc, "Endereço:", ficha.endereco_visitante || "________________________________________________________", margin, y, 22);
  y += 6;

  // Acompanhantes
  const acompanhantes = (ficha.acompanhantes || []) as Acompanhante[];
  if (acompanhantes.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Acompanhante(s):", margin, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    acompanhantes.forEach((a) => {
      doc.text(`Nome: ${a.nome}  |  CPF: ${a.cpf || "(não informado)"}`, margin + 4, y);
      y += 5;
    });
  } else {
    doc.text("Acompanhante(s): _________________________________  CPF: _______________", margin, y);
    y += 5;
  }

  y += 4;

  // ========== 2) IDENTIFICAÇÃO DO IMÓVEL ==========
  drawSectionHeader(doc, "2) IDENTIFICAÇÃO DO IMÓVEL VISITADO (REFERÊNCIA)", margin, y, contentWidth);
  y += 10;

  doc.setFontSize(8.5);
  drawFieldLine(doc, "Endereço:", ficha.endereco_imovel, margin, y, 22);
  y += 6;
  drawFieldLine(doc, "Condomínio/Edifício:", ficha.condominio_edificio || "___________________", margin, y, 42);
  y += 6;
  drawFieldLine(doc, "Unidade:", ficha.unidade_imovel || "___________________", margin, y, 18);
  drawFieldLine(doc, "Código interno:", ficha.codigo_imovel || "_______________", margin + 70, y, 32);
  y += 10;

  // ========== 3) DECLARAÇÃO DE VISITA E CIÊNCIA ==========
  drawSectionHeader(doc, "3) DECLARAÇÃO DE VISITA E CIÊNCIA", margin, y, contentWidth);
  y += 10;

  doc.setFontSize(7.5);
  const decl3 = doc.splitTextToSize(
    `O(a) Cliente acima identificado(a) declara que, nesta data, visitou e conheceu o imóvel descrito no item 2, apresentado pela intermediação indicada neste documento, para fins de avaliação de interesse.`,
    contentWidth
  );
  doc.text(decl3, margin, y);
  y += decl3.length * 4 + 4;

  // ========== 4) NÃO VINCULAÇÃO ==========
  drawSectionHeader(doc, "4) NÃO VINCULAÇÃO E ESCOPO DESTE TERMO", margin, y, contentWidth);
  y += 10;

  doc.setFontSize(7.5);
  const decl4 = doc.splitTextToSize(
    `Este documento: a) não constitui proposta de compra, reserva, promessa, contrato de compra e venda ou compromisso; b) não obriga o Cliente, o Vendedor ou a Intermediadora à realização de negócio; e c) tem como finalidade registrar a apresentação/visita do imóvel e a atuação de intermediação.`,
    contentWidth
  );
  doc.text(decl4, margin, y);
  y += decl4.length * 4 + 4;

  // ========== 5) CIÊNCIA DE INTERMEDIAÇÃO E JANELA DE PROTEÇÃO ==========
  if (y > pageHeight - 90) { doc.addPage(); y = 20; }

  drawSectionHeader(doc, "5) CIÊNCIA DE INTERMEDIAÇÃO E JANELA DE PROTEÇÃO", margin, y, contentWidth);
  y += 10;

  doc.setFontSize(7.5);
  const clausula = doc.splitTextToSize(
    `CIÊNCIA DE INTERMEDIAÇÃO E JANELA DE PROTEÇÃO: O(a) Cliente declara ciência e reconhece que tomou conhecimento do imóvel identificado neste termo por meio da intermediação da Imobiliária/Corretor(a) acima indicado(a), razão pela qual, caso venha a iniciar, retomar ou concluir tratativas relativas a este mesmo imóvel, direta ou indiretamente, pelo prazo de 180 (cento e oitenta) dias contados da data desta visita, compromete-se a comunicar previamente a Imobiliária/Corretor(a) para fins de registro e adequada condução da negociação, permanecendo a remuneração de corretagem sujeita à disciplina dos instrumentos de intermediação aplicáveis e/ou ajuste específico entre as partes, não constituindo este termo, por si só, reserva, proposta, promessa de compra e venda ou título de cobrança.`,
    contentWidth
  );
  doc.text(clausula, margin, y);
  y += clausula.length * 4 + 4;

  // ========== 6) LGPD ==========
  if (y > pageHeight - 60) { doc.addPage(); y = 20; }

  drawSectionHeader(doc, "6) LGPD (TRATAMENTO DE DADOS)", margin, y, contentWidth);
  y += 10;

  doc.setFontSize(7.5);
  const lgpd = doc.splitTextToSize(
    `O(a) Cliente declara ciência de que seus dados pessoais fornecidos neste termo serão tratados pela Imobiliária/Corretor(a), na qualidade de controlador(a)/operador(a), exclusivamente para: (i) registro da visita/apresentação, (ii) comunicação sobre esta negociação e (iii) envio de informações relacionadas ao imóvel visitado e a imóveis similares quando autorizado. O(a) Cliente poderá solicitar acesso, correção, atualização ou exclusão de dados, quando aplicável, pelo canal: ${corretorInfo?.email || company.phone}.`,
    contentWidth
  );
  doc.text(lgpd, margin, y);
  y += lgpd.length * 4 + 4;

  // Opt-in
  const optSim = ficha.aceita_ofertas_similares ? "X" : " ";
  const optNao = ficha.aceita_ofertas_similares ? " " : "X";
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Autorização para receber ofertas de imóveis similares:  [${optSim}] SIM   [${optNao}] NÃO`, margin, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  // ========== 7) ASSINATURAS ==========
  if (y > pageHeight - 55) { doc.addPage(); y = 20; }

  drawSectionHeader(doc, "7) ASSINATURAS", margin, y, contentWidth);
  y += 12;

  doc.setFontSize(8.5);
  const dataAtual = format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.text(`Local e data: Rio de Janeiro/RJ, ${dataAtual}`, margin, y);
  y += 10;

  const sigW = 75;
  const sigH = 22;

  // Cliente
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, sigW, sigH);
  if (ficha.assinatura_visitante) {
    try { doc.addImage(ficha.assinatura_visitante, "PNG", margin + 2, y + 2, sigW - 4, sigH - 4); } catch {}
  }
  doc.setFontSize(7.5);
  doc.text(`Cliente — ${ficha.nome_visitante}`, margin, y + sigH + 4);

  // Corretor
  const sigX2 = pageWidth / 2 + 5;
  doc.rect(sigX2, y, sigW, sigH);
  if (ficha.assinatura_corretor) {
    try { doc.addImage(ficha.assinatura_corretor, "PNG", sigX2 + 2, y + 2, sigW - 4, sigH - 4); } catch {}
  }
  doc.text(`Corretor(a) — ${ficha.nome_corretor} | CRECI: ${corretorCreci}`, sigX2, y + sigH + 4);

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

// ========== FUNÇÕES AUXILIARES ==========

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number): void {
  doc.setFillColor(...COLORS.gold);
  doc.rect(x, y, width, 7, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + 3, y + 5);
  doc.setFont("helvetica", "normal");
}

function drawFieldLine(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth: number): void {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.navy);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.black);
  doc.text(value, x + labelWidth, y);
}
