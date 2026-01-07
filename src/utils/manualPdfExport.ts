import jsPDF from 'jspdf';
import { drawGodoyHeader, drawGodoyFooter, drawSectionTitle, BRAND_COLORS, applyFootersToAllPages } from './pdfTemplate';

const manualContent = {
  introducao: {
    titulo: "Introdução",
    texto: "O Godoy Prime Analytics é uma plataforma completa de inteligência imobiliária desenvolvida para corretores, avaliadores e gestores do mercado imobiliário do Rio de Janeiro. A ferramenta oferece análise de dados de transações oficiais, avaliações automatizadas, vistorias digitais, agendamento de visitas, documentação de due diligence e assistência por inteligência artificial."
  },
  modulos: [
    {
      titulo: "1. Dashboard",
      descricao: "Visão geral do mercado imobiliário com indicadores em tempo real baseados em dados oficiais.",
      funcionalidades: [
        "KPIs Principais: Preço médio R$/m², liquidez acumulada, variação anual (YoY)",
        "Separação por Tipologia: Apartamentos vs Casas com métricas independentes",
        "Gráfico de Evolução: Visualização semestral/anual com indicadores de tendência",
        "Ranking de Microbairros: Comparativo por R$/m² ou volume de transações",
        "Seletor de Bairro: Filtro para segmentar todas as análises",
        "Exportação: PDF (KPIs + Ranking), Excel completo e Backup"
      ],
      beneficios: "Permite tomada de decisão rápida baseada em dados atualizados do mercado."
    },
    {
      titulo: "2. Manual / Tour",
      descricao: "Central de aprendizado com onboarding interativo e tours guiados.",
      funcionalidades: [
        "Onboarding em Cards: 10 módulos explicativos da plataforma",
        "FAQ Completo: 40+ perguntas organizadas em 10 categorias",
        "Busca Integrada: Encontre respostas rapidamente",
        "Tours Guiados: Tutoriais interativos ativados na primeira visita de cada página",
        "Download PDF: Manual completo para consulta offline"
      ],
      beneficios: "Acelera o aprendizado e reduz curva de adaptação à plataforma."
    },
    {
      titulo: "3. Microregiões",
      descricao: "Análise detalhada por logradouro e condomínio com comparativos.",
      funcionalidades: [
        "Pesquisa por Logradouro: Busca inteligente com autocomplete",
        "Análise de Condomínios: Dados específicos por empreendimento",
        "Separação por Tipologia: Casas vs Apartamentos",
        "Comparativo de Ruas: Gráfico comparando até 5 logradouros",
        "Gráfico de Evolução: Histórico de preços por rua"
      ],
      beneficios: "Identifica oportunidades em micro-mercados específicos."
    },
    {
      titulo: "4. Pesquisas de Mercado",
      descricao: "Ferramenta avançada de busca de transações oficiais.",
      funcionalidades: [
        "Filtros por Localização: Bairro, logradouro, número",
        "Filtros por Valor: Faixa de preço total e por m²",
        "Filtros por Período: Intervalo de datas desde 2020",
        "Filtros por Área: Metragem mínima e máxima",
        "Resultados em Tabela: Paginação e ordenação",
        "Exportação: CSV e Excel com dados completos"
      ],
      beneficios: "Fundamenta avaliações com comparativos de mercado confiáveis."
    },
    {
      titulo: "5. Avaliação Imobiliária",
      descricao: "Sistema de avaliação automatizado em 6 etapas com geração de parecer.",
      funcionalidades: [
        "Etapa 1 - Identificação: Dados do proprietário, objetivo e tipo de imóvel",
        "Etapa 2 - Localização: Endereço com autocomplete e dados ITBI",
        "Etapa 3 - Dados Básicos: Área, quartos, suítes, banheiros, vagas",
        "Etapa 4 - Questionário: 26 características em 5 categorias avaliadas",
        "Etapa 5 - Resultados: Valores pessimista, provável e otimista com spread",
        "Etapa 6 - Recomendação: Estratégia de precificação personalizada",
        "PDF Profissional: Laudo completo com metodologia e dados de mercado"
      ],
      beneficios: "Produz avaliações profissionais com metodologia consistente."
    },
    {
      titulo: "6. Histórico de Avaliações",
      descricao: "Consulta e gerenciamento de todas as avaliações realizadas.",
      funcionalidades: [
        "Lista Completa: Todas as avaliações salvas com data e valores",
        "Filtros: Por período, logradouro, faixa de valor",
        "Detalhamento: Visualização completa de cada avaliação",
        "Regeneração de PDF: Gere novos laudos a qualquer momento",
        "Exportação: Lista em Excel para análise externa"
      ],
      beneficios: "Mantém histórico organizado para consulta e atualização."
    },
    {
      titulo: "7. Vistoria Digital",
      descricao: "Checklist completo para inspeção técnica de imóveis com fotos.",
      funcionalidades: [
        "55+ Itens para Casas: Inclui área externa, telhado, jardim",
        "50+ Itens para Apartamentos: Áreas comuns e privativas",
        "Sistema de Scoring: OK / Atenção / Crítico / N.V. / N/A",
        "Registro Fotográfico: Documentação visual por item",
        "Laudo PDF: Relatório profissional com radar de diagnóstico",
        "Persistência: Dados salvos automaticamente no navegador"
      ],
      beneficios: "Padroniza vistorias e reduz riscos em transações."
    },
    {
      titulo: "8. Agendamento de Visitas",
      descricao: "Gestão completa de visitas com fichas, assinaturas e feedback.",
      funcionalidades: [
        "Fichas de Visita: Criação com código único para cada visita",
        "Gestão de Disponibilidade: Calendário do corretor com horários",
        "Assinaturas Digitais: Visitante e corretor assinam na tela",
        "Link de Feedback: Envio automático para avaliação pós-visita",
        "Dashboard de Visitas: KPIs e gráficos de performance",
        "Ranking de Corretores: Comparativo por volume de visitas"
      ],
      beneficios: "Profissionaliza o processo de visitas e coleta feedback valioso."
    },
    {
      titulo: "9. Documentação (Due Diligence)",
      descricao: "Checklist completo para garantir segurança jurídica em transações.",
      funcionalidades: [
        "Checklist Dinâmico: Documentos para Vendedor e Comprador",
        "Perfil Condicional: Campos extras para PJ ou União Estável",
        "Analisador IA: Upload de documentos com identificação automática",
        "Status Visual: Acompanhamento por documento",
        "Exportação PDF: Relatório separado por parte"
      ],
      beneficios: "Garante segurança jurídica e organização nas transações."
    },
    {
      titulo: "10. Configurações",
      descricao: "Personalização da plataforma e dados da empresa.",
      funcionalidades: [
        "Logo da Empresa: Upload para exibir nos PDFs gerados",
        "Dados de Contato: Configuração de email e telefone",
        "Preferências: Ajustes de interface e notificações"
      ],
      beneficios: "Permite personalização para identidade visual própria."
    },
    {
      titulo: "11. Sofia - Assistente IA",
      descricao: "Assistente virtual inteligente disponível em todas as páginas.",
      funcionalidades: [
        "Chat em Tempo Real: Respostas instantâneas sobre mercado",
        "Consultas por Voz: Interação hands-free com microfone",
        "Análise de Documentos: Upload e interpretação automática",
        "Base de Conhecimento: Informações especializadas do mercado",
        "Sugestões Inteligentes: Recomendações contextuais"
      ],
      beneficios: "Acelera consultas e fornece insights especializados."
    },
    {
      titulo: "12. Recursos Administrativos",
      descricao: "Ferramentas de gestão exclusivas para administradores.",
      funcionalidades: [
        "Base de Conhecimento Sofia: Gerenciar conteúdo da IA",
        "Calibrador de Avaliação: Ajustar pesos e fatores do sistema",
        "Gestão de Leads: Acompanhar prospects capturados",
        "Gerenciamento de Usuários: Controle de acessos e papéis",
        "Rastreamento de Atividades: Auditoria completa de uso"
      ],
      beneficios: "Permite personalização e controle total da plataforma."
    }
  ],
  recursosAdicionais: [
    {
      titulo: "Tours Guiados",
      descricao: "Tutoriais interativos em cada página, ativados automaticamente na primeira visita ou via botão 'Tour Guiado'."
    },
    {
      titulo: "Exportações",
      descricao: "Suporte a PDF, Excel e CSV para todos os relatórios e pesquisas. Material de Apoio inclui Manual, Roteiro de Vídeo e Checklist de Testes."
    },
    {
      titulo: "Responsividade",
      descricao: "Interface totalmente adaptada para desktop, tablet e smartphone com gestos touch."
    },
    {
      titulo: "PWA",
      descricao: "Instale a plataforma como app no celular para acesso rápido via ícone na tela inicial."
    }
  ],
  faq: [
    {
      categoria: "Geral",
      perguntas: [
        { p: "O que é o Godoy Prime Analytics?", r: "É uma plataforma de inteligência imobiliária que oferece análise de dados, avaliações automatizadas, vistorias digitais e assistência por IA para profissionais do mercado imobiliário da Barra da Tijuca." },
        { p: "Quem pode usar a plataforma?", r: "Corretores de imóveis, avaliadores, gestores imobiliários e empresas do setor imobiliário." },
        { p: "A plataforma funciona em dispositivos móveis?", r: "Sim, a interface é totalmente responsiva e funciona em desktops, tablets e smartphones." },
        { p: "Preciso instalar algum software?", r: "Não, a plataforma funciona diretamente no navegador web, sem necessidade de instalação." }
      ]
    },
    {
      categoria: "Dashboard e Indicadores",
      perguntas: [
        { p: "Com que frequência os dados são atualizados?", r: "Os dados são sincronizados diariamente com as bases oficiais de transações." },
        { p: "O que significa a mediana de preço por m²?", r: "É o valor central quando todos os preços são ordenados, representando melhor o mercado por não ser afetado por valores extremos." },
        { p: "Como funciona o ranking de microbairros?", r: "Os microbairros são ordenados pela mediana de preço por m², permitindo identificar as regiões mais valorizadas." },
        { p: "Posso exportar os gráficos do dashboard?", r: "Sim, você pode exportar relatórios completos em PDF e dados em Excel/CSV." }
      ]
    },
    {
      categoria: "Pesquisas de Mercado",
      perguntas: [
        { p: "Quais filtros estão disponíveis nas pesquisas?", r: "Localização (bairro, logradouro), faixa de valor, período, área e tipologia do imóvel." },
        { p: "Posso salvar minhas pesquisas favoritas?", r: "O histórico de pesquisas é salvo automaticamente para consulta posterior." },
        { p: "Qual o período máximo de dados disponíveis?", r: "Os dados cobrem os últimos 5 anos de transações oficiais registradas." },
        { p: "Como exportar os resultados das pesquisas?", r: "Use os botões de exportação para gerar arquivos CSV ou Excel com todos os dados filtrados." }
      ]
    },
    {
      categoria: "Avaliação Imobiliária",
      perguntas: [
        { p: "Quantas características são avaliadas?", r: "São 26 características divididas em categorias: localização, estrutura, acabamentos e diferenciais." },
        { p: "O que são os cenários pessimista, provável e otimista?", r: "São três estimativas de valor que consideram diferentes condições de mercado e negociação." },
        { p: "Como é calculado o nível de confiança?", r: "Baseado na quantidade de dados de mercado disponíveis e na consistência das características avaliadas." },
        { p: "Posso gerar um laudo em PDF?", r: "Sim, ao final da avaliação você pode gerar um laudo profissional completo em PDF." },
        { p: "As avaliações ficam salvas?", r: "Sim, todas as avaliações são salvas no histórico e podem ser consultadas ou atualizadas posteriormente." }
      ]
    },
    {
      categoria: "Vistoria Digital",
      perguntas: [
        { p: "Qual a diferença entre vistoria de casa e apartamento?", r: "Casas têm checklist com 55+ itens incluindo área externa, enquanto apartamentos têm 50+ itens focados em áreas comuns e privativas." },
        { p: "Como funciona o sistema de scoring?", r: "Cada item é avaliado e recebe uma pontuação que compõe o score geral de conservação do imóvel." },
        { p: "Posso anexar fotos à vistoria?", r: "Sim, você pode registrar fotos para documentar cada item avaliado." },
        { p: "O relatório de vistoria serve como laudo técnico?", r: "O relatório serve como documentação detalhada, mas laudos oficiais requerem profissional habilitado." }
      ]
    },
    {
      categoria: "Documentação",
      perguntas: [
        { p: "Quais documentos são verificados no checklist?", r: "Documentos do imóvel (matrícula, IPTU), do proprietário (RG, CPF) e da transação (contrato, certidões)." },
        { p: "Como funciona o analisador de documentos por IA?", r: "Você faz upload do documento e a IA identifica informações relevantes e possíveis inconsistências." },
        { p: "Posso usar o checklist para qualquer tipo de transação?", r: "Sim, o checklist é adaptável para compra, venda, locação e outras operações imobiliárias." },
        { p: "Os documentos enviados ficam armazenados?", r: "Os documentos são processados temporariamente e não ficam armazenados na plataforma por segurança." }
      ]
    },
    {
      categoria: "Sofia - Assistente IA",
      perguntas: [
        { p: "Que tipo de perguntas posso fazer à Sofia?", r: "Perguntas sobre mercado imobiliário, avaliações, documentação, tendências de preços e dúvidas sobre a plataforma." },
        { p: "A Sofia pode analisar documentos?", r: "Sim, você pode enviar documentos para análise e a Sofia extrairá informações relevantes." },
        { p: "As respostas da Sofia são confiáveis?", r: "A Sofia usa dados atualizados e base de conhecimento especializada, mas recomenda-se validar informações críticas." },
        { p: "Posso usar comandos de voz?", r: "Sim, a Sofia aceita consultas por voz para interação hands-free." }
      ]
    },
    {
      categoria: "Recursos Administrativos",
      perguntas: [
        { p: "Como gerenciar leads capturados?", r: "Acesse a seção Leads para visualizar, filtrar e acompanhar o status de cada prospect." },
        { p: "Quem pode acessar o calibrador de avaliação?", r: "Apenas administradores têm acesso para ajustar pesos e fatores do sistema de avaliação." },
        { p: "Como adicionar novos usuários?", r: "Administradores podem convidar novos usuários na seção Gerenciar Usuários." },
        { p: "O que é rastreado no log de atividades?", r: "Logins, avaliações realizadas, vistorias, pesquisas, exportações e outras ações na plataforma." }
      ]
    },
    {
      categoria: "Suporte e Ajuda",
      perguntas: [
        { p: "Como entrar em contato com o suporte?", r: "Envie email para contato@godoyprime.com.br ou use o chat da Sofia para dúvidas rápidas." },
        { p: "Existe treinamento disponível?", r: "Sim, oferecemos onboarding interativo, tours guiados em cada página e manual completo em PDF." },
        { p: "Como reportar um bug ou erro?", r: "Entre em contato pelo email de suporte descrevendo o problema e os passos para reproduzi-lo." },
        { p: "Há atualizações frequentes na plataforma?", r: "Sim, a plataforma recebe atualizações regulares com melhorias e novas funcionalidades." }
      ]
    },
    {
      categoria: "Dicas de Uso",
      perguntas: [
        { p: "Qual a melhor forma de começar a usar a plataforma?", r: "Complete o onboarding, explore o dashboard e faça uma avaliação teste para conhecer o fluxo." },
        { p: "Como obter avaliações mais precisas?", r: "Preencha todas as 26 características com atenção e use dados de mercado atualizados como referência." },
        { p: "Posso usar a plataforma offline?", r: "Não, é necessária conexão com internet para acessar dados em tempo real e funcionalidades da IA." },
        { p: "Devo atualizar minhas avaliações periodicamente?", r: "Sim, recomendamos revisar avaliações a cada 3-6 meses ou quando houver mudanças significativas no mercado." }
      ]
    }
  ]
};

export function exportManualPDF() {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Cover page
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setTextColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME', pageWidth / 2, 100, { align: 'center' });
  doc.text('ANALYTICS', pageWidth / 2, 115, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Manual do Usuário', pageWidth / 2, 140, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text('Plataforma de Inteligência Imobiliária', pageWidth / 2, 160, { align: 'center' });
  
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Versão 1.0 - ${today}`, pageWidth / 2, 250, { align: 'center' });

  // Introduction page
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, manualContent.introducao.titulo, y, marginLeft);
  y += 5;
  
  doc.setFontSize(11);
  doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
  const introLines = doc.splitTextToSize(manualContent.introducao.texto, contentWidth);
  doc.text(introLines, marginLeft, y);
  y += introLines.length * 6 + 15;

  // Table of contents
  y = drawSectionTitle(doc, 'Índice', y, marginLeft);
  y += 5;
  
  doc.setFontSize(10);
  manualContent.modulos.forEach((modulo) => {
    doc.text(`${modulo.titulo}`, marginLeft + 5, y);
    y += 6;
  });
  y += 5;
  doc.text('9. Recursos Adicionais', marginLeft + 5, y);
  y += 6;
  doc.text('10. Perguntas Frequentes (FAQ)', marginLeft + 5, y);

  // Module pages
  manualContent.modulos.forEach((modulo) => {
    doc.addPage();
    y = drawGodoyHeader(doc, 'Manual do Usuário');
    
    // Module title
    y = drawSectionTitle(doc, modulo.titulo, y, marginLeft);
    y += 5;
    
    // Description
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    const descLines = doc.splitTextToSize(modulo.descricao, contentWidth);
    doc.text(descLines, marginLeft, y);
    y += descLines.length * 6 + 10;
    
    // Features
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text('Funcionalidades:', marginLeft, y);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    modulo.funcionalidades.forEach((func) => {
      doc.setFillColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
      doc.circle(marginLeft + 3, y - 1.5, 1.5, 'F');
      const funcLines = doc.splitTextToSize(func, contentWidth - 10);
      doc.text(funcLines, marginLeft + 8, y);
      y += funcLines.length * 5 + 3;
    });
    
    y += 10;
    
    // Benefits
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(marginLeft, y, contentWidth, 25, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text('Benefício:', marginLeft + 5, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    const benefitLines = doc.splitTextToSize(modulo.beneficios, contentWidth - 15);
    doc.text(benefitLines, marginLeft + 5, y + 16);
  });

  // Additional resources page
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, '9. Recursos Adicionais', y, marginLeft);
  y += 10;
  
  manualContent.recursosAdicionais.forEach((recurso) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text(recurso.titulo, marginLeft, y);
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    const descLines = doc.splitTextToSize(recurso.descricao, contentWidth);
    doc.text(descLines, marginLeft, y);
    y += descLines.length * 5 + 10;
  });

  // FAQ Section
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, '10. Perguntas Frequentes (FAQ)', y, marginLeft);
  y += 10;

  manualContent.faq.forEach((categoria) => {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = drawGodoyHeader(doc, 'Manual do Usuário');
      y += 10;
    }

    // Category title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text(categoria.categoria, marginLeft, y);
    y += 8;

    categoria.perguntas.forEach((faq) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = drawGodoyHeader(doc, 'Manual do Usuário');
        y += 10;
      }

      // Question
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
      const questionLines = doc.splitTextToSize(`P: ${faq.p}`, contentWidth - 5);
      doc.text(questionLines, marginLeft + 5, y);
      y += questionLines.length * 4 + 2;

      // Answer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const answerLines = doc.splitTextToSize(`R: ${faq.r}`, contentWidth - 5);
      doc.text(answerLines, marginLeft + 5, y);
      y += answerLines.length * 4 + 6;
    });

    y += 5;
  });

  // Support section
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, 'Suporte e Contato', y, marginLeft);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
  doc.text('Para dúvidas ou sugestões, entre em contato:', marginLeft, y);
  y += 8;
  doc.text('Email: contato@godoyprime.com.br', marginLeft + 5, y);
  y += 6;
  doc.text('Telefone: (21) 99999-9999', marginLeft + 5, y);
  y += 6;
  doc.text('Site: www.godoyprime.com.br', marginLeft + 5, y);

  // Apply footers
  applyFootersToAllPages(doc);

  // Save
  doc.save('Manual_Godoy_Prime_Analytics.pdf');
}
