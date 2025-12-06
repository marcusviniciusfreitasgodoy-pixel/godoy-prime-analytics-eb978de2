import jsPDF from 'jspdf';

const NAVY = '#0C2340';
const GOLD = '#D4AF37';

export async function exportPlatformReportPdf() {
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
    doc.text('Manual Completo da Plataforma', pageWidth / 2, 19, { align: 'center' });
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

  const addMainTitle = (text: string, pageNum: { value: number }) => {
    checkNewPage(18, pageNum);
    doc.setFillColor(NAVY);
    doc.rect(margin - 5, y - 5, contentWidth + 10, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y + 3);
    y += 16;
  };

  const addSectionTitle = (text: string, pageNum: { value: number }) => {
    checkNewPage(15, pageNum);
    doc.setFillColor(GOLD);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(NAVY);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin + 3, y + 5.5);
    y += 12;
  };

  const addSubsection = (text: string, pageNum: { value: number }) => {
    checkNewPage(10, pageNum);
    doc.setTextColor(NAVY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('▸ ' + text, margin, y);
    y += 6;
  };

  const addParagraph = (text: string, pageNum: { value: number }) => {
    checkNewPage(15, pageNum);
    const lines = doc.splitTextToSize(text, contentWidth - 5);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin + 3, y);
    y += lines.length * 4.5 + 3;
  };

  const addBulletPoint = (text: string, pageNum: { value: number }) => {
    checkNewPage(8, pageNum);
    doc.setTextColor(GOLD);
    doc.setFontSize(9);
    doc.text('•', margin + 3, y);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth - 15);
    doc.text(lines, margin + 8, y);
    y += lines.length * 4.5 + 1;
  };

  const addBenefit = (text: string, pageNum: { value: number }) => {
    checkNewPage(8, pageNum);
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(9);
    doc.text('✓', margin + 3, y);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth - 15);
    doc.text(lines, margin + 8, y);
    y += lines.length * 4.5 + 1;
  };

  const pageNum = { value: 1 };

  // ===== COVER PAGE =====
  addHeader();
  y = 50;
  
  doc.setTextColor(NAVY);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('MANUAL COMPLETO', pageWidth / 2, y, { align: 'center' });
  y += 12;
  doc.setFontSize(18);
  doc.text('DA PLATAFORMA', pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFillColor(GOLD);
  doc.rect(margin + 30, y, contentWidth - 60, 0.8, 'F');
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Guia de Funcionalidades, Objetivos e Benefícios', pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Table of contents
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin + 10, y, contentWidth - 20, 70, 3, 3, 'F');
  y += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(NAVY);
  doc.text('CONTEÚDO', margin + 20, y);
  y += 8;
  
  const toc = [
    '1. Visão Geral e Diferenciais',
    '2. Dashboard - Inteligência de Mercado',
    '3. Ferramentas de Busca',
    '4. Motor de Avaliação',
    '5. Microregiões',
    '6. Vistoria Digital',
    '7. Documentação (Due Diligence)',
    '8. Assistente de Mercado (IA)',
    '9. Análise de Documentos (IA)',
    '10. Exportações e Relatórios'
  ];
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  toc.forEach(item => {
    doc.text(item, margin + 20, y);
    y += 5.5;
  });

  y += 15;
  doc.setFillColor(NAVY);
  doc.roundedRect(margin + 15, y, contentWidth - 30, 25, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Godoy Prime Realty', pageWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Av. das Américas, 10101 Bloco 2 Sala 316 | CRECI 11841-PJ', pageWidth / 2, y + 14, { align: 'center' });
  doc.text('(21) 4040-0067 | (21) 99725-0515', pageWidth / 2, y + 19, { align: 'center' });

  addFooter(pageNum.value);

  // ===== SECTION 1: OVERVIEW =====
  doc.addPage();
  pageNum.value++;
  addHeader();
  y = 35;

  addMainTitle('1. VISÃO GERAL E DIFERENCIAIS', pageNum);
  
  addSectionTitle('O que é o Godoy Prime Analytics?', pageNum);
  addParagraph('Plataforma de inteligência imobiliária desenvolvida exclusivamente para profissionais do mercado de alto padrão do Rio de Janeiro. Transforma dados oficiais de transações ITBI em insights estratégicos para tomada de decisão.', pageNum);

  addSectionTitle('Diferenciais Competitivos', pageNum);
  addBenefit('Dados Reais: Baseado em transações ITBI oficiais da Prefeitura, não em preços de anúncios', pageNum);
  addBenefit('Fonte Oficial: API ArcGIS da Prefeitura do Rio de Janeiro', pageNum);
  addBenefit('Atualização Mensal: Sincronização automática no 1º dia de cada mês', pageNum);
  addBenefit('Cobertura Ampla: 142 bairros do Rio de Janeiro desde 2020', pageNum);
  addBenefit('Histórico de 5 anos: Análise de tendências desde janeiro de 2020', pageNum);
  addBenefit('Inteligência Artificial: Assistente de mercado e análise de documentos', pageNum);

  addSectionTitle('Público-Alvo', pageNum);
  addBulletPoint('Corretores de imóveis de alto padrão', pageNum);
  addBulletPoint('Gerentes e diretores de imobiliárias', pageNum);
  addBulletPoint('Investidores imobiliários', pageNum);
  addBulletPoint('Avaliadores e peritos', pageNum);

  // ===== SECTION 2: DASHBOARD =====
  addMainTitle('2. DASHBOARD - INTELIGÊNCIA DE MERCADO', pageNum);

  addSectionTitle('KPIs (Indicadores-Chave)', pageNum);
  
  addSubsection('Preço Médio R$/m² (YTD)', pageNum);
  addParagraph('Objetivo: Mostrar o valor médio por metro quadrado do ano corrente. Exibe separação entre apartamentos e casas, com variação mensal em relação ao mês anterior apply.', pageNum);
  addParagraph('Como usar: Observe a tendência (seta verde/vermelha) e compare apartamentos vs casas para entender o segmento mais valorizado.', pageNum);

  addSubsection('Liquidez (Volume Acumulado)', pageNum);
  addParagraph('Objetivo: Quantificar o volume de transações no período, indicando o aquecimento do mercado.', pageNum);
  addParagraph('Como usar: Mercados com alta liquidez oferecem mais oportunidades de negócio e menor tempo de venda.', pageNum);

  addSubsection('Variação Anual (YoY)', pageNum);
  addParagraph('Objetivo: Comparar os últimos 12 meses com o período anterior para identificar tendências de valorização ou desvalorização.', pageNum);
  addParagraph('Como usar: Variação positiva indica mercado em alta; negativa sugere cautela na precificação.', pageNum);

  addSubsection('Região Mais Valorizada', pageNum);
  addParagraph('Objetivo: Destacar o microbairro com maior preço médio por m² dentro do bairro selecionado.', pageNum);
  addParagraph('Como usar: Identifique premium locations para argumentar com clientes sobre valorização.', pageNum);

  addSectionTitle('Gráficos de Evolução', pageNum);
  addParagraph('Evolução de Preços: Histórico desde 2020 com granularidade semestral ou anual. Três abas: Geral (média), Por Tipologia (apt vs casa), e Variação Percentual (volatilidade).', pageNum);
  addParagraph('Evolução por Microbairro: Comparativo de 8 regiões ao longo do tempo com cores distintas e legenda interativa.', pageNum);

  addSectionTitle('Ranking de Microbairros', pageNum);
  addParagraph('Toggle entre Valorização (ordenado por R$/m²) e Liquidez (ordenado por volume). Cards mostram preço médio, volume de transações e comparativo apt/casa.', pageNum);

  addSectionTitle('Benefícios para Corretores', pageNum);
  addBenefit('Argumentação com dados oficiais em apresentações para clientes', pageNum);
  addBenefit('Identificação de regiões em valorização para prospecção', pageNum);
  addBenefit('Comparativo fundamentado entre microbairros', pageNum);

  // ===== SECTION 3: SEARCH TOOLS =====
  addMainTitle('3. FERRAMENTAS DE BUSCA', pageNum);

  addSectionTitle('Aba Localização', pageNum);
  addParagraph('Objetivo: Pesquisar transações históricas por endereço específico com filtros avançados.', pageNum);
  addSubsection('Filtros Disponíveis', pageNum);
  addBulletPoint('Período: 6, 12, 24 ou 60 meses', pageNum);
  addBulletPoint('Bairro: 142 opções com autocomplete', pageNum);
  addBulletPoint('Tipologia: Apartamento, Casa, Sala Comercial, Loja', pageNum);
  addBulletPoint('Faixa de Valor: R$ 100 mil a R$ 100 milhões', pageNum);
  addBulletPoint('Área: Mínima e máxima em m²', pageNum);
  addBulletPoint('Logradouro: Autocomplete com sugestões', pageNum);
  
  addSubsection('Resultados', pageNum);
  addParagraph('Tabela com data, endereço, área, valor total e R$/m². Estatísticas resumidas: mediana, mínimo, máximo e desvio padrão. Exportação para Excel.', pageNum);

  addSectionTitle('Aba Transações (Ranking por Volume)', pageNum);
  addParagraph('Objetivo: Identificar ruas com maior volume de negociações no período.', pageNum);
  addParagraph('Como usar: Filtre por bairro e período para descobrir onde o mercado está mais ativo. Ideal para prospecção de captação.', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Justificar preço de avaliação com dados de mercado', pageNum);
  addBenefit('Identificar comparáveis para laudos', pageNum);
  addBenefit('Descobrir áreas com alta rotatividade para captação', pageNum);

  // ===== SECTION 4: VALUATION ENGINE =====
  addMainTitle('4. MOTOR DE AVALIAÇÃO GODOY PRIME', pageNum);

  addSectionTitle('Visão Geral', pageNum);
  addParagraph('Sistema proprietário de precificação em 5 etapas, combinando 70% dados ITBI (12 meses) + 30% valores de mercado. Metodologia alinhada à NBR 14653-2.', pageNum);

  addSectionTitle('Etapa 1: Localização', pageNum);
  addParagraph('Seleção do bairro e logradouro. Exibe automaticamente dados ITBI da região (min/méd/máx R$/m²). Campo para inserir valores de anúncios atuais.', pageNum);

  addSectionTitle('Etapa 2: Dados Básicos', pageNum);
  addParagraph('Inserção da área do imóvel e seleção da base de preço (ITBI, Anúncios ou Combinado).', pageNum);

  addSectionTitle('Etapa 3: Questionário de Características', pageNum);
  addParagraph('26 características em 5 categorias com pesos calibrados:', pageNum);
  addBulletPoint('Posição e Vista: Vista mar, andar alto, sol manhã, ruído (+7% a -5%)', pageNum);
  addBulletPoint('Conservação: Reforma total, instalações, antiguidade (+6% a -7%)', pageNum);
  addBulletPoint('Conforto: Lazer completo, terraço, piscina (+4% a -3%)', pageNum);
  addBulletPoint('Segurança: Portaria 24h, câmeras, elevador (+2% a -6%)', pageNum);
  addBulletPoint('Funcionalidade: Vagas extras, layout, depósito (+2% a -2%)', pageNum);
  addParagraph('Preview em tempo real mostra impacto de cada resposta no valor final.', pageNum);

  addSectionTitle('Etapa 4: Resultados', pageNum);
  addParagraph('Três cenários: Pessimista, Provável e Otimista. Indicador de spread (variação entre cenários). Nível de confiança colorido:', pageNum);
  addBulletPoint('Verde (85-100): Alta confiança, imóvel bem definido', pageNum);
  addBulletPoint('Amarelo Alto (70-84): Boa confiança com características especiais', pageNum);
  addBulletPoint('Amarelo Médio (55-69): Moderada, recomenda-se especialista', pageNum);
  addBulletPoint('Vermelho (<55): Baixa, necessária avaliação formal CREA', pageNum);

  addSectionTitle('Etapa 5: Recomendação', pageNum);
  addParagraph('Sistema automático de 6 regras gera recomendação personalizada: estratégia de preços, próximos passos, timeline de venda estimado. Botão para exportar PDF profissional.', pageNum);

  addSectionTitle('Fatores de Documentação', pageNum);
  addBulletPoint('OK (1.00): Sem desconto', pageNum);
  addBulletPoint('Pequena Pendência IPTU (0.95): -5%', pageNum);
  addBulletPoint('Débito Condomínio (0.90): -10%', pageNum);
  addBulletPoint('Restrição Usufruto (0.85): -15%', pageNum);
  addBulletPoint('Penhora/Inventário (0.75): -25%', pageNum);
  addBulletPoint('Documentação Incompleta: Bloqueado', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Precificação fundamentada em dados e metodologia técnica', pageNum);
  addBenefit('PDF profissional para apresentar ao cliente', pageNum);
  addBenefit('Recomendações automáticas de posicionamento', pageNum);
  addBenefit('Integração com Vistoria Digital', pageNum);

  // ===== SECTION 5: MICROREGIONS =====
  addMainTitle('5. MICROREGIÕES', pageNum);

  addSectionTitle('Objetivo', pageNum);
  addParagraph('Análise detalhada de cada subdivisão do bairro selecionado com cards individuais.', pageNum);

  addSectionTitle('Informações por Card', pageNum);
  addBulletPoint('Nome do microbairro e posição no ranking', pageNum);
  addBulletPoint('Preço médio R$/m² da região', pageNum);
  addBulletPoint('Volume de transações (liquidez)', pageNum);
  addBulletPoint('Comparativo: Apartamentos vs Casas', pageNum);
  addBulletPoint('Indicador de tendência (12 meses)', pageNum);

  addSectionTitle('Microbairros de Barra da Tijuca', pageNum);
  addBulletPoint('Orla (Av. Lúcio Costa, Sernambetiba, Pepê)', pageNum);
  addBulletPoint('Península (Condomínios Península)', pageNum);
  addBulletPoint('Jardim Oceânico (Olegário Maciel, Érico Veríssimo)', pageNum);
  addBulletPoint('ABM (Av. Prefeito Dulcídio Cardoso)', pageNum);
  addBulletPoint('Parque das Rosas (Mário Covas, César Lattes)', pageNum);
  addBulletPoint('Eixo Américas (Av. das Américas)', pageNum);
  addBulletPoint('Centro Metropolitano (Abelardo Bueno)', pageNum);
  addBulletPoint('Ayrton Senna (Via Parque, Alfa Barra)', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Comparação visual entre regiões para argumentação', pageNum);
  addBenefit('Material pronto para apresentações', pageNum);

  // ===== SECTION 6: VISTORIA DIGITAL =====
  addMainTitle('6. VISTORIA DIGITAL', pageNum);

  addSectionTitle('Objetivo', pageNum);
  addParagraph('Checklist interativo completo para inspeção de imóveis com 21 categorias e mais de 60 itens de verificação.', pageNum);

  addSectionTitle('Categorias de Inspeção', pageNum);
  addBulletPoint('Sistemas Estruturais: Fundações, Estrutura, Cobertura/Telhado, Fachada', pageNum);
  addBulletPoint('Instalações: Elétrica, Hidráulica, Gás, Climatização', pageNum);
  addBulletPoint('Acabamentos: Pisos, Paredes, Forros, Esquadrias, Pintura', pageNum);
  addBulletPoint('Áreas: Cozinha, Banheiros, Área de Serviço, Área Externa', pageNum);
  addBulletPoint('Sistemas: Isolamento, Tecnologia, Acessibilidade, Segurança', pageNum);

  addSectionTitle('Status Disponíveis', pageNum);
  addBulletPoint('OK: Item em perfeitas condições', pageNum);
  addBulletPoint('Atenção: Requer observação ou pequeno reparo', pageNum);
  addBulletPoint('Crítico: Problema grave que afeta valor ou segurança', pageNum);
  addBulletPoint('Não Verificado: Item não inspecionado', pageNum);
  addBulletPoint('Não se Aplica: Item inexistente no imóvel', pageNum);

  addSectionTitle('Recursos', pageNum);
  addBulletPoint('Campo de observações para cada item', pageNum);
  addBulletPoint('Anexo de fotos (em desenvolvimento)', pageNum);
  addBulletPoint('Barra de progresso em tempo real', pageNum);
  addBulletPoint('Contador de itens críticos', pageNum);
  addBulletPoint('Exportação para PDF com laudo formatado', pageNum);
  addBulletPoint('Botão para enviar dados ao Motor de Avaliação', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Padronização do processo de vistoria', pageNum);
  addBenefit('Laudo profissional para documentação', pageNum);
  addBenefit('Integração com avaliação de preço', pageNum);
  addBenefit('Progresso salvo automaticamente', pageNum);

  // ===== SECTION 7: DOCUMENTATION =====
  addMainTitle('7. DOCUMENTAÇÃO (DUE DILIGENCE)', pageNum);

  addSectionTitle('Objetivo', pageNum);
  addParagraph('Checklist jurídico completo para garantir segurança nas transações imobiliárias, organizado por parte (Vendedor/Comprador).', pageNum);

  addSectionTitle('Seções do Vendedor', pageNum);
  addBulletPoint('Dados de Cadastro: Nome, CPF, RG, estado civil, profissão', pageNum);
  addBulletPoint('Documentos Pessoais: RG/CPF, certidão casamento, comprovante residência', pageNum);
  addBulletPoint('Informações Bancárias: PIX, banco, agência, conta', pageNum);
  addBulletPoint('Documentos do Imóvel: Ônus reais, IPTU, condominial, Funesbom, certidões', pageNum);

  addSectionTitle('Seções do Comprador', pageNum);
  addBulletPoint('Dados de Cadastro: Qualificação completa', pageNum);
  addBulletPoint('Documentos Pessoais: RG/CPF, certidões, comprovantes', pageNum);

  addSectionTitle('Campos Condicionais', pageNum);
  addParagraph('Campos adicionais aparecem automaticamente baseados no perfil:', pageNum);
  addBulletPoint('Vendedor Empresário: CNPJ, Contrato Social, Certidão Junta Comercial', pageNum);
  addBulletPoint('União Estável: Escritura, documentos do companheiro', pageNum);
  addBulletPoint('Comunhão Total de Bens: Qualificação e documentos do cônjuge', pageNum);

  addSectionTitle('Recursos', pageNum);
  addBulletPoint('Status por documento: Pendente, Coletado, Problema', pageNum);
  addBulletPoint('Tooltips explicativos para termos técnicos', pageNum);
  addBulletPoint('Progresso salvo automaticamente', pageNum);
  addBulletPoint('Exportação separada: Vendedor, Comprador ou Completo', pageNum);
  addBulletPoint('PDF formatado com perfil e status de cada item', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Segurança jurídica para todas as partes', pageNum);
  addBenefit('Nenhum documento esquecido', pageNum);
  addBenefit('Acompanhamento visual do progresso', pageNum);

  // ===== SECTION 8: AI ASSISTANT =====
  addMainTitle('8. ASSISTENTE DE MERCADO (IA)', pageNum);

  addSectionTitle('Objetivo', pageNum);
  addParagraph('Chatbot com inteligência artificial que responde perguntas sobre o mercado imobiliário em linguagem natural, consultando a base de dados em tempo real.', pageNum);

  addSectionTitle('Localização', pageNum);
  addParagraph('Botão dourado flutuante no canto inferior direito do Dashboard (ícone de chat).', pageNum);

  addSectionTitle('Exemplos de Perguntas', pageNum);
  addBulletPoint('"Qual o preço médio por m² no Jardim Oceânico?"', pageNum);
  addBulletPoint('"Quais ruas têm mais liquidez na Barra?"', pageNum);
  addBulletPoint('"Como está a tendência de preços em Copacabana?"', pageNum);
  addBulletPoint('"Comparar Península com Orla"', pageNum);
  addBulletPoint('"Quantas transações ocorreram em 2024?"', pageNum);

  addSectionTitle('Recursos', pageNum);
  addBulletPoint('Perguntas sugeridas para começar', pageNum);
  addBulletPoint('Histórico da conversa na sessão', pageNum);
  addBulletPoint('Respostas baseadas em dados reais ITBI', pageNum);
  addBulletPoint('Indicador de digitação durante processamento', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Respostas instantâneas sem navegar pela plataforma', pageNum);
  addBenefit('Consultas complexas em linguagem natural', pageNum);
  addBenefit('Dados sempre atualizados', pageNum);

  // ===== SECTION 9: DOCUMENT ANALYSIS =====
  addMainTitle('9. ANÁLISE DE DOCUMENTOS (IA)', pageNum);

  addSectionTitle('Objetivo', pageNum);
  addParagraph('Análise automática de documentos com OCR e inteligência artificial para extrair informações, identificar pendências e classificar status.', pageNum);

  addSectionTitle('Localização', pageNum);
  addParagraph('Página Documentação, seção "Análise Inteligente de Documentos" acima do checklist.', pageNum);

  addSectionTitle('Formatos Aceitos', pageNum);
  addBulletPoint('Imagens: JPG, PNG', pageNum);
  addBulletPoint('Documentos: PDF', pageNum);

  addSectionTitle('Tipos de Documentos Analisados', pageNum);
  addBulletPoint('Certidão de Ônus Reais', pageNum);
  addBulletPoint('Guia de IPTU', pageNum);
  addBulletPoint('Declaração de Quitação Condominial', pageNum);
  addBulletPoint('Documentos Pessoais', pageNum);
  addBulletPoint('Certidões Negativas', pageNum);

  addSectionTitle('Informações Extraídas', pageNum);
  addBulletPoint('Tipo do documento identificado', pageNum);
  addBulletPoint('Dados principais (valores, datas, partes)', pageNum);
  addBulletPoint('Alertas e pendências identificadas', pageNum);
  addBulletPoint('Status geral: OK, Atenção ou Crítico', pageNum);

  addSectionTitle('Recursos', pageNum);
  addBulletPoint('Upload por drag & drop ou seleção', pageNum);
  addBulletPoint('Análise em lote de múltiplos documentos', pageNum);
  addBulletPoint('Resumo com contagem por status', pageNum);
  addBulletPoint('Cards expansíveis com detalhes', pageNum);
  addBulletPoint('Sugestão de marcação no checklist', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Economia de tempo na análise documental', pageNum);
  addBenefit('Identificação automática de problemas', pageNum);
  addBenefit('Integração com checklist de due diligence', pageNum);

  // ===== SECTION 10: EXPORTS =====
  addMainTitle('10. EXPORTAÇÕES E RELATÓRIOS', pageNum);

  addSectionTitle('Formatos Disponíveis', pageNum);
  addBulletPoint('PDF: Relatórios formatados com marca Godoy Prime', pageNum);
  addBulletPoint('Excel (.xlsx): Dados tabulares com formatação', pageNum);
  addBulletPoint('CSV: Dados brutos para análise externa', pageNum);

  addSectionTitle('Relatórios por Módulo', pageNum);
  addSubsection('Dashboard', pageNum);
  addBulletPoint('PDF: KPIs + Ranking + Evolução', pageNum);
  addBulletPoint('Excel: Relatório completo multi-abas', pageNum);
  addBulletPoint('Backup Completo: Toda a base ITBI', pageNum);

  addSubsection('Busca Avançada', pageNum);
  addBulletPoint('Excel: Resultados da pesquisa com filtros aplicados', pageNum);

  addSubsection('Motor de Avaliação', pageNum);
  addBulletPoint('PDF: Laudo de avaliação com 3 cenários e recomendação', pageNum);

  addSubsection('Vistoria Digital', pageNum);
  addBulletPoint('PDF: Laudo de inspeção com status de todos os itens', pageNum);

  addSubsection('Documentação', pageNum);
  addBulletPoint('PDF: Checklist do Vendedor, Comprador ou Completo', pageNum);

  addSectionTitle('Características dos PDFs', pageNum);
  addBulletPoint('Header com logo Godoy Prime', pageNum);
  addBulletPoint('Cores da marca (Navy e Gold)', pageNum);
  addBulletPoint('Rodapé com CRECI, telefone e endereço', pageNum);
  addBulletPoint('Paginação automática', pageNum);
  addBulletPoint('Data de geração', pageNum);

  addSectionTitle('Benefícios', pageNum);
  addBenefit('Material profissional para clientes', pageNum);
  addBenefit('Backup de dados para arquivo', pageNum);
  addBenefit('Integração com sistemas externos via CSV', pageNum);

  // Final page
  checkNewPage(50, pageNum);
  y += 10;
  doc.setFillColor(NAVY);
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Godoy Prime Analytics', pageWidth / 2, y + 12, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Inteligência que valoriza seu negócio', pageWidth / 2, y + 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Dúvidas? Entre em contato: (21) 4040-0067 | (21) 99725-0515', pageWidth / 2, y + 30, { align: 'center' });

  addFooter(pageNum.value);

  // Save
  doc.save('Godoy_Prime_Analytics_Manual_Completo.pdf');
}
