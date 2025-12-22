import jsPDF from "jspdf";
import { FichaVisita, FeedbackVisita } from "@/types/visitas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FichaVisitaPdfData {
  ficha: FichaVisita;
  feedback?: FeedbackVisita | null;
}

export async function exportFichaVisitaPdf({ ficha, feedback }: FichaVisitaPdfData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Cores
  const primaryColor: [number, number, number] = [26, 26, 46];
  const accentColor: [number, number, number] = [212, 175, 55];
  const grayColor: [number, number, number] = [100, 100, 100];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE VISITA", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Código: ${ficha.codigo}`, pageWidth / 2, 32, { align: "center" });

  y = 55;

  // Data da visita
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Data da Visita:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }), margin + 35, y);

  y += 15;

  // Seção: Dados do Imóvel
  doc.setFillColor(...accentColor);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO IMÓVEL", margin + 5, y + 5.5);

  y += 15;

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Endereço:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.endereco_imovel, margin + 25, y);

  y += 8;

  if (ficha.codigo_imovel) {
    doc.setFont("helvetica", "bold");
    doc.text("Código:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(ficha.codigo_imovel, margin + 20, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Proprietário:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.nome_proprietario, margin + 30, y);

  y += 8;

  if (ficha.valor_imovel) {
    doc.setFont("helvetica", "bold");
    doc.text("Valor:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ficha.valor_imovel),
      margin + 15,
      y
    );
  }

  y += 15;

  // Seção: Dados do Visitante
  doc.setFillColor(...accentColor);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO VISITANTE", margin + 5, y + 5.5);

  y += 15;

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Nome:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.nome_visitante, margin + 18, y);

  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("CPF:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.cpf_visitante, margin + 13, y);

  doc.setFont("helvetica", "bold");
  doc.text("Telefone:", margin + 60, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.telefone_visitante, margin + 85, y);

  y += 8;

  if (ficha.email_visitante) {
    doc.setFont("helvetica", "bold");
    doc.text("Email:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(ficha.email_visitante, margin + 16, y);
  }

  y += 15;

  // Seção: Corretor Responsável
  doc.setFillColor(...accentColor);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CORRETOR RESPONSÁVEL", margin + 5, y + 5.5);

  y += 15;

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Nome:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(ficha.nome_corretor, margin + 18, y);

  y += 20;

  // Observações
  if (ficha.notas) {
    doc.setFillColor(...accentColor);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", margin + 5, y + 5.5);

    y += 15;

    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const splitNotas = doc.splitTextToSize(ficha.notas, pageWidth - margin * 2);
    doc.text(splitNotas, margin, y);
    y += splitNotas.length * 5 + 10;
  }

  // Assinaturas
  y += 10;
  doc.setFillColor(...accentColor);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURAS", margin + 5, y + 5.5);

  y += 20;

  const signatureWidth = 70;
  const signatureHeight = 35;
  const signatureX1 = margin;
  const signatureX2 = pageWidth - margin - signatureWidth;

  // Assinatura do Visitante
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.rect(signatureX1, y, signatureWidth, signatureHeight);

  if (ficha.assinatura_visitante) {
    try {
      doc.addImage(ficha.assinatura_visitante, "PNG", signatureX1 + 2, y + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do visitante:", e);
    }
  }

  doc.setTextColor(...primaryColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Assinatura do Visitante", signatureX1 + signatureWidth / 2, y + signatureHeight + 6, { align: "center" });

  // Assinatura do Corretor
  doc.rect(signatureX2, y, signatureWidth, signatureHeight);

  if (ficha.assinatura_corretor) {
    try {
      doc.addImage(ficha.assinatura_corretor, "PNG", signatureX2 + 2, y + 2, signatureWidth - 4, signatureHeight - 4);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do corretor:", e);
    }
  }

  doc.text("Assinatura do Corretor", signatureX2 + signatureWidth / 2, y + signatureHeight + 6, { align: "center" });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFillColor(...primaryColor);
  doc.rect(0, footerY - 5, pageWidth, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Godoy Prime Analytics | Documento gerado automaticamente", pageWidth / 2, footerY + 3, { align: "center" });
  doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth / 2, footerY + 8, { align: "center" });

  // Salvar
  doc.save(`ficha-visita-${ficha.codigo}.pdf`);
}
