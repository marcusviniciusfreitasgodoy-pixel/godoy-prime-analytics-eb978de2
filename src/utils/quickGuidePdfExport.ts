import jsPDF from 'jspdf';
import { BRAND_COLORS, fetchCompanyInfoForPDF, applyFootersToAllPages, type CompanyInfo } from './pdfTemplate';

export async function exportQuickGuidePDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Buscar configurações da empresa
  const companyInfo = await fetchCompanyInfoForPDF();

  // Cabeçalho compacto
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name || 'GODOY PRIME ANALYTICS', pageWidth / 2, 12, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('Guia Rapido - Comece em 5 Minutos', pageWidth / 2, 22, { align: 'center' });

  y = 38;

  // Funcao para desenhar secao
  const drawSection = (title: string, items: string[], icon: string) => {
    // Verificar se precisa de nova pagina
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

  drawSection('1. ACESSO A PLATAFORMA', [
    'Entre em app.godoyprime.com.br com seu email e senha',
    'Na primeira vez, um tutorial guiado inicia automaticamente',
    'Use o menu lateral (computador) ou o icone de menu (celular) para navegar',
    'Adicione a plataforma na tela inicial do celular para acesso rapido',
  ], '>');

  drawSection('2. PAINEL PRINCIPAL - Visao do Mercado', [
    'Indicadores mostram preco medio por metro quadrado, volume de vendas e variacao anual',
    'Escolha o bairro na lista para filtrar todos os dados',
    'Grafico de Evolucao: alterne entre visao Semestral ou Anual com abas por tipo de imovel',
    'Ranking de Regioes: veja quais areas sao mais valorizadas ou tem mais vendas',
    'Mapa de Vendas: visualize a localizacao das transacoes no mapa',
  ], '>');

  drawSection('3. ANALISE DE REGIOES', [
    'Pesquise por nome da rua ou do condominio - o sistema sugere enquanto voce digita',
    'Compare precos entre ate 5 ruas da mesma regiao',
    'Veja o historico de precos de cada rua ao longo do tempo',
    'Cada regiao mostra estatisticas: valor mediano, medio, minimo, maximo e quantidade de vendas',
  ], '>');

  drawSection('4. PESQUISAS DE MERCADO', [
    'Aba Localizacao: busque por rua, numero ou nome do condominio',
    'Aba Transacoes: encontre ruas por faixa de preco (de R$ 100 mil ate R$ 100 milhoes)',
    'Filtros: periodo (6 a 24 meses), tipo de imovel e tamanho em metros quadrados',
    'Baixe os resultados em planilha Excel ou arquivo de dados',
  ], '>');

  drawSection('5. AVALIACAO DE IMOVEIS - Precificacao', [
    'Etapa 0: Identifique o proprietario, objetivo (venda ou captacao) e tipo de imovel',
    'Etapa 1: Selecione a rua - o sistema busca os dados oficiais automaticamente',
    'Etapa 2: Informe metragem, quartos, suites, banheiros, vagas e base de preco',
    'Etapa 3: Responda 26 perguntas sobre caracteristicas em 5 categorias',
    'Etapa 4: Receba 3 valores: conservador, provavel e otimista com nivel de confianca',
    'Etapa 5: Veja a recomendacao e gere o relatorio em arquivo para impressao',
  ], '>');

  drawSection('6. ESTRATEGIA DE PRECO', [
    'Responda 9 perguntas sobre a situacao do imovel e objetivos do vendedor',
    '3 estrategias: Atracao (venda rapida), Mercado (equilibrada), Valorizacao (maximo valor)',
    'Sistema recomenda a melhor estrategia baseado nas respostas',
    'Veja preco de anuncio, comissao estimada e valor liquido ao vendedor',
    'Opcao de Plano de Ajuste para reducao programada caso nao venda',
  ], '>');

  drawSection('7. VISTORIA DO IMOVEL', [
    'Escolha tipo: Casa (55 itens em 20 categorias) ou Apartamento (50 itens em 18 categorias)',
    'Avalie cada item: Bom / Atencao / Critico / Nao Verificado / Nao se Aplica',
    'Adicione fotos para documentar problemas encontrados',
    'Nota de conservacao calculada automaticamente de 0 a 100',
    'Gere relatorio com grafico de diagnostico e galeria de fotos',
    'Fluxo completo: Vistoria, depois Avaliacao, depois Estrategia de Preco',
  ], '>');

  drawSection('8. AGENDA DE VISITAS', [
    'Crie agendamentos com data, hora, tipo de atendimento e dados do cliente',
    'Gere fichas de visita com codigo unico e declaracao de trabalho exclusivo',
    'Gerencie sua disponibilidade de horarios no calendario',
    'Colete assinaturas na tela ou envie por mensagem para assinatura remota',
    'Envie formulario de opiniao para o cliente avaliar o imovel apos a visita',
    'Painel com graficos de evolucao e comparativo entre corretores',
  ], '>');

  drawSection('9. DOCUMENTACAO - Analise Juridica', [
    'Lista completa de documentos separada para Vendedor e Comprador',
    'Perfis especiais: Empresa, Uniao Estavel, Comunhao de Bens',
    'Use a assistente virtual para analisar documentos enviados',
    'Baixe o relatorio por parte (Vendedor ou Comprador) ou completo',
  ], '>');

  drawSection('10. HISTORICOS', [
    'Historico de Avaliacoes: consulte, edite e exporte avaliacoes salvas',
    'Historico de Vistorias: acompanhe todas as inspecoes realizadas',
    'Filtros por data, endereco, valor e tipo de imovel',
    'Regenere arquivos PDF a qualquer momento',
  ], '>');

  drawSection('11. CONFIGURACOES', [
    'Envie a logomarca da empresa para personalizar todos os relatorios',
    'Configure dados da empresa: nome, CNPJ, CRECI, telefone e endereco',
    'Veja como ficara o cabecalho e rodape dos relatorios',
  ], '>');

  drawSection('12. SOFIA - ASSISTENTE VIRTUAL', [
    'Disponivel no canto inferior direito de todas as paginas',
    'Pergunte sobre precos, tendencias e comparativos entre regioes',
    'Use comandos de voz para consultar sem precisar digitar',
    'Envie documentos para analise automatica',
  ], '>');

  // Dicas rapidas
  y += 2;
  
  // Verificar se precisa de nova pagina para as dicas
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
    '* Clique em "Tutorial" em qualquer pagina para aprender as funcionalidades',
    '* Sofia (assistente virtual) responde duvidas sobre mercado e plataforma - canto inferior direito',
    '* Todas as opcoes de baixar arquivos estao no botao "Exportar" de cada pagina',
    '* Historico de avaliacoes e vistorias fica salvo automaticamente para consulta futura',
    '* Use o fluxo completo: Vistoria, Avaliacao e Estrategia de Preco para maior eficiencia',
  ];

  let tipY = y + 12;
  tips.forEach((tip) => {
    doc.text(tip, marginLeft + 3, tipY);
    tipY += 4;
  });

  // Aplicar rodapé padronizado em todas as páginas
  applyFootersToAllPages(doc, companyInfo);

  // Rodapé final com informações extras na última página
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);
  
  const footerY = pageHeight - 18;
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, footerY, pageWidth, 18, 'F');

  doc.setTextColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${companyInfo.name} - ${companyInfo.creci}`, pageWidth / 2, footerY + 6, { align: 'center' });

  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyInfo.phone} | ${companyInfo.website}`, pageWidth / 2, footerY + 11, { align: 'center' });

  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Versao 2.0 - Gerado em ${today}`, pageWidth / 2, footerY + 15, { align: 'center' });

  doc.save('Guia_Rapido_Godoy_Prime_v2.pdf');
}
