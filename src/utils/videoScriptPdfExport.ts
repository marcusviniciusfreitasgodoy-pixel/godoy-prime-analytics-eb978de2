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
    doc.setTextColor(GOLD);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`📸 Screenshot ${num}:`, margin, y);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(desc, margin + 28, y);
    y += 5;
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
    '• Lista de 29 screenshots necessários',
    '• FAQ com 20 perguntas frequentes',
    '',
    'Duração estimada do vídeo: 9-10 minutos',
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

  // MÓDULO 1
  addTitle('MÓDULO 1: DASHBOARD (0:30 - 2:00)', pageNum);
  addNarration('Ao acessar a plataforma, você encontra o Dashboard - seu painel de controle do mercado imobiliário. No topo, temos quatro indicadores-chave atualizados mensalmente: Primeiro, o Preço Médio por metro quadrado do ano, com variação mensal e separação entre apartamentos e casas. Segundo, a Liquidez - quantas transações foram realizadas no período. Terceiro, a Variação Anual comparando os últimos 12 meses. E quarto, a Região Mais Valorizada do bairro selecionado.', pageNum);
  addScreenshot(2, 'KPIs em destaque com setas indicando cada card', pageNum);
  addScreenshot(3, 'Seletor de bairro aberto mostrando opções', pageNum);

  addNarration('Abaixo dos KPIs, temos o gráfico de Evolução de Preços com dados históricos desde 2020. Você pode alternar entre visualização Semestral ou Anual, e navegar por três abas: Geral, Por Tipologia e Variação Percentual.', pageNum);
  addScreenshot(4, 'Gráfico de evolução com abas visíveis', pageNum);
  addScreenshot(5, 'Aba Por Tipologia mostrando linhas Apt vs Casa', pageNum);

  addNarration('Logo abaixo, o gráfico de Evolução por Microbairro permite comparar a valorização de diferentes regiões ao longo do tempo. E o Ranking de Microbairros mostra quais regiões têm maior valorização ou maior liquidez.', pageNum);
  addScreenshot(6, 'Gráfico de evolução por microbairro', pageNum);
  addScreenshot(7, 'Ranking de microbairros com toggle visível', pageNum);

  // MÓDULO 2
  addTitle('MÓDULO 2: FERRAMENTAS DE BUSCA (2:00 - 4:00)', pageNum);
  addSubtitle('Aba Localização', pageNum);
  addNarration('Na aba Localização, você pesquisa transações por endereço específico. Selecione o período, bairro, tipologia, faixa de valor, área e logradouro. Os resultados mostram cada transação com data, endereço, área, valor total e valor por metro quadrado.', pageNum);
  addScreenshot(8, 'Aba Localização com filtros preenchidos', pageNum);
  addScreenshot(9, 'Resultados de busca com estatísticas', pageNum);

  addSubtitle('Aba Transações', pageNum);
  addNarration('Na aba Transações, você descobre quais ruas têm maior volume de negócios - perfeito para identificar onde o mercado está mais ativo.', pageNum);
  addScreenshot(10, 'Aba Transações com ranking de ruas', pageNum);

  addSubtitle('Aba Avaliação - Motor de Avaliação', pageNum);
  addNarration('A aba Avaliação é onde a mágica acontece. Nosso Motor de Avaliação Godoy Prime é um sistema completo de precificação em 5 etapas: localização, dados básicos, questionário com 26 características, resultados em três cenários, e recomendação automática de posicionamento.', pageNum);
  addScreenshot(11, 'Step 1 - Localização com dados ITBI', pageNum);
  addScreenshot(12, 'Step 3 - Questionário com abas de categorias', pageNum);
  addScreenshot(13, 'Step 4 - Resultados com 3 cenários', pageNum);
  addScreenshot(14, 'Step 5 - Recomendação', pageNum);
  addScreenshot(15, 'Preview do PDF de avaliação', pageNum);

  // MÓDULO 3
  addTitle('MÓDULO 3: MICROREGIÕES (4:00 - 4:45)', pageNum);
  addNarration('No menu lateral, acesse Microregiões para uma análise detalhada de cada área. Cards individuais mostram o preço médio por metro quadrado, volume de transações, comparativo apartamento versus casa, e indicador de tendência.', pageNum);
  addScreenshot(16, 'Página Microregiões com cards', pageNum);

  // MÓDULO 4
  addTitle('MÓDULO 4: VISTORIA DIGITAL (4:45 - 5:45)', pageNum);
  addNarration('A Vistoria Digital é seu checklist interativo para inspeção de imóveis. São 21 categorias e mais de 60 itens. Para cada item, você marca o status: OK, Atenção, Crítico, Não Verificado ou Não se Aplica. Pode adicionar observações e anexar fotos. Ao finalizar, exporte o laudo completo em PDF profissional.', pageNum);
  addScreenshot(17, 'Vistoria Digital com categorias expandidas', pageNum);
  addScreenshot(18, 'Item com status e observações', pageNum);
  addScreenshot(19, 'Barra de progresso e botão de exportação', pageNum);

  // MÓDULO 5
  addTitle('MÓDULO 5: DOCUMENTAÇÃO (5:45 - 6:45)', pageNum);
  addNarration('A página Documentação é seu checklist jurídico completo para segurança nas transações. Dividida em Vendedor e Comprador, lista todos os documentos necessários. Campos condicionais aparecem automaticamente conforme o tipo de transação.', pageNum);
  addScreenshot(20, 'Documentação com seções Vendedor/Comprador', pageNum);
  addScreenshot(21, 'Campos condicionais visíveis', pageNum);
  addScreenshot(22, 'Progresso e status dos documentos', pageNum);

  // MÓDULO 6
  addTitle('MÓDULO 6: ASSISTENTE IA (6:45 - 7:30)', pageNum);
  addNarration('No canto inferior direito do Dashboard, você encontra nosso Assistente de Mercado com Inteligência Artificial. Clique no botão dourado e faça perguntas em linguagem natural. O assistente consulta nossa base de dados em tempo real.', pageNum);
  addScreenshot(23, 'Botão do assistente no Dashboard', pageNum);
  addScreenshot(24, 'Chat aberto com pergunta e resposta', pageNum);

  // MÓDULO 7
  addTitle('MÓDULO 7: ANÁLISE DE DOCUMENTOS IA (7:30 - 8:15)', pageNum);
  addNarration('Na página Documentação, temos a Análise Inteligente de Documentos com IA e OCR. Arraste certidões e documentos para upload. A IA analisa o conteúdo e extrai informações automaticamente, classificando como OK, Atenção ou Crítico.', pageNum);
  addScreenshot(25, 'Área de upload de documentos', pageNum);
  addScreenshot(26, 'Documento analisado com resultados', pageNum);

  // MÓDULO 8
  addTitle('MÓDULO 8: EXPORTAÇÕES (8:15 - 8:45)', pageNum);
  addNarration('Todas as análises podem ser exportadas. No Dashboard, exporte KPIs em Excel ou faça Backup Completo. Avaliações, Vistorias e Documentação geram PDFs profissionais com a marca Godoy Prime.', pageNum);
  addScreenshot(27, 'Menu de exportação do Dashboard', pageNum);
  addScreenshot(28, 'Exemplo de PDF exportado', pageNum);

  // ENCERRAMENTO
  addTitle('ENCERRAMENTO (8:45 - 9:15)', pageNum);
  addNarration('O Godoy Prime Analytics é mais do que uma ferramenta - é seu parceiro estratégico no mercado imobiliário de alto padrão. Dados oficiais, análises inteligentes, documentação completa e inteligência artificial - tudo em uma única plataforma. Acesse agora e transforme dados em resultados. Godoy Prime Realty - Inteligência que valoriza seu negócio.', pageNum);
  addScreenshot(29, 'Tela final com logo Godoy Prime', pageNum);

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
  y += 12;

  addTitle('DADOS E FONTE', pageNum);
  addFaqItem(1, 'De onde vêm os dados da plataforma?', 'Os dados são oficiais do ITBI (Imposto de Transmissão de Bens Imóveis) da Prefeitura do Rio de Janeiro, obtidos via API do ArcGIS. Representam transações reais registradas, não preços de anúncios.', pageNum);
  addFaqItem(2, 'Com que frequência os dados são atualizados?', 'A sincronização ocorre mensalmente, no dia 1º de cada mês às 02:00 UTC. Os últimos 2 meses de dados são atualizados em cada sincronização.', pageNum);
  addFaqItem(3, 'Qual o período histórico disponível?', 'Dados desde janeiro de 2020 até o mês atual, permitindo análises de tendência de longo prazo.', pageNum);
  addFaqItem(4, 'Quantos bairros estão cobertos?', 'Todos os 142 bairros do Rio de Janeiro com dados disponíveis no sistema da Prefeitura.', pageNum);
  addFaqItem(5, 'Por que alguns valores parecem diferentes de anúncios?', 'O ITBI registra o valor efetivamente pago na transação, que geralmente é menor que o valor de anúncio. Isso reflete o preço real de mercado após negociação.', pageNum);

  addTitle('FUNCIONALIDADES', pageNum);
  addFaqItem(6, 'O que significa o filtro percentual transferido >= 90%?', 'Filtramos apenas transações com 90% ou mais do imóvel transferido para evitar distorções de vendas parciais.', pageNum);
  addFaqItem(7, 'Por que só vejo dados residenciais nos KPIs?', 'Os KPIs focam em imóveis residenciais para manter consistência. Nas buscas avançadas você pode filtrar por uso comercial.', pageNum);
  addFaqItem(8, 'O que são os microbairros?', 'São subdivisões de bairros grandes como Barra da Tijuca em regiões menores (Orla, Península, Jardim Oceânico, etc.) para análise mais precisa.', pageNum);
  addFaqItem(9, 'Como funciona o Motor de Avaliação?', 'Combina 70% dados históricos ITBI + 30% valores de mercado atuais, ajustados por 26 características do imóvel. O resultado são 3 cenários com nível de confiança.', pageNum);
  addFaqItem(10, 'O que significam os níveis de confiança?', 'Verde (85-100): Alta confiança. Amarelo Alto (70-84): Boa confiança. Amarelo Médio (55-69): Moderada, recomenda-se especialista. Vermelho (<55): Baixa, necessária avaliação CREA.', pageNum);
  addFaqItem(11, 'Posso usar os PDFs com clientes?', 'Sim! Os PDFs são formatados profissionalmente com a marca Godoy Prime, CRECI, e podem ser apresentados a clientes.', pageNum);

  addTitle('INTELIGÊNCIA ARTIFICIAL', pageNum);
  addFaqItem(12, 'O Assistente de Mercado acessa dados em tempo real?', 'Sim, o assistente consulta a base de dados atual para responder perguntas sobre preços, tendências e liquidez.', pageNum);
  addFaqItem(13, 'Quais tipos de documentos a IA pode analisar?', 'Certidões de ônus, IPTU, declarações condominiais, documentos pessoais em formato JPG, PNG ou PDF.', pageNum);
  addFaqItem(14, 'A análise de documentos substitui verificação humana?', 'Não. A IA auxilia na identificação, mas a validação final deve ser feita por profissional qualificado.', pageNum);

  addTitle('TÉCNICO E ACESSO', pageNum);
  addFaqItem(15, 'Preciso instalar algum programa?', 'Não. A plataforma funciona 100% no navegador web de computador, tablet ou celular.', pageNum);
  addFaqItem(16, 'Posso instalar como app no celular?', 'Sim! A plataforma é um PWA. Use a opção "Adicionar à tela inicial" do navegador.', pageNum);
  addFaqItem(17, 'Meus dados são salvos?', 'Sim, o progresso é salvo automaticamente no navegador. Para backup permanente, exporte os PDFs.', pageNum);
  addFaqItem(18, 'A plataforma funciona offline?', 'Parcialmente. Algumas funcionalidades ficam disponíveis, mas consultas ao banco requerem conexão.', pageNum);

  addTitle('SUPORTE', pageNum);
  addFaqItem(19, 'Como entro em contato para suporte?', 'Telefone: (21) 4040-0067 | (21) 99725-0515. Endereço: Av. das Américas, 10101 Bloco 2 Sala 316. CRECI: 11841-PJ', pageNum);
  addFaqItem(20, 'Há treinamento disponível?', 'Sim, a plataforma possui um Tour Guiado. Clique no ícone de ajuda no Dashboard para iniciar.', pageNum);

  addFooter(pageNum.value);

  // Save
  doc.save('Godoy_Prime_Analytics_Roteiro_Video_FAQ.pdf');
}
