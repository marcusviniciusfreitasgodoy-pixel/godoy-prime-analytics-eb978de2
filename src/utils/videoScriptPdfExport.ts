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
    doc.text('Roteiro de Vídeo e Perguntas Frequentes - Versão 2.0', pageWidth / 2, 19, { align: 'center' });
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
    doc.text(`[Imagem ${num}]`, margin, y);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    const descX = margin + doc.getTextWidth(`[Imagem ${num}] `);
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
  doc.text('Guia Completo de Funcionalidades - Versão 2.0', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFillColor(GOLD);
  doc.rect(margin + 30, y, contentWidth - 60, 0.5, 'F');
  y += 15;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const introText = [
    'Este documento contém:',
    '',
    '• Texto de narração completo para vídeo explicativo',
    '• Lista de mais de 40 imagens necessárias',
    '• Perguntas Frequentes com mais de 50 perguntas em 12 categorias',
    '',
    'Duração estimada do vídeo: 15-18 minutos',
    'Formato recomendado: 1920x1080 (Alta Definição)',
    '',
    'Módulos apresentados:',
    '  - Painel Principal e Indicadores',
    '  - Treinamento e Tutoriais Guiados',
    '  - Microregiões e Pesquisas',
    '  - Avaliação Imobiliária (6 etapas)',
    '  - Estratégia de Precificação',
    '  - Vistoria Digital',
    '  - Agendamento de Visitas',
    '  - Documentação e Segurança Jurídica',
    '  - Sofia - Assistente de Inteligência Artificial',
    '  - Recursos Administrativos',
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
  addNarration('Bem-vindo ao Godoy Prime Analytics - a plataforma de inteligência imobiliária mais completa do Rio de Janeiro. Desenvolvida exclusivamente para corretores e profissionais do mercado de alto padrão, nossa ferramenta transforma dados oficiais da Prefeitura em informações estratégicas para você fechar mais negócios com confiança. Neste vídeo, vou apresentar todas as funcionalidades que vão revolucionar a forma como você analisa o mercado e precifica imóveis.', pageNum);
  addScreenshot(1, 'Tela inicial do Painel Principal com indicadores visíveis', pageNum);

  // MÓDULO 0 - TREINAMENTO
  addTitle('MÓDULO 0: TREINAMENTO E APRENDIZADO (0:30 - 1:45)', pageNum);
  addNarration('Novos usuários são guiados por um tutorial interativo completo. O Treinamento apresenta os 10 módulos principais da plataforma em etapas visuais, com descrição detalhada e lista de funcionalidades de cada área. Uma barra de progresso mostra seu avanço, e você pode navegar livremente entre as etapas ou ir direto para qualquer módulo.', pageNum);
  addScreenshot(2, 'Página de Treinamento com etapas e progresso', pageNum);
  addScreenshot(3, 'Cartão detalhado de um módulo com funcionalidades', pageNum);

  addNarration('O Treinamento também inclui uma seção de Perguntas Frequentes com mais de 50 perguntas organizadas em 12 categorias, e busca integrada. Ao final, você pode baixar o Manual Completo em PDF, o Guia Rápido e o Roteiro de Vídeo.', pageNum);
  addScreenshot(4, 'Seção de Perguntas Frequentes com expansão', pageNum);
  addScreenshot(5, 'Botões de baixar os materiais de apoio', pageNum);

  // MÓDULO 1
  addTitle('MÓDULO 1: PAINEL PRINCIPAL (1:45 - 3:30)', pageNum);
  addNarration('Ao acessar a plataforma, você encontra o Painel Principal - seu centro de controle do mercado imobiliário. No topo, temos quatro indicadores principais atualizados mensalmente: Primeiro, o Preço Médio por metro quadrado do ano, com variação mensal e separação entre apartamentos e casas. Segundo, a Liquidez - quantas transações foram realizadas no período. Terceiro, a Variação Anual comparando os últimos 12 meses. E quarto, a Região Mais Valorizada do bairro selecionado.', pageNum);
  addScreenshot(6, 'Indicadores em destaque com setas indicando cada cartão', pageNum);
  addScreenshot(7, 'Seletor de bairro aberto mostrando opções', pageNum);

  addNarration('Abaixo dos indicadores, temos o gráfico de Evolução de Preços com dados históricos desde 2020. Você pode alternar entre visualização Semestral ou Anual, e navegar por três abas: Geral, Por Tipo de Imóvel e Variação Percentual. Logo ao lado, o gráfico de Evolução por Microregião permite comparar a valorização de diferentes regiões ao longo do tempo.', pageNum);
  addScreenshot(8, 'Gráfico de evolução com abas visíveis', pageNum);
  addScreenshot(9, 'Gráfico de evolução por microregião', pageNum);

  addNarration('O Ranking de Microregiões mostra quais regiões têm maior valorização ou mais vendas. Você pode alternar entre ordenar por preço ou por quantidade de transações. E o novo Mapa de Transações oferece visualização geográfica de todas as transações com marcadores interativos.', pageNum);
  addScreenshot(10, 'Ranking de microregiões com botão de alternância visível', pageNum);
  addScreenshot(11, 'Mapa de transações com marcadores', pageNum);

  // MÓDULO 2
  addTitle('MÓDULO 2: PESQUISAS DE MERCADO (3:30 - 5:30)', pageNum);
  addSubtitle('Aba Localização', pageNum);
  addNarration('Na aba Localização, você pesquisa transações por endereço específico. Digite o nome da rua com sugestões automáticas, selecione tipo de imóvel, período (6 a 24 meses), faixa de área e veja os resultados com todas as transações oficiais.', pageNum);
  addScreenshot(12, 'Aba Localização com filtros preenchidos', pageNum);
  addScreenshot(13, 'Resultados de busca com estatísticas', pageNum);

  addSubtitle('Aba Transações', pageNum);
  addNarration('Na aba Transações, você encontra ruas por faixa de valor - de R$ 100 mil até R$ 100 milhões. Perfeito para identificar onde o mercado está mais ativo na faixa de preço do seu cliente. Exporte os resultados em Excel ou CSV.', pageNum);
  addScreenshot(14, 'Aba Transações com faixa de valor selecionada', pageNum);
  addScreenshot(15, 'Botões de exportação Excel/CSV', pageNum);

  // MÓDULO 3
  addTitle('MÓDULO 3: AVALIAÇÃO IMOBILIÁRIA (5:30 - 8:30)', pageNum);
  addNarration('O Motor de Avaliação Godoy Prime é um sistema completo de precificação em 6 etapas: identificação do imóvel e proprietário, localização com busca automática de dados oficiais, dados básicos como área e cômodos, questionário com 26 características em 5 categorias, resultados em três cenários (pessimista, provável e otimista), e recomendação automática com próximos passos.', pageNum);
  addScreenshot(16, 'Etapa 0 - Identificação do imóvel e proprietário', pageNum);
  addScreenshot(17, 'Etapa 1 - Localização com dados oficiais carregados', pageNum);
  addScreenshot(18, 'Etapa 2 - Dados básicos e escolha da base de preço', pageNum);
  addScreenshot(19, 'Etapa 3 - Questionário com abas de categorias', pageNum);
  addScreenshot(20, 'Etapa 4 - Resultados com 3 cenários, gráficos e confiança', pageNum);
  addScreenshot(21, 'Etapa 5 - Recomendação estratégica e próximos passos', pageNum);

  addNarration('Na etapa de resultados, você visualiza gráficos de análise histórica e projeção futura baseados nas tendências do mercado. Ao finalizar, gere um laudo profissional em PDF com todas as informações, metodologia e dados de mercado.', pageNum);
  addScreenshot(22, 'Gráfico de análise histórica e projeção', pageNum);
  addScreenshot(23, 'Visualização do PDF de avaliação', pageNum);

  // MÓDULO 4 - ESTRATÉGIA DE PRECIFICAÇÃO
  addTitle('MÓDULO 4: ESTRATÉGIA DE PRECIFICAÇÃO (8:30 - 10:00)', pageNum);
  addNarration('Após a avaliação, o módulo de Estratégia de Precificação ajuda a definir o melhor posicionamento de preço. Responda 9 perguntas diagnósticas sobre tempo de mercado, concorrência, urgência, situação financeira do vendedor e perfil do imóvel.', pageNum);
  addScreenshot(24, 'Questionário diagnóstico com perguntas', pageNum);

  addNarration('O sistema analisa as respostas e apresenta 3 estratégias: Atração (venda rápida com preço competitivo), Mercado (equilíbrio entre velocidade e valor) e Premium (maximização do valor líquido). Uma estratégia é recomendada automaticamente com base no diagnóstico.', pageNum);
  addScreenshot(25, 'Cartões das 3 estratégias com recomendação destacada', pageNum);
  addScreenshot(26, 'Detalhes da estratégia selecionada', pageNum);

  addNarration('Para cada estratégia, você visualiza o preço de anúncio, comissão, valor líquido ao vendedor e o prêmio em relação ao valor de referência. Há também a opção de ativar o Plano de Ajuste para reduções programadas de preço após períodos sem propostas.', pageNum);
  addScreenshot(27, 'Comparativo de valores entre estratégias', pageNum);

  // MÓDULO 5
  addTitle('MÓDULO 5: MICROREGIÕES (10:00 - 10:45)', pageNum);
  addNarration('No menu lateral, acesse Microregiões para uma análise detalhada de cada área. Cartões individuais mostram o preço médio por metro quadrado, quantidade de transações, comparativo apartamento versus casa, e indicador de tendência. Pesquise por rua ou condomínio específico e compare até 5 ruas ao mesmo tempo.', pageNum);
  addScreenshot(28, 'Página Microregiões com cartões e pesquisa', pageNum);
  addScreenshot(29, 'Gráfico comparativo entre ruas', pageNum);

  // MÓDULO 6
  addTitle('MÓDULO 6: VISTORIA DIGITAL (10:45 - 12:00)', pageNum);
  addNarration('A Vistoria Digital é sua lista de verificação interativa para inspeção de imóveis. São mais de 55 itens para casas em 20 categorias e 50 para apartamentos em 18 categorias. Para cada item, você marca a situação: OK, Atenção, Crítico, Não Verificado ou Não se Aplica. Pode adicionar observações e anexar fotos diretamente.', pageNum);
  addScreenshot(30, 'Seleção de tipo: Casa ou Apartamento', pageNum);
  addScreenshot(31, 'Lista de verificação expandida com categorias', pageNum);
  addScreenshot(32, 'Item com situação, observações e fotos', pageNum);

  addNarration('Um sistema de pontuação calcula automaticamente a nota de conservação de 0 a 100. Ao finalizar, exporte o laudo PDF profissional com capa, resumo executivo, gráfico de diagnóstico, lista de verificação completa e galeria de fotos. Depois, siga diretamente para a Avaliação com todos os dados pré-preenchidos.', pageNum);
  addScreenshot(33, 'Nota de conservação e progresso', pageNum);
  addScreenshot(34, 'Botões Gerar PDF e Ir para Avaliação', pageNum);

  // MÓDULO 7
  addTitle('MÓDULO 7: AGENDAMENTO DE VISITAS (12:00 - 13:30)', pageNum);
  addNarration('O módulo de Visitas oferece gestão completa do processo. No Painel de Visitas, acompanhe indicadores de volume, conversão e desempenho. Crie agendamentos com data, hora, tipo de serviço e dados do cliente. Gerencie sua disponibilidade no calendário.', pageNum);
  addScreenshot(35, 'Painel de Visitas com indicadores', pageNum);
  addScreenshot(36, 'Formulário de agendamento', pageNum);
  addScreenshot(37, 'Calendário de disponibilidade', pageNum);

  addNarration('Para cada visita realizada, gere uma Ficha de Visita com código único, dados completos e declaração de intermediação. Colete assinaturas digitais do cliente e corretor na tela ou envie link para assinatura remota. Envie link de avaliação pós-visita por email.', pageNum);
  addScreenshot(38, 'Ficha de visita com todos os campos', pageNum);
  addScreenshot(39, 'Área de assinatura digital', pageNum);
  addScreenshot(40, 'Link de avaliação por email', pageNum);

  addNarration('Acompanhe a evolução mensal de visitas no gráfico e veja o ranking dos corretores por quantidade de atendimentos.', pageNum);
  addScreenshot(41, 'Gráfico de evolução mensal', pageNum);
  addScreenshot(42, 'Ranking de corretores', pageNum);

  // MÓDULO 8
  addTitle('MÓDULO 8: DOCUMENTAÇÃO (13:30 - 14:30)', pageNum);
  addNarration('A página Documentação é sua lista de verificação jurídica completa para segurança nas transações. Dividida em seções para Vendedor e Comprador, com campos condicionais para Empresa, União Estável ou Comunhão de Bens. A Análise de Documentos com Inteligência Artificial permite fazer envio de certidões e extrair informações automaticamente.', pageNum);
  addScreenshot(43, 'Lista de verificação do Vendedor com perfil condicional', pageNum);
  addScreenshot(44, 'Lista de verificação do Comprador', pageNum);
  addScreenshot(45, 'Análise de Documentos com Inteligência Artificial e resultados', pageNum);

  // MÓDULO 9
  addTitle('MÓDULO 9: SOFIA - ASSISTENTE DE INTELIGÊNCIA ARTIFICIAL (14:30 - 15:15)', pageNum);
  addNarration('No canto inferior direito, você encontra Sofia - nossa Assistente de Mercado com Inteligência Artificial. Faça perguntas em linguagem natural sobre preços, tendências, comparativos entre bairros, documentação ou qualquer dúvida sobre a plataforma. Sofia consulta a base de dados em tempo real e oferece sugestões inteligentes. Use comandos de voz para interação sem usar as mãos e ouça as respostas em áudio.', pageNum);
  addScreenshot(46, 'Botão da Sofia no Painel Principal', pageNum);
  addScreenshot(47, 'Conversa aberta com pergunta e resposta', pageNum);
  addScreenshot(48, 'Análise de documento pela Sofia', pageNum);

  // MÓDULO 10
  addTitle('MÓDULO 10: RECURSOS ADMINISTRATIVOS (15:15 - 16:15)', pageNum);
  addNarration('Administradores têm acesso a recursos avançados: Base de Conhecimento para gerenciar conteúdo da Inteligência Artificial, Calibrador de Avaliação para ajustar pesos das características, Gestão de Contatos com filtros e exportação, Gerenciamento de Usuários com papéis e permissões, Rastreamento de Atividades para acompanhamento completo, e Sincronização de dados da Prefeitura.', pageNum);
  addScreenshot(49, 'Página de Gestão de Contatos', pageNum);
  addScreenshot(50, 'Gerenciamento de Usuários com atividades', pageNum);
  addScreenshot(51, 'Calibrador de Avaliação', pageNum);

  // MÓDULO 11
  addTitle('MÓDULO 11: EXPORTAÇÕES E MATERIAIS (16:15 - 16:45)', pageNum);
  addNarration('Todas as análises podem ser exportadas. No Painel Principal, exporte indicadores em Excel ou faça Cópia de Segurança Completa. Avaliações, Vistorias, Fichas de Visita e Documentação geram PDFs profissionais. Na página de Treinamento, baixe o Manual Completo, o Guia Rápido e o Roteiro de Vídeo.', pageNum);
  addScreenshot(52, 'Menu de exportação do Painel Principal', pageNum);
  addScreenshot(53, 'PDFs gerados pela plataforma', pageNum);

  // ENCERRAMENTO
  addTitle('ENCERRAMENTO (16:45 - 17:30)', pageNum);
  addNarration('O Godoy Prime Analytics é mais do que uma ferramenta - é seu parceiro estratégico no mercado imobiliário de alto padrão. Dados oficiais da Prefeitura, avaliações automatizadas com metodologia própria, estratégia de precificação inteligente, vistorias digitais completas, gestão de visitas com assinatura digital, documentação de segurança jurídica, assistente com inteligência artificial e treinamento interativo - tudo em uma única plataforma. Acesse agora e transforme dados em resultados. Godoy Prime Realty - Inteligência que valoriza seu negócio.', pageNum);

  addFooter(pageNum.value);

  // FAQ Section
  doc.addPage();
  pageNum.value++;
  addHeader();
  y = 35;

  doc.setTextColor(NAVY);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PERGUNTAS FREQUENTES', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Mais de 50 perguntas organizadas em 12 categorias', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // CATEGORIA 1: GERAL
  addTitle('GERAL', pageNum);
  addFaqItem(1, 'O que é o Godoy Prime Analytics?', 'É a plataforma de inteligência imobiliária mais completa do Rio de Janeiro, oferecendo análise de dados oficiais da Prefeitura, avaliações automatizadas, vistorias digitais, gestão de visitas e assistência por inteligência artificial.', pageNum);
  addFaqItem(2, 'Quem pode usar a plataforma?', 'Corretores de imóveis, avaliadores, gestores imobiliários e empresas do setor imobiliário que atuam no mercado de alto padrão do Rio de Janeiro.', pageNum);
  addFaqItem(3, 'A plataforma funciona em celulares e tablets?', 'Sim, a interface funciona em computadores, tablets e celulares. Pode ser instalada como aplicativo para acesso rápido.', pageNum);
  addFaqItem(4, 'Preciso instalar algum programa?', 'Não, a plataforma funciona diretamente no navegador de internet. Opcionalmente, pode ser instalada como aplicativo para acesso rápido.', pageNum);

  // CATEGORIA 2: PAINEL
  addTitle('PAINEL E INDICADORES', pageNum);
  addFaqItem(5, 'Com que frequência os dados são atualizados?', 'Os dados são sincronizados mensalmente com as bases oficiais da Prefeitura do Rio de Janeiro.', pageNum);
  addFaqItem(6, 'O que significa a mediana de preço por m²?', 'É o valor central quando todos os preços são ordenados, representando melhor o mercado por não ser afetado por valores muito altos ou muito baixos.', pageNum);
  addFaqItem(7, 'Como funciona o ranking de microregiões?', 'As microregiões são ordenadas pela mediana de preço por m² ou quantidade de transações, permitindo identificar regiões mais valorizadas ou com mais vendas.', pageNum);
  addFaqItem(8, 'Posso exportar os gráficos do painel?', 'Sim, você pode exportar relatórios completos em PDF, dados em Excel/CSV e fazer cópia de segurança completa do banco de dados.', pageNum);

  // CATEGORIA 3: PESQUISAS
  addTitle('PESQUISAS DE MERCADO', pageNum);
  addFaqItem(9, 'Quais filtros estão disponíveis nas pesquisas?', 'Localização (bairro, rua), faixa de valor (R$ 100 mil a R$ 100 milhões), período (6 a 24 meses), área em m² e tipo de imóvel.', pageNum);
  addFaqItem(10, 'Posso salvar minhas pesquisas favoritas?', 'O histórico de pesquisas é salvo automaticamente para consulta posterior.', pageNum);
  addFaqItem(11, 'Qual o período máximo de dados disponíveis?', 'Os dados cobrem transações desde 2020, representando mais de 5 anos de histórico oficial.', pageNum);
  addFaqItem(12, 'Como exportar os resultados das pesquisas?', 'Use os botões de exportação para gerar arquivos CSV ou Excel com todos os dados filtrados.', pageNum);

  // CATEGORIA 4: AVALIAÇÃO
  addTitle('AVALIAÇÃO IMOBILIÁRIA', pageNum);
  addFaqItem(13, 'Quantas características são avaliadas?', 'São 26 características divididas em 5 categorias: Posição/Vista, Conservação, Conforto, Segurança e Funcionalidade.', pageNum);
  addFaqItem(14, 'O que são os cenários pessimista, provável e otimista?', 'São três estimativas de valor que consideram diferentes condições de mercado e negociação, oferecendo uma faixa realista.', pageNum);
  addFaqItem(15, 'Como é calculado o nível de confiança?', 'Baseado na quantidade de transações disponíveis para a rua e na consistência das características avaliadas.', pageNum);
  addFaqItem(16, 'Posso gerar um laudo em PDF?', 'Sim, ao final da avaliação você pode gerar um laudo profissional completo com metodologia, gráficos e dados de mercado.', pageNum);
  addFaqItem(17, 'As avaliações ficam salvas?', 'Sim, todas as avaliações são salvas no histórico e podem ser consultadas, editadas ou atualizadas posteriormente.', pageNum);

  // CATEGORIA 5: ESTRATÉGIA DE PRECIFICAÇÃO
  addTitle('ESTRATÉGIA DE PRECIFICAÇÃO', pageNum);
  addFaqItem(18, 'O que é a estratégia de precificação?', 'É um módulo que define o melhor preço de anúncio baseado em diagnóstico do imóvel, objetivos do vendedor e condições de mercado.', pageNum);
  addFaqItem(19, 'Quais são as estratégias disponíveis?', 'Atração (venda rápida), Mercado (equilíbrio entre velocidade e valor) e Premium (maximização do valor líquido).', pageNum);
  addFaqItem(20, 'Como o sistema recomenda uma estratégia?', 'Baseado em 9 perguntas diagnósticas sobre tempo de mercado, concorrência, urgência, situação financeira e perfil do imóvel.', pageNum);
  addFaqItem(21, 'O que é o plano de ajuste?', 'É uma opção para programar reduções automáticas de preço após períodos sem propostas, mantendo competitividade.', pageNum);

  // CATEGORIA 6: VISTORIA
  addTitle('VISTORIA DIGITAL', pageNum);
  addFaqItem(22, 'Qual a diferença entre vistoria de casa e apartamento?', 'Casas têm mais de 55 itens em 20 categorias incluindo área externa. Apartamentos têm mais de 50 itens em 18 categorias focadas em áreas comuns e privativas.', pageNum);
  addFaqItem(23, 'Como funciona o sistema de pontuação?', 'Cada item é avaliado de 1 (Crítico) a 5 (Excelente). O sistema calcula uma nota de conservação de 0 a 100.', pageNum);
  addFaqItem(24, 'Posso anexar fotos à vistoria?', 'Sim, você pode registrar fotos para documentar cada item avaliado, com envio direto pelo celular ou computador.', pageNum);
  addFaqItem(25, 'O relatório de vistoria serve como laudo técnico oficial?', 'O relatório serve como documentação detalhada, mas laudos técnicos oficiais requerem profissional habilitado.', pageNum);

  // CATEGORIA 7: VISITAS
  addTitle('AGENDAMENTO DE VISITAS', pageNum);
  addFaqItem(26, 'Como funciona o agendamento de visitas?', 'Você cria agendamentos com data/hora, dados do cliente e tipo de serviço. O sistema gera fichas com código único.', pageNum);
  addFaqItem(27, 'O que é a assinatura digital?', 'Cliente e corretor podem assinar a ficha diretamente na tela ou via link remoto enviado por WhatsApp/email.', pageNum);
  addFaqItem(28, 'Como funciona a avaliação pós-visita?', 'Após a visita, um link é enviado ao cliente para avaliar o imóvel, informar interesse e registrar observações.', pageNum);
  addFaqItem(29, 'Posso ver estatísticas de visitas?', 'Sim, o painel mostra indicadores de volume, conversão, evolução mensal e ranking dos corretores.', pageNum);

  // CATEGORIA 8: DOCUMENTAÇÃO
  addTitle('DOCUMENTAÇÃO', pageNum);
  addFaqItem(30, 'Quais documentos são verificados na lista?', 'Documentos do imóvel (matrícula, IPTU), do vendedor/comprador (RG, CPF, certidões) e da transação (contrato, procurações).', pageNum);
  addFaqItem(31, 'Como funciona a análise de documentos por inteligência artificial?', 'Você faz envio do documento e a inteligência artificial identifica automaticamente o tipo e extrai informações relevantes.', pageNum);
  addFaqItem(32, 'Posso usar a lista para qualquer tipo de transação?', 'Sim, a lista é adaptável para compra, venda, locação e outras operações imobiliárias.', pageNum);
  addFaqItem(33, 'Os documentos enviados ficam armazenados?', 'Os documentos são processados temporariamente e não ficam armazenados na plataforma por segurança.', pageNum);

  // CATEGORIA 9: SOFIA IA
  addTitle('SOFIA - ASSISTENTE DE INTELIGÊNCIA ARTIFICIAL', pageNum);
  addFaqItem(34, 'Que tipo de perguntas posso fazer à Sofia?', 'Perguntas sobre preços, tendências, comparativos entre bairros, documentação e dúvidas sobre a plataforma.', pageNum);
  addFaqItem(35, 'A Sofia pode analisar documentos?', 'Sim, você pode enviar documentos para análise e a Sofia extrairá informações relevantes.', pageNum);
  addFaqItem(36, 'As respostas da Sofia são confiáveis?', 'A Sofia usa dados atualizados e base de conhecimento especializada, mas recomenda-se validar informações críticas.', pageNum);
  addFaqItem(37, 'Posso usar comandos de voz?', 'Sim, a Sofia aceita consultas por voz e pode responder com leitura de áudio.', pageNum);

  // CATEGORIA 10: ADMINISTRATIVO
  addTitle('RECURSOS ADMINISTRATIVOS', pageNum);
  addFaqItem(38, 'Como gerenciar contatos capturados?', 'Acesse a seção de Contatos para visualizar, filtrar por origem/interesse/período e acompanhar o progresso de cada possível cliente.', pageNum);
  addFaqItem(39, 'Quem pode acessar o calibrador de avaliação?', 'Apenas administradores têm acesso para ajustar pesos e fatores do sistema de avaliação.', pageNum);
  addFaqItem(40, 'Como adicionar novos usuários?', 'Administradores podem convidar novos usuários na seção Gerenciar Usuários, definindo papel.', pageNum);
  addFaqItem(41, 'O que é rastreado no registro de atividades?', 'Acessos, avaliações, vistorias, visitas, pesquisas, exportações e todas as ações relevantes.', pageNum);

  // CATEGORIA 11: SUPORTE
  addTitle('SUPORTE E AJUDA', pageNum);
  addFaqItem(42, 'Como entrar em contato com o suporte?', 'Envie email para contato@godoyprime.com.br, use o chat da Sofia ou ligue para (21) 4040-0067.', pageNum);
  addFaqItem(43, 'Existe treinamento disponível?', 'Sim, oferecemos treinamento interativo, tutoriais guiados, manual em PDF, guia rápido e roteiro de vídeo.', pageNum);
  addFaqItem(44, 'Como reportar um problema ou erro?', 'Entre em contato pelo email de suporte descrevendo o problema detalhadamente.', pageNum);
  addFaqItem(45, 'Há atualizações frequentes na plataforma?', 'Sim, a plataforma recebe atualizações contínuas com melhorias e novas funcionalidades.', pageNum);

  // CATEGORIA 12: DICAS
  addTitle('DICAS DE USO', pageNum);
  addFaqItem(46, 'Qual a melhor forma de começar a usar a plataforma?', 'Complete o treinamento, explore o painel principal, faça uma avaliação teste e uma vistoria para conhecer os fluxos.', pageNum);
  addFaqItem(47, 'Como obter avaliações mais precisas?', 'Preencha todas as 26 características com atenção e inclua dados de anúncios quando disponíveis.', pageNum);
  addFaqItem(48, 'Posso usar a plataforma sem internet?', 'Não, é necessária conexão com internet para acessar dados em tempo real e funcionalidades da inteligência artificial.', pageNum);
  addFaqItem(49, 'Devo atualizar minhas avaliações periodicamente?', 'Sim, recomendamos revisar a cada 3-6 meses ou quando houver mudanças significativas no mercado.', pageNum);
  addFaqItem(50, 'Como melhorar minha produtividade?', 'Use fluxos integrados (Vistoria → Avaliação → Precificação), exporte em lote e configure sua disponibilidade.', pageNum);

  addFooter(pageNum.value);

  // Save
  doc.save('Godoy_Prime_Analytics_Roteiro_Video_FAQ_v2.pdf');
}
