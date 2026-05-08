// src/utils/autorizacaoPdfExport.ts
import jsPDF from "jspdf";
import QRCode from "qrcode";
var NAVY = [12, 35, 64];
var GOLD = [212, 175, 55];
var TEXT = [26, 26, 46];
var MUTED = [120, 120, 130];
var formatBRL = (v) => {
  if (v == null || !Number.isFinite(Number(v)))
    return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(Number(v));
};
var formatDateLong = (iso) => {
  const d = iso ? new Date(iso) : new Date;
  const dia = String(d.getDate()).padStart(2, "0");
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ];
  return `${dia} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};
async function generateAutorizacaoPdf(a, opts = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;
  const useFont = (weight = "normal") => {
    doc.setFont("helvetica", "normal");
  };
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(...GOLD);
  useFont("bold");
  doc.setFontSize(13);
  doc.text("GODOY PRIME REALTY", margin, 10);
  doc.setTextColor(255, 255, 255);
  useFont("normal");
  doc.setFontSize(8);
  doc.text("Av. das Américas 10.101, Bloco 2 — Tel: (21) 96407-5124", margin, 15);
  doc.setFontSize(7);
  doc.text(`Código: ${a.codigo}`, pageW - margin, 10, { align: "right" });
  doc.text(`Emitido em: ${formatDateLong(a.created_at)}`, pageW - margin, 15, { align: "right" });
  y = 30;
  doc.setTextColor(...NAVY);
  useFont("bold");
  doc.setFontSize(13);
  doc.text("AUTORIZAÇÃO PARA DIVULGAÇÃO E VENDA DE IMÓVEL", pageW / 2, y, { align: "center" });
  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  useFont("bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("CONTRATANTES", margin, y);
  y += 5;
  useFont("normal");
  doc.setTextColor(...TEXT);
  doc.setFontSize(8.5);
  const line = (label, val, yy) => {
    doc.setTextColor(...NAVY);
    doc.text(label, margin, yy);
    const w = doc.getTextWidth(label) + 1;
    doc.setTextColor(...TEXT);
    doc.text(val || "—", margin + w, yy);
  };
  line("NOME:", a.proprietario_nome, y);
  y += 4.5;
  line("IDENTIDADE:", `${a.proprietario_rg || "—"}  —  ÓRGÃO: ${a.proprietario_rg_orgao || "—"}  —  CPF: ${a.proprietario_cpf}`, y);
  y += 4.5;
  line("TELEFONE:", `${a.proprietario_telefone || "—"}     E-MAIL: ${a.proprietario_email}`, y);
  y += 6;
  doc.setTextColor(...NAVY);
  doc.text("CONTRATADO:", margin, y);
  doc.setTextColor(...TEXT);
  doc.text("MARCUS V F GODOY ASSESSORIA IMOBILIÁRIA — CNPJ: 58.409.058/0001-73", margin + 25, y);
  y += 7;
  useFont("bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("DESCRIÇÃO DO IMÓVEL", margin, y);
  y += 5;
  useFont("normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  const enderecoFull = `${a.endereco}${a.numero ? `, nº ${a.numero}` : ""}${a.complemento ? ` — ${a.complemento}` : ""}`;
  line("ENDEREÇO:", enderecoFull, y);
  y += 4.5;
  line("BAIRRO:", `${a.bairro}     CIDADE: ${a.cidade}     CEP: ${a.cep || "—"}`, y);
  y += 4.5;
  line("CONDOMÍNIO:", `${formatBRL(a.valor_condominio)}/mês     IPTU: ${formatBRL(a.valor_iptu)}/ano`, y);
  y += 4.5;
  line("QUARTOS:", `${a.quartos ?? "—"}     VAGAS: ${a.vagas ?? "—"}`, y);
  y += 6;
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(...GOLD);
  doc.rect(margin, y, pageW - margin * 2, 12, "FD");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("VALOR DE AVALIAÇÃO:", margin + 3, y + 5);
  doc.text("VALOR DE VENDA AUTORIZADO:", margin + 3, y + 9.5);
  doc.setTextColor(...TEXT);
  doc.text(formatBRL(a.valor_avaliacao), pageW - margin - 3, y + 5, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(formatBRL(a.valor_venda), pageW - margin - 3, y + 9.5, { align: "right" });
  doc.setFontSize(9);
  y += 16;
  useFont("bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("CONDIÇÕES", margin, y);
  y += 5;
  useFont("normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  const cb = (selected) => selected ? "[X]" : "[ ]";
  const exclusiva = a.tipo_gestao === "com_exclusiva";
  const clausulas = [
    `1. A presente Autorização de Venda, ${cb(exclusiva)} COM GESTÃO EXCLUSIVA / ${cb(!exclusiva)} SEM GESTÃO EXCLUSIVA, tem o seu amparo na Lei 6.530, Art. 20, item III, de 12/05/1978 e pela Resolução do COFECI nº 458/95 de 17/11/1995.`,
    `2. Entenda-se por GESTÃO EXCLUSIVA, a escolha do CONTRATADO, como responsável exclusivo pela Representação Comercial do imóvel perante o mercado. A ele caberá centralizar os contatos de possíveis interessados (Clientes Diretos ou Corretores), acompanhar todas as visitas realizadas, atender outros Corretores interessados em estabelecer parceria comercial para venda do Imóvel e investir na divulgação do imóvel de forma ampla.`,
    `3. É concedida esta autorização pelo prazo de ${a.prazo_dias} dias, a contar desta data, nela também está incluída a veiculação de anúncios e fotos do imóvel em todos os meios de publicidade utilizados pelo CONTRATADO, prorrogada automaticamente pelo mesmo período, caso, após o término do citado prazo, não ocorra manifestação expressa dos CONTRATANTES.`,
    `4. Os CONTRATANTES se comprometem a pagar ao CONTRATADO o percentual de ${a.percentual_honorarios}% sobre o preço de venda efetivamente transacionado, a título de honorários de corretagem, que serão pagos no ato da assinatura da escritura de compra e venda.`,
    `5. A mesma remuneração será devida pelos CONTRATANTES se, durante a vigência desta autorização o proprietário realizar a venda do imóvel sem a ciência e acompanhamento do CONTRATADO ou se após o término do prazo estabelecido neste instrumento, eles venham a realizar, por conta própria ou através de terceiros, a venda do imóvel objeto da presente autorização, com pretendentes apresentados ou indicados pelo CONTRATADO.`,
    `6. O CONTRATADO se compromete a não medir esforços no sentido de intermediar a venda do imóvel com base nas condições acima descritas, agindo de forma legal, obedecendo fielmente à legislação vigente e o Código de Ética da Profissão, estabelecido pelo COFECI.`,
    `7. Os CONTRATANTES se responsabilizam por todas as informações pessoais e de propriedade aqui prestadas acerca do imóvel objeto da presente Autorização.`,
    `8. Para dirimir eventuais dúvidas ou questões oriundas da presente Autorização, fica eleito o foro da Comarca do Rio de Janeiro, RJ, com renúncia a qualquer outro, por mais privilegiado que seja.`
  ];
  for (const c of clausulas) {
    const lines = doc.splitTextToSize(c, pageW - margin * 2);
    if (y + lines.length * 3.6 > pageH - 60) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 3.6 + 2;
  }
  if (y + 50 > pageH - 20) {
    doc.addPage();
    y = margin;
  }
  y += 4;
  doc.setFontSize(8.5);
  doc.text(`${a.cidade}, ${formatDateLong(a.data_assinatura_proprietario || a.created_at)}.`, margin, y);
  y += 8;
  const sigW = (pageW - margin * 2 - 10) / 2;
  const sigY = y;
  if (a.assinatura_proprietario) {
    try {
      doc.addImage(a.assinatura_proprietario, "PNG", margin, sigY, sigW, 18);
    } catch {}
  }
  doc.setDrawColor(...NAVY);
  doc.line(margin, sigY + 19, margin + sigW, sigY + 19);
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text("CONTRATANTE", margin, sigY + 23);
  doc.setTextColor(...TEXT);
  doc.text(a.proprietario_nome, margin, sigY + 27);
  doc.text(`CPF: ${a.proprietario_cpf}`, margin, sigY + 31);
  const cx = margin + sigW + 10;
  if (a.assinatura_corretor) {
    try {
      doc.addImage(a.assinatura_corretor, "PNG", cx, sigY, sigW, 18);
    } catch {}
  }
  doc.line(cx, sigY + 19, cx + sigW, sigY + 19);
  doc.setTextColor(...NAVY);
  doc.text("CONTRATADO", cx, sigY + 23);
  doc.setTextColor(...TEXT);
  doc.text(a.corretor_nome || "—", cx, sigY + 27);
  doc.text(`CRECI: ${a.corretor_creci || "—"}`, cx, sigY + 31);
  y = sigY + 38;
  if (a.data_assinatura_proprietario) {
    if (y + 30 > pageH - 8) {
      doc.addPage();
      y = margin;
    }
    const baseUrl = opts.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const verifyUrl = `${baseUrl}/autorizacao/verificar/${a.codigo}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
      doc.addImage(qrDataUrl, "PNG", pageW - margin - 22, y, 22, 22);
    } catch {}
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("AUDITORIA DA ASSINATURA DIGITAL", margin, y + 3);
    doc.text(`Assinado em: ${new Date(a.data_assinatura_proprietario).toLocaleString("pt-BR")}`, margin, y + 7);
    doc.text(`IP: ${a.ip_assinatura_proprietario || "—"}`, margin, y + 11);
    doc.text(`Código de verificação: ${a.codigo}`, margin, y + 15);
    doc.text(`Verifique a autenticidade em:`, margin, y + 19);
    doc.setTextColor(...NAVY);
    doc.text(verifyUrl, margin, y + 23);
    if (a.data_vencimento) {
      doc.setTextColor(...MUTED);
      doc.text(`Vigência até: ${new Date(a.data_vencimento).toLocaleDateString("pt-BR")}`, margin, y + 27);
    }
  }
  if (opts.watermark) {
    const totalP = doc.internal.getNumberOfPages();
    for (let i = 1;i <= totalP; i++) {
      doc.setPage(i);
      doc.setFontSize(70);
      doc.setTextColor(225, 225, 230);
      doc.text(opts.watermark, pageW / 2, pageH / 2, { align: "center", angle: 35 });
    }
  }
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1;i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${a.codigo} — Página ${i} de ${totalPages}`, pageW / 2, pageH - 5, { align: "center" });
  }
  return doc.output("blob");
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export {
  generateAutorizacaoPdf,
  downloadBlob
};
