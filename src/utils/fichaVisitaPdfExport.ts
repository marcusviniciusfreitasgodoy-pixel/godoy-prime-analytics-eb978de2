import jsPDF from "jspdf";
import { FichaVisita, FeedbackVisita } from "@/types/visitas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FichaVisitaPdfData {
  ficha: FichaVisita;
  feedback?: FeedbackVisita | null;
}

// Cores da marca
const COLORS = {
  navy: [26, 26, 46] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

// Dados da empresa
const COMPANY = {
  name: "GODOY PRIME REALTY",
  cnpj: "58.409.058/0001-73",
  address: "Barra da Tijuca, Rio de Janeiro - RJ",
  phone: "(21) 96407-5124",
  site: "godoyprime.com.br",
};

export async function exportFichaVisitaPdf({ ficha, feedback }: FichaVisitaPdfData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 10;

  // ========== HEADER ==========
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, pageWidth / 2, 12, { align: "center" });

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FICHA DE VISITA TÉCNICA - IMÓVEIS DE ALTO PADRÃO", pageWidth / 2, 20, { align: "center" });

  y = 32;

  // ========== DADOS DA IMOBILIÁRIA ==========
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin, y, contentWidth, 12, "F");

  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`IMOBILIÁRIA: ${COMPANY.name} LTDA | CNPJ: ${COMPANY.cnpj}`, margin + 3, y + 5);
  doc.text(`Endereço: ${COMPANY.address} | Tel: ${COMPANY.phone} | Site: ${COMPANY.site}`, margin + 3, y + 10);

  y += 16;

  // ========== CORRETOR RESPONSÁVEL ==========
  drawSectionHeader(doc, "CORRETOR RESPONSÁVEL", margin, y, contentWidth);
  y += 8;

  doc.setTextColor(...COLORS.black);
  doc.setFontSize(9);
  
  drawFieldLine(doc, "Nome:", ficha.nome_corretor, margin, y, 60);
  drawFieldLine(doc, "CRECI:", "_______________", margin + 90, y, 30);
  drawFieldLine(doc, "Tel/WhatsApp:", "________________", margin + 135, y, 35);
  
  y += 12;

  // ========== DADOS DO CLIENTE ==========
  drawSectionHeader(doc, "DADOS DO CLIENTE (OBRIGATÓRIO PARA IDENTIFICAÇÃO)", margin, y, contentWidth);
  y += 8;

  doc.setFontSize(9);
  
  drawFieldLine(doc, "Nome completo:", ficha.nome_visitante, margin, y, 35);
  y += 7;

  drawFieldLine(doc, "CPF:", ficha.cpf_visitante, margin, y, 12);
  drawFieldLine(doc, "RG:", "____________________", margin + 55, y, 10);
  drawFieldLine(doc, "Data Nasc:", "___/___/____", margin + 105, y, 25);
  y += 7;

  drawFieldLine(doc, "Estado Civil:", "_______________", margin, y, 28);
  drawFieldLine(doc, "Profissão:", "____________________________________", margin + 65, y, 25);
  y += 7;

  drawFieldLine(doc, "Endereço:", "____________________________________________________________________", margin, y, 22);
  y += 7;

  drawFieldLine(doc, "Tel/WhatsApp:", ficha.telefone_visitante, margin, y, 32);
  drawFieldLine(doc, "E-mail:", ficha.email_visitante || "____________________", margin + 80, y, 18);
  
  y += 12;

  // ========== IMÓVEL VISITADO ==========
  drawSectionHeader(doc, "IMÓVEL VISITADO", margin, y, contentWidth);
  y += 8;

  doc.setFontSize(9);

  drawFieldLine(doc, "Código Interno:", ficha.codigo_imovel || "_____________", margin, y, 35);
  doc.text("Tipo: (  ) Casa  (  ) Apt  (  ) Cobertura  (  ) Outro: ________", margin + 75, y);
  y += 7;

  drawFieldLine(doc, "Endereço Completo:", ficha.endereco_imovel, margin, y, 42);
  y += 7;

  drawFieldLine(doc, "Bairro:", "Barra da Tijuca", margin, y, 16);
  drawFieldLine(doc, "Características:", "___________________", margin + 60, y, 38);
  y += 7;

  const valorFormatado = ficha.valor_imovel
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ficha.valor_imovel)
    : "____________________________________________________";
  drawFieldLine(doc, "Valor de Referência (R$):", valorFormatado, margin, y, 52);
  y += 7;

  const statusMap: Record<string, string> = {
    agendada: "Disponível",
    confirmada: "Disponível",
    realizada: "Disponível",
    cancelada: "Sob Consulta",
  };
  doc.text(`Situação: (${ficha.status !== 'cancelada' ? 'X' : ' '}) Disponível  (  ) Reservado  (${ficha.status === 'cancelada' ? 'X' : ' '}) Sob Consulta`, margin, y);
  
  y += 12;

  // ========== DETALHES DA VISITA ==========
  drawSectionHeader(doc, "DETALHES DA VISITA", margin, y, contentWidth);
  y += 8;

  doc.setFontSize(9);
  const dataVisita = format(new Date(ficha.data_visita), "dd/MM/yyyy", { locale: ptBR });
  const horaVisita = format(new Date(ficha.data_visita), "HH:mm", { locale: ptBR });
  
  doc.text(`Data: ${dataVisita}  |  Início: ${horaVisita}h  |  Término: ____h  |  Forma: (X) Presencial  (  ) Virtual`, margin, y);
  
  y += 12;

  // ========== DECLARAÇÃO DE INTERMEDIAÇÃO ==========
  drawSectionHeader(doc, "DECLARAÇÃO DE INTERMEDIAÇÃO E CIÊNCIA (OBRIGATÓRIO - LEIA E ASSINE)", margin, y, contentWidth);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.black);
  
  const declaracao = [
    `Eu, ${ficha.nome_visitante.toUpperCase()}, declaro que:`,
    "",
    "1. Conheci e visitei o imóvel acima por intermédio exclusivo da Godoy Prime Realty e seu corretor responsável.",
    "",
    "2. Qualquer negociação futura deste imóvel (proposta, compra, locação) será tratada SOMENTE por esta",
    "   imobiliária, sob pena de reconhecimento do direito à comissão integral.",
    "",
    "3. Caso adquira/locação este imóvel em até 12 (doze) meses, direta ou indiretamente, reconheço o direito",
    "   à comissão de corretagem de 6% (seis por cento) sobre o valor total do negócio, a ser paga pelo",
    "   [  ] Comprador/Locatário   [  ] Vendedor/Locador   [  ] Dividida.",
    "",
    "Esta ficha registra a aproximação profissional, nos termos da Lei 6.530/78 e jurisprudência do STJ.",
  ];

  declaracao.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });

  y += 6;

  // ========== FEEDBACK RÁPIDO (se existir) ==========
  if (feedback || ficha.notas) {
    drawSectionHeader(doc, "FEEDBACK RÁPIDO (OPCIONAL - Ajuda a refinar sua busca)", margin, y, contentWidth);
    y += 8;

    doc.setFontSize(8);

    if (feedback) {
      const interesseMap: Record<string, string> = {
        alto: "Comprar",
        muito_alto: "Comprar",
        medio: "Avaliar",
        baixo: "Avaliar",
      };
      const interesse = feedback.nivel_interesse ? interesseMap[feedback.nivel_interesse] || "Avaliar" : "";
      doc.text(`Interesse: (${interesse === 'Comprar' ? 'X' : ' '}) Comprar  (  ) Locar  (  ) Investir  (${interesse === 'Avaliar' ? 'X' : ' '}) Avaliar`, margin, y);
      y += 5;

      if (feedback.o_que_mais_gostou) {
        const pontosPositivos = doc.splitTextToSize(`Pontos Positivos: ${feedback.o_que_mais_gostou}`, contentWidth);
        doc.text(pontosPositivos, margin, y);
        y += pontosPositivos.length * 4;
      }

      if (feedback.o_que_menos_gostou) {
        const pontosMelhoria = doc.splitTextToSize(`Pontos de Melhoria: ${feedback.o_que_menos_gostou}`, contentWidth);
        doc.text(pontosMelhoria, margin, y);
        y += pontosMelhoria.length * 4;
      }
    }

    if (ficha.notas) {
      const notas = doc.splitTextToSize(`Observações: ${ficha.notas}`, contentWidth);
      doc.text(notas, margin, y);
      y += notas.length * 4;
    }

    y += 6;
  } else {
    drawSectionHeader(doc, "FEEDBACK RÁPIDO (OPCIONAL - Ajuda a refinar sua busca)", margin, y, contentWidth);
    y += 8;

    doc.setFontSize(8);
    doc.text("Interesse: (  ) Comprar  (  ) Locar  (  ) Investir  (  ) Avaliar", margin, y);
    y += 5;
    doc.text("Pontos Positivos: ___________________________________________________________", margin, y);
    y += 5;
    doc.text("Pontos de Melhoria: _________________________________________________________", margin, y);
    y += 5;
    doc.text("Próximo Passo Desejado: _____________________________________________________", margin, y);
    y += 10;
  }

  // ========== ASSINATURAS ==========
  // Verificar se precisa de nova página
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  drawSectionHeader(doc, "ASSINATURAS (DIGITAL OU FÍSICA)", margin, y, contentWidth);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.black);
  
  const dataAtual = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  doc.text(`Local/Data: Rio de Janeiro, ${dataAtual}`, margin, y);
  y += 10;

  const signatureWidth = 75;
  const signatureHeight = 25;
  const signatureX1 = margin;
  const signatureX2 = pageWidth / 2 + 5;

  // Assinatura Cliente
  doc.setDrawColor(...COLORS.navy);
  doc.setLineWidth(0.3);
  doc.rect(signatureX1, y, signatureWidth, signatureHeight);

  if (ficha.assinatura_visitante) {
    try {
      doc.addImage(ficha.assinatura_visitante, "PNG", signatureX1 + 2, y + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do cliente:", e);
    }
  }

  doc.setFontSize(8);
  doc.text("Cliente", signatureX1 + signatureWidth / 2, y + signatureHeight + 5, { align: "center" });

  // Assinatura Cônjuge
  doc.rect(signatureX2, y, signatureWidth, signatureHeight);
  doc.text("Cônjuge (se aplicável)", signatureX2 + signatureWidth / 2, y + signatureHeight + 5, { align: "center" });

  y += signatureHeight + 15;

  // Assinatura Corretor
  doc.rect(signatureX1, y, signatureWidth, signatureHeight);

  if (ficha.assinatura_corretor) {
    try {
      doc.addImage(ficha.assinatura_corretor, "PNG", signatureX1 + 2, y + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do corretor:", e);
    }
  }

  doc.text("Corretor", signatureX1 + signatureWidth / 2, y + signatureHeight + 5, { align: "center" });

  // Campo CRECI ao lado da assinatura do corretor
  doc.text("CRECI: _________________________", signatureX2, y + signatureHeight / 2);
  doc.text(`Hora Assinatura: ${format(new Date(), "HH:mm")}`, signatureX2, y + signatureHeight / 2 + 8);

  // ========== FOOTER ==========
  const footerY = pageHeight - 10;
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, footerY - 5, pageWidth, 15, "F");

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(7);
  doc.text(`${COMPANY.name} | ${COMPANY.site} | ${COMPANY.phone}`, pageWidth / 2, footerY, { align: "center" });

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(6);
  doc.text(`Código: ${ficha.codigo} | Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, footerY + 4, { align: "center" });

  // Salvar
  doc.save(`ficha-visita-${ficha.codigo}.pdf`);
}

// ========== FUNÇÕES AUXILIARES ==========

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number): void {
  doc.setFillColor(...COLORS.gold);
  doc.rect(x, y, width, 6, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + 3, y + 4.5);
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
