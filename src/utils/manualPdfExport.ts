import jsPDF from 'jspdf';
import { drawGodoyHeader, drawGodoyFooter, drawSectionTitle, BRAND_COLORS, applyFootersToAllPages } from './pdfTemplate';

const manualContent = {
  introducao: {
    titulo: "Introdução",
    texto: "O Godoy Prime Analytics é uma plataforma completa de inteligência imobiliária desenvolvida para corretores, avaliadores e gestores do mercado imobiliário da Barra da Tijuca. A ferramenta oferece análise de dados, avaliações automatizadas, vistorias digitais e assistência por inteligência artificial."
  },
  modulos: [
    {
      titulo: "1. Dashboard Principal",
      descricao: "Visão geral do mercado imobiliário com indicadores em tempo real.",
      funcionalidades: [
        "KPIs Principais: Mediana, média e volume de transações por m²",
        "Gráfico de Evolução: Visualização temporal dos preços",
        "Ranking de Microbairros: Comparativo entre regiões",
        "Seletor de Bairro: Filtro para segmentar análises",
        "Exportação: Relatórios em PDF e Excel"
      ],
      beneficios: "Permite tomada de decisão rápida baseada em dados atualizados do mercado."
    },
    {
      titulo: "2. Microregiões",
      descricao: "Análise detalhada por logradouro e condomínio.",
      funcionalidades: [
        "Pesquisa por Logradouro: Busca inteligente com sugestões",
        "Análise de Condomínios: Dados específicos por empreendimento",
        "Separação por Tipologia: Casas vs Apartamentos",
        "Indicadores de Tendência: Variação de preços",
        "Gráfico de Evolução: Histórico por rua"
      ],
      beneficios: "Identifica oportunidades em micro-mercados específicos."
    },
    {
      titulo: "3. Pesquisas de Mercado",
      descricao: "Ferramenta avançada de busca de transações.",
      funcionalidades: [
        "Filtros por Localização: Bairro, logradouro, número",
        "Filtros por Valor: Faixa de preço total e por m²",
        "Filtros por Período: Intervalo de datas",
        "Filtros por Área: Metragem mínima e máxima",
        "Exportação: CSV e Excel com dados completos"
      ],
      beneficios: "Fundamenta avaliações com comparativos de mercado confiáveis."
    },
    {
      titulo: "4. Avaliação Imobiliária",
      descricao: "Sistema de avaliação automatizado em 6 etapas.",
      funcionalidades: [
        "Etapa 1 - Identificação: Dados do proprietário e objetivo",
        "Etapa 2 - Localização: Endereço e tipologia",
        "Etapa 3 - Dados Básicos: Área, quartos, vagas",
        "Etapa 4 - Questionário: 26 características avaliadas",
        "Etapa 5 - Resultados: Valores pessimista, provável e otimista",
        "Etapa 6 - Recomendação: Estratégia de precificação"
      ],
      beneficios: "Produz avaliações profissionais com metodologia consistente."
    },
    {
      titulo: "5. Vistoria Digital",
      descricao: "Checklist completo para inspeção técnica de imóveis.",
      funcionalidades: [
        "55+ Itens para Casas: Cobertura completa",
        "50+ Itens para Apartamentos: Itens específicos",
        "Sistema de Scoring: Pontuação de conservação",
        "Registro Fotográfico: Documentação visual",
        "Relatório PDF: Laudo técnico detalhado"
      ],
      beneficios: "Padroniza vistorias e reduz riscos em transações."
    },
    {
      titulo: "6. Documentação",
      descricao: "Checklist de due diligence para transações.",
      funcionalidades: [
        "Checklist de Documentos: Lista completa por tipo",
        "Analisador de Documentos: Análise por IA",
        "Status de Verificação: Acompanhamento visual",
        "Alertas de Pendências: Notificações automáticas",
        "Exportação PDF: Relatório de due diligence"
      ],
      beneficios: "Garante segurança jurídica nas transações."
    },
    {
      titulo: "7. Sofia - Assistente IA",
      descricao: "Assistente virtual inteligente para consultas.",
      funcionalidades: [
        "Chat em Tempo Real: Respostas instantâneas",
        "Consultas por Voz: Interação hands-free",
        "Análise de Documentos: Upload e interpretação",
        "Sugestões Inteligentes: Recomendações contextuais",
        "Base de Conhecimento: Informações especializadas"
      ],
      beneficios: "Acelera consultas e fornece insights especializados."
    },
    {
      titulo: "8. Recursos Administrativos",
      descricao: "Ferramentas de gestão e configuração.",
      funcionalidades: [
        "Base de Conhecimento: Gerenciar conteúdo da IA",
        "Calibrador de Avaliação: Ajustar pesos e fatores",
        "Gestão de Leads: Acompanhar prospects",
        "Gerenciamento de Usuários: Controle de acessos",
        "Rastreamento de Atividades: Auditoria de uso"
      ],
      beneficios: "Permite personalização e controle da plataforma."
    }
  ],
  recursosAdicionais: [
    {
      titulo: "Tours Guiados",
      descricao: "Tutoriais interativos em cada página, ativados automaticamente na primeira visita."
    },
    {
      titulo: "Exportações",
      descricao: "Suporte a PDF, Excel e CSV para todos os relatórios e pesquisas."
    },
    {
      titulo: "Responsividade",
      descricao: "Interface adaptada para desktop, tablet e smartphone."
    }
  ]
};

export function exportManualPDF() {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Cover page
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
  
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
  manualContent.modulos.forEach((modulo, index) => {
    doc.text(`${modulo.titulo}`, marginLeft + 5, y);
    y += 6;
  });
  y += 5;
  doc.text('9. Recursos Adicionais', marginLeft + 5, y);

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

  // Support section
  y += 10;
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
