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
    // Verificar se precisa de nova página
    const estimatedHeight = 8 + (items.length * 6) + 8;
    if (y + estimatedHeight > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }

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
    'Instale como PWA para acesso rapido pelo celular',
  ], '>');

  drawSection('2. DASHBOARD - Visao do Mercado', [
    'KPIs mostram preco medio R$/m2, liquidez, variacao anual e regiao mais valorizada',
    'Selecione o bairro no dropdown para filtrar todos os dados',
    'Grafico de Evolucao: toggle Semestral/Anual com abas Geral, Tipologia e Variacao',
    'Ranking de Microbairros: alterne entre R$/m2 e Volume de Transacoes',
    'Mapa de Transacoes: visualize transacoes geograficamente',
  ], '>');

  drawSection('3. MICROREGIOES - Analise Local', [
    'Pesquise por logradouro ou nome do condominio com autocomplete',
    'Compare precos entre ate 5 ruas da mesma regiao',
    'Visualize historico de precos por logradouro',
    'Cards mostram estatisticas detalhadas: mediana, media, min, max, transacoes',
  ], '>');

  drawSection('4. PESQUISAS DE MERCADO', [
    'Aba Localizacao: busque por rua, numero ou condominio especifico',
    'Aba Transacoes: encontre logradouros por faixa de valor (R$ 100 mil a R$ 100 mi)',
    'Filtros: periodo (6-24 meses), tipologia, area em m2',
    'Exporte resultados em Excel ou CSV',
  ], '>');

  drawSection('5. AVALIACAO IMOBILIARIA - Precificacao', [
    'Etapa 0: Identifique proprietario, objetivo (venda/captacao) e tipo de imovel',
    'Etapa 1: Selecione logradouro - sistema busca dados ITBI automaticamente',
    'Etapa 2: Informe area, quartos, suites, banheiros, vagas e base de preco',
    'Etapa 3: Responda 26 caracteristicas em 5 categorias (Posicao, Conservacao, etc)',
    'Etapa 4: Receba valores pessimista, provavel e otimista com nivel de confianca',
    'Etapa 5: Veja recomendacao estrategica e gere PDF profissional',
  ], '>');

  drawSection('6. ESTRATEGIA DE PRECIFICACAO', [
    'Responda 9 perguntas diagnosticas sobre o imovel e objetivos',
    '3 estrategias: Atracao (venda rapida), Mercado (equilibrada), Premium (maximizacao)',
    'Sistema recomenda estrategia ideal baseado nas respostas',
    'Visualize preco de anuncio, comissao e liquido ao vendedor',
    'Opcao de Plano de Ajuste para reducao programada',
  ], '>');

  drawSection('7. VISTORIA DIGITAL - Inspecao', [
    'Escolha tipo: Casa (55+ itens, 20 categorias) ou Apartamento (50+ itens, 18 categorias)',
    'Avalie cada item: OK (5) / Atencao (3) / Critico (1) / N.V. / N/A',
    'Adicione fotos para documentar problemas encontrados',
    'Score de conservacao calculado automaticamente (0-100)',
    'Gere laudo PDF com radar de diagnostico e galeria de fotos',
    'Fluxo integrado: Vistoria -> Avaliacao -> Precificacao',
  ], '>');

  drawSection('8. AGENDAMENTO DE VISITAS', [
    'Crie agendamentos com data/hora, tipo de servico e dados do cliente',
    'Gere fichas de visita com codigo unico e declaracao de intermediacao',
    'Gerencie disponibilidade do corretor no calendario',
    'Colete assinaturas digitais (na tela ou via link remoto)',
    'Envie link de feedback para avaliacao pos-visita',
    'Dashboard com KPIs, grafico de evolucao e ranking de corretores',
  ], '>');

  drawSection('9. DOCUMENTACAO - Due Diligence', [
    'Checklist completo separado para Vendedor e Comprador',
    'Perfis condicionais: PJ, Uniao Estavel, Comunhao de Bens',
    'Use IA para analisar documentos enviados automaticamente',
    'Exporte PDF separado por parte ou completo',
  ], '>');

  drawSection('10. SOFIA - ASSISTENTE IA', [
    'Disponivel no canto inferior direito de todas as paginas',
    'Pergunte sobre precos, tendencias, comparativos entre bairros',
    'Use comandos de voz para interacao hands-free',
    'Envie documentos para analise automatica',
  ], '>');

  // Dicas rápidas
  y += 2;
  
  // Verificar se precisa de nova página para as dicas
  if (y + 35 > pageHeight - 25) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(240, 245, 250);
  doc.roundedRect(marginLeft, y, contentWidth, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.text('DICAS RAPIDAS', marginLeft + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);

  const tips = [
    '• Clique em "Tour Guiado" em qualquer pagina para aprender as funcionalidades',
    '• Sofia (chat IA) responde duvidas sobre mercado e plataforma - canto inferior direito',
    '• Todas as exportacoes (PDF/Excel) estao no botao "Exportar" de cada pagina',
    '• Historico de avaliacoes e vistorias fica salvo automaticamente para consulta futura',
    '• Use o fluxo integrado: Vistoria -> Avaliacao -> Estrategia para maxima eficiencia',
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
  doc.text('GODOY PRIME REALTY - CRECI 11841-PJ', pageWidth / 2, y + 6, { align: 'center' });

  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('(21) 4040-0067 | (21) 99725-0515 | contato@godoyprime.com.br', pageWidth / 2, y + 11, { align: 'center' });

  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Versao 2.0 - Gerado em ${today}`, pageWidth / 2, y + 15, { align: 'center' });

  doc.save('Guia_Rapido_Godoy_Prime_v2.pdf');
}
