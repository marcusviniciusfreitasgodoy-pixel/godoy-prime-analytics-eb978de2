import jsPDF from "jspdf";
import type { DocumentAnalysisRecord } from "@/hooks/useDocumentAnalyses";

const NAVY: [number, number, number] = [12, 35, 64];
const GOLD: [number, number, number] = [212, 175, 55];
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [110, 110, 110];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function exportDocumentAnalysisPdf(record: DocumentAnalysisRecord) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  // Cabeçalho
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Análise de Documento", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Godoy Prime Analytics — Relatório de Análise por IA", margin, 18);
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 23);

  // Faixa dourada
  doc.setFillColor(...GOLD);
  doc.rect(0, 28, pageW, 1.5, "F");

  y = 38;

  // Bloco identificação
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Identificação", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);

  const idRows: [string, string][] = [
    ["Arquivo", record.file_name],
    ["Tipo de documento", record.tipo_documento || "—"],
    ["Status", record.status || "—"],
    ["Confiança", record.confianca || "—"],
    ["Data da análise", formatDate(record.created_at)],
    ["Validade do documento", formatDate(record.validade)],
  ];

  idRows.forEach(([k, v]) => {
    doc.setTextColor(...MUTED);
    doc.text(`${k}:`, margin, y);
    doc.setTextColor(...TEXT);
    const wrapped = doc.splitTextToSize(String(v), pageW - margin * 2 - 45);
    doc.text(wrapped, margin + 45, y);
    y += Array.isArray(wrapped) ? wrapped.length * 4.5 : 4.5;
  });

  y += 4;

  // Motivo
  if (record.status_motivo) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.setFontSize(11);
    doc.text("Motivo do status", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(record.status_motivo, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // Dados extraídos
  if (record.dados_extraidos && Object.keys(record.dados_extraidos).length > 0) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.setFontSize(11);
    doc.text("Dados extraídos", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    Object.entries(record.dados_extraidos).forEach(([k, v]) => {
      if (y > pageH - 15) {
        doc.addPage();
        y = margin;
      }
      doc.setTextColor(...MUTED);
      doc.text(`${k}:`, margin, y);
      doc.setTextColor(...TEXT);
      const val = doc.splitTextToSize(String(v ?? "—"), pageW - margin * 2 - 55);
      doc.text(val, margin + 55, y);
      y += (Array.isArray(val) ? val.length : 1) * 4.5;
    });
    y += 4;
  }

  // Alertas
  if (record.alertas?.length) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 120, 0);
    doc.setFontSize(11);
    doc.text("Alertas", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.setFontSize(9);
    record.alertas.forEach((a) => {
      if (y > pageH - 15) {
        doc.addPage();
        y = margin;
      }
      const lines = doc.splitTextToSize(`• ${a}`, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Próximos passos
  if (record.proximos_passos?.length) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.setFontSize(11);
    doc.text("Próximos passos", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.setFontSize(9);
    record.proximos_passos.forEach((p) => {
      if (y > pageH - 15) {
        doc.addPage();
        y = margin;
      }
      const lines = doc.splitTextToSize(`• ${p}`, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.5;
    });
    y += 6;
  }

  // Aviso legal (rodapé do conteúdo)
  if (y > pageH - 35) {
    doc.addPage();
    y = margin;
  }
  doc.setDrawColor(212, 175, 55);
  doc.setFillColor(255, 248, 225);
  doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(140, 95, 0);
  doc.setFontSize(9);
  doc.text("Aviso Legal", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 60, 0);
  const aviso =
    "Esta análise é gerada por inteligência artificial e tem caráter meramente auxiliar e informativo. " +
    "Os resultados não substituem a avaliação de um advogado, despachante imobiliário ou especialista em " +
    "transações imobiliárias. Consulte sempre um profissional habilitado antes de qualquer decisão.";
  const avisoLines = doc.splitTextToSize(aviso, pageW - margin * 2 - 6);
  doc.text(avisoLines, margin + 3, y + 10);

  // Rodapé com paginação
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Godoy Prime Analytics · Análise de Documento · Página ${i}/${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  const safeName = record.file_name.replace(/[^\w.-]+/g, "_").slice(0, 60);
  doc.save(`analise-${safeName}-${record.id.slice(0, 8)}.pdf`);
}
