import jsPDF from 'jspdf';
import { BRAND_COLORS, drawGodoyHeader, drawGodoyFooter } from './pdfTemplate';

export function exportQuickGuidePDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Header compacto
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME ANALYTICS', pageWidth / 2, 12, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('Guia Rápido - Comece em 5 Minutos', pageWidth / 2, 22, { align: 'center' });

  y = 38;

  // Seção 1: Acesso
  const drawSection = (title: string, items: string[], icon: string) => {
    doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.roundedRect(marginLeft, y - 5, contentWidth, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon}  ${title}`, marginLeft + 3, y);
    y += 8;

    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    items.forEach((item) => {
      doc.setFillColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
      doc.circle(marginLeft + 3, y - 1, 1.2, 'F');
      const lines = doc.splitTextToSize(item, contentWidth - 10);
      doc.text(lines, marginLeft + 8, y);
      y += lines.length * 4 + 2;
    });

    y += 4;
  };

  drawSection('1. LOGIN E ACESSO', [
    'Acesse app.godoyprime.com.br com seu email e senha',
    'Na primeira visita, o Tour Guiado inicia automaticamente',
    'Use o menu lateral (desktop) ou hamburguer (mobile) para navegar',
  ], '>');

  drawSection('2. DASHBOARD - Visao do Mercado', [
    'KPIs mostram preco medio R$/m2, liquidez e variacao anual',
    'Selecione o bairro no dropdown (padrao: Barra da Tijuca)',
    'Ranking de Microbairros: alterne entre R$/m2 e Transacoes',
    'Graficos de evolucao: toggle Semestral/Anual',
  ], '>');

  drawSection('3. MICROREGIOES - Analise Local', [
    'Pesquise por logradouro ou nome do condominio',
    'Compare precos entre ruas da mesma regiao',
    'Visualize historico de precos por logradouro',
  ], '>');

  drawSection('4. AVALIACAO IMOBILIARIA - Precificacao', [
    'Etapa 1: Identifique proprietario e objetivo (venda/captacao)',
    'Etapa 2: Selecione logradouro com dados ITBI disponiveis',
    'Etapa 3: Informe area, quartos, vagas e tipologia',
    'Etapa 4: Responda 26 caracteristicas em 5 categorias',
    'Etapa 5: Receba valores pessimista, provavel e otimista',
    'Etapa 6: Gere PDF profissional com recomendacao de preco',
  ], '>');

  drawSection('5. VISTORIA DIGITAL - Inspecao', [
    'Escolha tipo: Casa (55+ itens) ou Apartamento (50+ itens)',
    'Avalie cada item: OK / Atencao / Critico / N.V. / N/A',
    'Adicione fotos para documentar problemas',
    'Gere laudo PDF com score de conservacao',
  ], '>');

  drawSection('6. AGENDAMENTO DE VISITAS', [
    'Crie fichas de visita com codigo unico',
    'Gerencie disponibilidade do corretor',
    'Envie link de feedback para visitantes',
    'Acompanhe ranking de visitas por corretor',
  ], '>');

  drawSection('7. DOCUMENTACAO - Due Diligence', [
    'Checklist completo para Vendedor e Comprador',
    'Use IA para analisar documentos enviados',
    'Exporte PDF com status de cada documento',
  ], '>');

  // Dicas rápidas
  y += 2;
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(marginLeft, y, contentWidth, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.text('DICAS RAPIDAS', marginLeft + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);

  const tips = [
    '• Clique em "Tour Guiado" em qualquer página para aprender as funcionalidades',
    '• Sofia (chat IA) responde dúvidas sobre mercado e plataforma - canto inferior direito',
    '• Todas as exportações (PDF/Excel) estão no botão "Exportar" de cada página',
    '• Histórico de avaliações fica salvo automaticamente para consulta futura',
  ];

  let tipY = y + 12;
  tips.forEach((tip) => {
    doc.text(tip, marginLeft + 3, tipY);
    tipY += 4;
  });

  // Footer
  y = pageHeight - 18;
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, y, pageWidth, 18, 'F');

  doc.setTextColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME REALTY - CRECI 11841 PJ', pageWidth / 2, y + 6, { align: 'center' });

  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('contato@godoyprime.com.br | www.godoyprime.com.br', pageWidth / 2, y + 11, { align: 'center' });

  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Gerado em ${today}`, pageWidth / 2, y + 15, { align: 'center' });

  doc.save('Guia_Rapido_Godoy_Prime.pdf');
}
