import jsPDF from 'jspdf';

const NAVY = '#0C2340';
const GOLD = '#D4AF37';

export async function exportVideoScriptPdf() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  const addHeader = () => {
    doc.setFillColor(NAVY);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GODOY PRIME ANALYTICS', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Roteiro de Vídeo & FAQ', pageWidth / 2, 19, { align: 'center' });
  };

  const addFooter = (pageNum: number) => {
    doc.setFillColor(NAVY);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('GODOY PRIME REALTY - CRECI 11841-PJ | (21) 4040-0067 | (21) 99725-0515', pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const checkNewPage = (neededSpace: number, pageNum: { value: number }) => {
    if (y + neededSpace > pageHeight - 25) {
      addFooter(pageNum.value);
      doc.addPage();
      pageNum.value++;
      addHeader();
      y = 35;
    }
  };

  const addTitle = (text: string, pageNum: { value: number }) => {
    checkNewPage(15, pageNum);
    doc.setFillColor(GOLD);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(NAVY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin + 3, y + 5.5);
    y += 12;
  };

  const addSubtitle = (text: string, pageNum: { value: number }) => {
    checkNewPage(10, pageNum);
    doc.setTextColor(NAVY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += 6;
  };

  const addNarration = (text: string, pageNum: { value: number }) => {
    checkNewPage(20, pageNum);
    doc.setFillColor(245, 245, 245);
    const lines = doc.splitTextToSize(text, contentWidth - 10);
    const blockHeight = lines.length * 4.5 + 6;
    doc.rect(margin, y, contentWidth, blockHeight, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(lines, margin + 5, y + 5);
    y += blockHeight + 4;
  };

  const addScreenshot = (num: number, desc: string, pageNum: { value: number }) => {
    checkNewPage(8, pageNum);
    doc.setTextColor(NAVY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`[Screenshot ${num}]`, margin, y);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    const descX = margin + doc.getTextWidth(`[Screenshot ${num}] `);
    doc.text(desc, descX, y);
    y += 6;
  };

  const addFaqItem = (num: number, question: string, answer: string, pageNum: { value: number }) => {
    checkNewPage(25, pageNum);
    doc.setTextColor(NAVY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${num}. ${question}`, margin, y);
    y += 5;
    
    const lines = doc.splitTextToSize(answer, contentWidth - 5);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 3, y);
    y += lines.length * 4 + 4;
  };

  const pageNum = { value: 1 };

  // Page 1 - Cover
  addHeader();
  y = 50;
  
  doc.setTextColor(NAVY);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ROTEIRO DE VÍDEO', pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Guia Completo de Funcionalidades', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFillColor(GOLD);
  doc.rect(margin + 30, y, contentWidth - 60, 0.5, 'F');
  y += 15;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const introText = [
    'Este documento contém:',
    '',
    '• Script de narração completo para vídeo explicativo',
    '• Lista de 32 screenshots necessários',
    '• FAQ com 40 perguntas frequentes em 10 categorias',
    '',
    'Duração estimada do vídeo: 12-13 minutos',
    'Formato recomendado: 1920x1080 (Full HD)'
  ];
  introText.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 6;
  });

  y += 10;
  doc.setFillColor(NAVY);
  doc.roundedRect(margin + 20, y, contentWidth - 40, 30, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Godoy Prime Realty', pageWidth / 2, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Av. das Américas, 10101 Bloco 2 Sala 316', pageWidth / 2, y + 17, { align: 'center' });
  doc.text('(21) 4040-0067 | (21) 99725-0515 | CRECI 11841-PJ', pageWidth / 2, y + 23, { align: 'center' });

  addFooter(pageNum.value);

  // Script pages
  doc.addPage();
  pageNum.value++;
  addHeader();
  y = 35;

  // ABERTURA
  addTitle('ABERTURA (0:00 - 0:30)', pageNum);
  addNarration('Bem-vindo ao Godoy Prime Analytics - a plataforma de inteligência imobiliária mais completa do mercado carioca. Desenvolvida exclusivamente para corretores e profissionais do mercado imobiliário de alto padrão, nossa ferramenta transforma dados oficiais do ITBI em insights estratégicos para você fechar mais negócios com confiança. Neste vídeo, vou apresentar todas as funcionalidades que vão revolucionar a forma como você analisa o mercado.', pageNum);
  addScreenshot(1, 'Tela inicial do Dashboard com KPIs visíveis', pageNum);

  // MÓDULO 0 - ONBOARDING
  addTitle('MÓDULO 0: ONBOARDING (0:30 - 1:30)', pageNum);
  addNarration('Novos usuários são guiados por um tutorial interativo completo. O Onboarding apresenta os 8 módulos principais da plataforma em etapas visuais, com descrição detalhada e lista de funcionalidades de cada área. Uma barra de progresso mostra seu avanço, e você pode navegar livremente entre as etapas ou ir direto para qualquer módulo.', pageNum);
  addScreenshot(2, 'Página de Onboarding com etapas e progresso', pageNum);
  addScreenshot(3, 'Card detalhado de um módulo com features', pageNum);

  addNarration('O Onboarding também inclui uma seção de Perguntas Frequentes com 40 perguntas organizadas em 10 categorias, e busca integrada. Ao final, você pode baixar o Manual Completo em PDF com mais de 20 páginas de documentação.', pageNum);
  addScreenshot(4, 'Seção FAQ do Onboarding com accordion', pageNum);
  addScreenshot(5, 'Botão de download do Manual PDF', pageNum);

  // MÓDULO 1
  addTitle('MÓDULO 1: DASHBOARD (1:30 - 3:00)', pageNum);
  addNarration('Ao acessar a plataforma, você encontra o Dashboard - seu painel de controle do mercado imobiliário. No topo, temos quatro indicadores-chave atualizados mensalmente: Primeiro, o Preço Médio por metro quadrado do ano, com variação mensal e separação entre apartamentos e casas. Segundo, a Liquidez - quantas transações foram realizadas no período. Terceiro, a Variação Anual comparando os últimos 12 meses. E quarto, a Região Mais Valorizada do bairro selecionado.', pageNum);
  addScreenshot(6, 'KPIs em destaque com setas indicando cada card', pageNum);
  addScreenshot(7, 'Seletor de bairro aberto mostrando opções', pageNum);

  addNarration('Abaixo dos KPIs, temos o gráfico de Evolução de Preços com dados históricos desde 2020. Você pode alternar entre visualização Semestral ou Anual, e navegar por três abas: Geral, Por Tipologia e Variação Percentual.', pageNum);
  addScreenshot(8, 'Gráfico de evolução com abas visíveis', pageNum);
  addScreenshot(9, 'Aba Por Tipologia mostrando linhas Apt vs Casa', pageNum);

  addNarration('Logo abaixo, o gráfico de Evolução por Microbairro permite comparar a valorização de diferentes regiões ao longo do tempo. E o Ranking de Microbairros mostra quais regiões têm maior valorização ou maior liquidez.', pageNum);
  addScreenshot(10, 'Gráfico de evolução por microbairro', pageNum);
  addScreenshot(11, 'Ranking de microbairros com toggle visível', pageNum);

  // MÓDULO 2
  addTitle('MÓDULO 2: PESQUISAS DE MERCADO (3:00 - 5:00)', pageNum);
  addSubtitle('Aba Localização', pageNum);
  addNarration('Na aba Localização, você pesquisa transações por endereço específico. Selecione o período, bairro, tipologia, faixa de valor, área e logradouro. Os resultados mostram cada transação com data, endereço, área, valor total e valor por metro quadrado.', pageNum);
  addScreenshot(12, 'Aba Localização com filtros preenchidos', pageNum);
  addScreenshot(13, 'Resultados de busca com estatísticas', pageNum);

  addSubtitle('Aba Transações', pageNum);
  addNarration('Na aba Transações, você descobre quais ruas têm maior volume de negócios - perfeito para identificar onde o mercado está mais ativo. Exporte os resultados em CSV ou Excel.', pageNum);
  addScreenshot(14, 'Aba Transações com ranking de ruas', pageNum);

  // MÓDULO 3
  addTitle('MÓDULO 3: AVALIAÇÃO IMOBILIÁRIA (5:00 - 7:00)', pageNum);
  addNarration('O Motor de Avaliação Godoy Prime é um sistema completo de precificação em 6 etapas: identificação do imóvel, localização com dados ITBI, dados básicos como área e quartos, questionário com 26 características em 5 categorias, resultados em três cenários (pessimista, provável e otimista), e recomendação automática de posicionamento estratégico.', pageNum);
  addScreenshot(15, 'Step 0 - Identificação do imóvel', pageNum);
  addScreenshot(16, 'Step 1 - Localização com dados ITBI', pageNum);
  addScreenshot(17, 'Step 3 - Questionário com abas de categorias', pageNum);
  addScreenshot(18, 'Step 4 - Resultados com 3 cenários e gráfico', pageNum);
  addScreenshot(19, 'Step 5 - Recomendação estratégica', pageNum);

  addNarration('Ao finalizar, gere um laudo profissional em PDF com todas as informações, gráficos de comparação e nível de confiança da avaliação.', pageNum);
  addScreenshot(20, 'Preview do PDF de avaliação', pageNum);

  // MÓDULO 4
  addTitle('MÓDULO 4: MICROREGIÕES (7:00 - 7:45)', pageNum);
  addNarration('No menu lateral, acesse Microregiões para uma análise detalhada de cada área. Cards individuais mostram o preço médio por metro quadrado, volume de transações, comparativo apartamento versus casa, e indicador de tendência. Pesquise por logradouro ou condomínio específico.', pageNum);
  addScreenshot(21, 'Página Microregiões com cards e pesquisa', pageNum);

  // MÓDULO 5
  addTitle('MÓDULO 5: VISTORIA DIGITAL (7:45 - 8:45)', pageNum);
  addNarration('A Vistoria Digital é seu checklist interativo para inspeção de imóveis. São mais de 55 itens para casas e 50 para apartamentos, organizados em categorias. Para cada item, você marca o status: OK, Atenção, Crítico, Não Verificado ou Não se Aplica. Pode adicionar observações e anexar fotos. Um sistema de scoring calcula automaticamente a nota de conservação. Ao finalizar, exporte o laudo completo em PDF profissional.', pageNum);
  addScreenshot(22, 'Vistoria Digital com categorias expandidas', pageNum);
  addScreenshot(23, 'Item com status, observações e fotos', pageNum);
  addScreenshot(24, 'Score de conservação e botão de exportação', pageNum);

  // MÓDULO 6
  addTitle('MÓDULO 6: DOCUMENTAÇÃO (8:45 - 9:45)', pageNum);
  addNarration('A página Documentação é seu checklist jurídico completo para segurança nas transações. Dividida em seções por tipo de documento: imóvel, proprietário e transação. O Analisador de Documentos com IA permite fazer upload de certidões e extrair informações automaticamente.', pageNum);
  addScreenshot(25, 'Documentação com checklist completo', pageNum);
  addScreenshot(26, 'Analisador de Documentos IA com resultados', pageNum);

  // MÓDULO 7
  addTitle('MÓDULO 7: SOFIA - ASSISTENTE IA (9:45 - 10:30)', pageNum);
  addNarration('No canto inferior direito, você encontra Sofia - nossa Assistente de Mercado com Inteligência Artificial. Faça perguntas em linguagem natural sobre preços, tendências, documentação ou qualquer dúvida sobre a plataforma. Sofia consulta a base de dados em tempo real e oferece sugestões inteligentes. Você também pode usar comandos de voz para interação hands-free.', pageNum);
  addScreenshot(27, 'Botão da Sofia no Dashboard', pageNum);
  addScreenshot(28, 'Chat aberto com pergunta e resposta contextual', pageNum);

  // MÓDULO 8
  addTitle('MÓDULO 8: RECURSOS ADMINISTRATIVOS (10:30 - 11:15)', pageNum);
  addNarration('Administradores têm acesso a recursos avançados: Base de Conhecimento para gerenciar conteúdo da IA, Calibrador de Avaliação para ajustar pesos das características, Gestão de Leads com filtros e status, Gerenciamento de Usuários com controle de acessos, e Rastreamento de Atividades para auditoria completa.', pageNum);
  addScreenshot(29, 'Página de Gestão de Leads', pageNum);
  addScreenshot(30, 'Gerenciamento de Usuários com atividades', pageNum);

  // MÓDULO 9
  addTitle('MÓDULO 9: EXPORTAÇÕES E MANUAL (11:15 - 11:45)', pageNum);
  addNarration('Todas as análises podem ser exportadas. No Dashboard, exporte KPIs em Excel ou faça Backup Completo. Avaliações, Vistorias e Documentação geram PDFs profissionais. Na página de Onboarding, baixe o Manual Completo da plataforma com mais de 20 páginas de documentação, incluindo o FAQ completo.', pageNum);
  addScreenshot(31, 'Menu de exportação do Dashboard', pageNum);
  addScreenshot(32, 'Manual PDF gerado com índice e FAQ', pageNum);

  // ENCERRAMENTO
  addTitle('ENCERRAMENTO (11:45 - 12:15)', pageNum);
  addNarration('O Godoy Prime Analytics é mais do que uma ferramenta - é seu parceiro estratégico no mercado imobiliário de alto padrão. Dados oficiais, análises inteligentes, documentação completa, assistente com inteligência artificial e onboarding interativo - tudo em uma única plataforma. Acesse agora e transforme dados em resultados. Godoy Prime Realty - Inteligência que valoriza seu negócio.', pageNum);

  addFooter(pageNum.value);

  // FAQ Section
  doc.addPage();
  pageNum.value++;
  addHeader();
  y = 35;

  doc.setTextColor(NAVY);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FAQ - PERGUNTAS FREQUENTES', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('40 perguntas organizadas em 10 categorias', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // CATEGORIA 1: GERAL
  addTitle('GERAL', pageNum);
  addFaqItem(1, 'O que é o Godoy Prime Analytics?', 'É uma plataforma de inteligência imobiliária que oferece análise de dados, avaliações automatizadas, vistorias digitais e assistência por IA para profissionais do mercado imobiliário da Barra da Tijuca.', pageNum);
  addFaqItem(2, 'Quem pode usar a plataforma?', 'Corretores de imóveis, avaliadores, gestores imobiliários e empresas do setor imobiliário.', pageNum);
  addFaqItem(3, 'A plataforma funciona em dispositivos móveis?', 'Sim, a interface é totalmente responsiva e funciona em desktops, tablets e smartphones.', pageNum);
  addFaqItem(4, 'Preciso instalar algum software?', 'Não, a plataforma funciona diretamente no navegador web, sem necessidade de instalação.', pageNum);

  // CATEGORIA 2: DASHBOARD
  addTitle('DASHBOARD E INDICADORES', pageNum);
  addFaqItem(5, 'Com que frequência os dados são atualizados?', 'Os dados são sincronizados diariamente com as bases oficiais de transações ITBI.', pageNum);
  addFaqItem(6, 'O que significa a mediana de preço por m²?', 'É o valor central quando todos os preços são ordenados, representando melhor o mercado por não ser afetado por valores extremos.', pageNum);
  addFaqItem(7, 'Como funciona o ranking de microbairros?', 'Os microbairros são ordenados pela mediana de preço por m², permitindo identificar as regiões mais valorizadas.', pageNum);
  addFaqItem(8, 'Posso exportar os gráficos do dashboard?', 'Sim, você pode exportar relatórios completos em PDF e dados em Excel/CSV.', pageNum);

  // CATEGORIA 3: PESQUISAS
  addTitle('PESQUISAS DE MERCADO', pageNum);
  addFaqItem(9, 'Quais filtros estão disponíveis nas pesquisas?', 'Localização (bairro, logradouro), faixa de valor, período, área e tipologia do imóvel.', pageNum);
  addFaqItem(10, 'Posso salvar minhas pesquisas favoritas?', 'O histórico de pesquisas é salvo automaticamente para consulta posterior.', pageNum);
  addFaqItem(11, 'Qual o período máximo de dados disponíveis?', 'Os dados cobrem os últimos 5 anos de transações ITBI registradas.', pageNum);
  addFaqItem(12, 'Como exportar os resultados das pesquisas?', 'Use os botões de exportação para gerar arquivos CSV ou Excel com todos os dados filtrados.', pageNum);

  // CATEGORIA 4: AVALIAÇÃO
  addTitle('AVALIAÇÃO IMOBILIÁRIA', pageNum);
  addFaqItem(13, 'Quantas características são avaliadas?', 'São 26 características divididas em categorias: localização, estrutura, acabamentos e diferenciais.', pageNum);
  addFaqItem(14, 'O que são os cenários pessimista, provável e otimista?', 'São três estimativas de valor que consideram diferentes condições de mercado e negociação.', pageNum);
  addFaqItem(15, 'Como é calculado o nível de confiança?', 'Baseado na quantidade de dados de mercado disponíveis e na consistência das características avaliadas.', pageNum);
  addFaqItem(16, 'Posso gerar um laudo em PDF?', 'Sim, ao final da avaliação você pode gerar um laudo profissional completo em PDF.', pageNum);
  addFaqItem(17, 'As avaliações ficam salvas?', 'Sim, todas as avaliações são salvas no histórico e podem ser consultadas ou atualizadas posteriormente.', pageNum);

  // CATEGORIA 5: VISTORIA
  addTitle('VISTORIA DIGITAL', pageNum);
  addFaqItem(18, 'Qual a diferença entre vistoria de casa e apartamento?', 'Casas têm checklist com 55+ itens incluindo área externa, enquanto apartamentos têm 50+ itens focados em áreas comuns e privativas.', pageNum);
  addFaqItem(19, 'Como funciona o sistema de scoring?', 'Cada item é avaliado e recebe uma pontuação que compõe o score geral de conservação do imóvel.', pageNum);
  addFaqItem(20, 'Posso anexar fotos à vistoria?', 'Sim, você pode registrar fotos para documentar cada item avaliado.', pageNum);
  addFaqItem(21, 'O relatório de vistoria serve como laudo técnico?', 'O relatório serve como documentação detalhada, mas laudos oficiais requerem profissional habilitado.', pageNum);

  // CATEGORIA 6: DOCUMENTAÇÃO
  addTitle('DOCUMENTAÇÃO', pageNum);
  addFaqItem(22, 'Quais documentos são verificados no checklist?', 'Documentos do imóvel (matrícula, IPTU), do proprietário (RG, CPF) e da transação (contrato, certidões).', pageNum);
  addFaqItem(23, 'Como funciona o analisador de documentos por IA?', 'Você faz upload do documento e a IA identifica informações relevantes e possíveis inconsistências.', pageNum);
  addFaqItem(24, 'Posso usar o checklist para qualquer tipo de transação?', 'Sim, o checklist é adaptável para compra, venda, locação e outras operações imobiliárias.', pageNum);
  addFaqItem(25, 'Os documentos enviados ficam armazenados?', 'Os documentos são processados temporariamente e não ficam armazenados na plataforma por segurança.', pageNum);

  // CATEGORIA 7: SOFIA IA
  addTitle('SOFIA - ASSISTENTE IA', pageNum);
  addFaqItem(26, 'Que tipo de perguntas posso fazer à Sofia?', 'Perguntas sobre mercado imobiliário, avaliações, documentação, tendências de preços e dúvidas sobre a plataforma.', pageNum);
  addFaqItem(27, 'A Sofia pode analisar documentos?', 'Sim, você pode enviar documentos para análise e a Sofia extrairá informações relevantes.', pageNum);
  addFaqItem(28, 'As respostas da Sofia são confiáveis?', 'A Sofia usa dados atualizados e base de conhecimento especializada, mas recomenda-se validar informações críticas.', pageNum);
  addFaqItem(29, 'Posso usar comandos de voz?', 'Sim, a Sofia aceita consultas por voz para interação hands-free.', pageNum);

  // CATEGORIA 8: ADMINISTRATIVO
  addTitle('RECURSOS ADMINISTRATIVOS', pageNum);
  addFaqItem(30, 'Como gerenciar leads capturados?', 'Acesse a seção Leads para visualizar, filtrar e acompanhar o status de cada prospect.', pageNum);
  addFaqItem(31, 'Quem pode acessar o calibrador de avaliação?', 'Apenas administradores têm acesso para ajustar pesos e fatores do sistema de avaliação.', pageNum);
  addFaqItem(32, 'Como adicionar novos usuários?', 'Administradores podem convidar novos usuários na seção Gerenciar Usuários.', pageNum);
  addFaqItem(33, 'O que é rastreado no log de atividades?', 'Logins, avaliações realizadas, vistorias, pesquisas, exportações e outras ações na plataforma.', pageNum);

  // CATEGORIA 9: SUPORTE
  addTitle('SUPORTE E AJUDA', pageNum);
  addFaqItem(34, 'Como entrar em contato com o suporte?', 'Envie email para contato@godoyprime.com.br ou use o chat da Sofia para dúvidas rápidas.', pageNum);
  addFaqItem(35, 'Existe treinamento disponível?', 'Sim, oferecemos onboarding interativo, tours guiados em cada página e manual completo em PDF.', pageNum);
  addFaqItem(36, 'Como reportar um bug ou erro?', 'Entre em contato pelo email de suporte descrevendo o problema e os passos para reproduzi-lo.', pageNum);
  addFaqItem(37, 'Há atualizações frequentes na plataforma?', 'Sim, a plataforma recebe atualizações regulares com melhorias e novas funcionalidades.', pageNum);

  // CATEGORIA 10: DICAS
  addTitle('DICAS DE USO', pageNum);
  addFaqItem(38, 'Qual a melhor forma de começar a usar a plataforma?', 'Complete o onboarding, explore o dashboard e faça uma avaliação teste para conhecer o fluxo.', pageNum);
  addFaqItem(39, 'Como obter avaliações mais precisas?', 'Preencha todas as 26 características com atenção e use dados de mercado atualizados como referência.', pageNum);
  addFaqItem(40, 'Devo atualizar minhas avaliações periodicamente?', 'Sim, recomendamos revisar avaliações a cada 3-6 meses ou quando houver mudanças significativas no mercado.', pageNum);

  addFooter(pageNum.value);

  // Save
  doc.save('Godoy_Prime_Analytics_Roteiro_Video_FAQ.pdf');
}
