import jsPDF from 'jspdf';

const BRAND_COLORS = {
  navy: [12, 35, 64] as [number, number, number],
  gold: [212, 175, 55] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [245, 245, 245] as [number, number, number],
  gray: [128, 128, 128] as [number, number, number],
};

interface ChecklistSection {
  title: string;
  items: string[];
}

const checklistSections: ChecklistSection[] = [
  {
    title: "1. DASHBOARD - KPIs (4 cards)",
    items: [
      "[ ] Preço Médio R$/m² exibe valor correto (últimos 12 meses, Residencial)",
      "[ ] Liquidez Acumulado mostra total de transações",
      "[ ] Variação Mensal calcula % corretamente",
      "[ ] Bairro Mais Valorizado indica maior R$/m²",
      "[ ] KPIs responsivos (1 col mobile, 2 tablet, 4 desktop)",
      "[ ] BairroSelector altera todos os KPIs dinamicamente",
    ]
  },
  {
    title: "2. GRÁFICO DE EVOLUÇÃO GERAL",
    items: [
      "[ ] Toggle Semestral/Anual funciona",
      "[ ] Indicadores de tendência (curto e longo prazo) exibem %",
      "[ ] Tooltip mostra valor formatado R$",
      "[ ] Eixo Y formatado em milhares (k)",
      "[ ] Dados desde 2020",
    ]
  },
  {
    title: "3. RANKING DE MICROBAIRROS (✅ alterado)",
    items: [
      "[ ] Toggle R$/m² / Trans. alterna métricas",
      "[ ] Título dinâmico: 'Ranking por Valorização' ou 'Ranking por Liquidez'",
      "[ ] Subtítulo dinâmico: 'Preço médio R$/m²' ou 'Total de transações'",
      "[ ] Período exibe últimos 12 meses corretamente",
      "[ ] Ordenação correta por métrica selecionada",
      "[ ] Valor primário/secundário alternados",
      "[ ] Barra de progresso proporcional",
      "[ ] 8 microbairros listados (sem 'Outros')",
      "[ ] Funciona com diferentes bairros no BairroSelector",
    ]
  },
  {
    title: "4. GRÁFICO EVOLUÇÃO POR MICROBAIRRO (✅ alterado)",
    items: [
      "[ ] Toggle R$/m² / Trans. alterna métricas",
      "[ ] Toggle Semestral/Anual funciona",
      "[ ] Título dinâmico: 'Evolução R$/m²' ou 'Evolução Liquidez'",
      "[ ] Subtítulo dinâmico conforme seleção",
      "[ ] Liquidez acumulada desde Jan/2020",
      "[ ] 8 linhas com cores distintas",
      "[ ] Legenda clicável (mostrar/ocultar linhas)",
      "[ ] Tooltip com valores formatados",
      "[ ] Eixo Y formatado corretamente",
    ]
  },
  {
    title: "5. FERRAMENTAS DE BUSCA - ABA LOCALIZAÇÃO",
    items: [
      "[ ] Autocomplete de logradouro funciona (min 2 chars)",
      "[ ] Filtros: Período, Tipologia, Área, Valor",
      "[ ] Tipologia condicional à Finalidade",
      "[ ] Resultados em tabela com estatísticas",
      "[ ] Histórico de buscas (últimas 5)",
      "[ ] Botão Limpar Filtros funciona",
    ]
  },
  {
    title: "6. FERRAMENTAS DE BUSCA - ABA TRANSAÇÕES",
    items: [
      "[ ] Filtros de valor (dropdowns predefinidos)",
      "[ ] Filtros de área funcionam",
      "[ ] Resultados mostram microbairros com liquidez",
    ]
  },
  {
    title: "7. MOTOR DE AVALIAÇÃO (5 etapas)",
    items: [
      "[ ] Etapa 1: Seleção de logradouro com dados ITBI",
      "[ ] Etapa 1: Entrada manual de preço anúncios",
      "[ ] Etapa 2: Área e seleção de base de preço",
      "[ ] Etapa 3: 26 características em 5 abas",
      "[ ] Etapa 3: Preview em tempo real",
      "[ ] Etapa 4: 3 cenários (pessimista/provável/otimista)",
      "[ ] Etapa 4: Spread % e nível de confiança",
      "[ ] Etapa 5: Recomendação automática",
      "[ ] Etapa 5: Exportar PDF funciona",
    ]
  },
  {
    title: "8. PESQUISA AVANÇADA",
    items: [
      "[ ] Filtros: Valor, Área, Ano, Bairro, Logradouro",
      "[ ] Resultados em tabela paginada",
      "[ ] Exportar XLSX funciona",
      "[ ] Totalizadores corretos",
    ]
  },
  {
    title: "9. VISTORIA DIGITAL",
    items: [
      "[ ] 21 itens de inspeção organizados",
      "[ ] Status: Ok / Atenção / Crítico / N.V. / N/A",
      "[ ] Tooltips explicativos",
      "[ ] Barra de progresso %",
      "[ ] Persistência localStorage",
      "[ ] Captura de fotos funciona",
      "[ ] Gerar PDF de laudo",
      "[ ] Botão Limpar funciona",
      "[ ] Gerar Avaliação navega para Motor",
    ]
  },
  {
    title: "10. DOCUMENTAÇÃO (DUE DILIGENCE)",
    items: [
      "[ ] Seção Vendedor: Dados e Documentos",
      "[ ] Seção Comprador: Dados e Documentos",
      "[ ] Campos condicionais (Empresário, União Estável)",
      "[ ] Checkboxes de verificação",
      "[ ] Barra de progresso %",
      "[ ] Persistência localStorage",
      "[ ] Exportar PDF funciona",
      "[ ] Botão Limpar funciona",
    ]
  },
  {
    title: "11. EXPORTAÇÕES",
    items: [
      "[ ] Dashboard: Exportar XLSX (KPIs + Transações)",
      "[ ] Dashboard: Backup Completo XLSX",
      "[ ] Pesquisa Avançada: XLSX",
      "[ ] Vistoria Digital: PDF Laudo",
      "[ ] Documentação: PDF Checklist",
      "[ ] Motor Avaliação: PDF Parecer",
    ]
  },
  {
    title: "12. NAVEGAÇÃO E UI",
    items: [
      "[ ] Sidebar desktop funciona",
      "[ ] Menu hamburger mobile funciona",
      "[ ] Logo Godoy Prime visível",
      "[ ] Footer com informações de contato",
      "[ ] Responsividade geral (mobile/tablet/desktop)",
      "[ ] Tour guiado (se disponível)",
    ]
  },
  {
    title: "13. DISCLAIMER E METODOLOGIA",
    items: [
      "[ ] Disclaimer legal visível no Dashboard",
      "[ ] Tooltip metodologia expandível",
      "[ ] Texto correto sobre fonte oficial",
    ]
  },
  {
    title: "14. SINCRONIZAÇÃO (ADMIN)",
    items: [
      "[ ] Botão 'Atualizar Dados' visível",
      "[ ] Seletor de ano funciona",
      "[ ] Feedback de sincronização",
    ]
  },
  {
    title: "15. PWA (PROGRESSIVE WEB APP)",
    items: [
      "[ ] Instalação mobile funciona",
      "[ ] Ícone correto na home screen",
      "[ ] Modo standalone abre corretamente",
    ]
  },
];

export function generateTestChecklistPDF() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Header
  doc.setFillColor(...BRAND_COLORS.navy);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(...BRAND_COLORS.gold);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME ANALYTICS', pageWidth / 2, 15, { align: 'center' });
  
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(14);
  doc.text('Checklist de Testes - Validação Completa', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${today}`, pageWidth / 2, 32, { align: 'center' });

  y = 45;

  // Instructions
  doc.setTextColor(...BRAND_COLORS.navy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Marque [ ] para cada item testado. ✅ indica funcionalidades alteradas recentemente.', marginLeft, y);
  y += 10;

  // Sections
  checklistSections.forEach((section) => {
    // Check if we need a new page
    const sectionHeight = 8 + (section.items.length * 5.5);
    if (y + sectionHeight > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }

    // Section title
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(marginLeft, y - 4, contentWidth, 7, 'F');
    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, marginLeft + 3, y + 1);
    y += 8;

    // Items
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    section.items.forEach((item) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(item, marginLeft + 2, y);
      y += 5.5;
    });

    y += 4;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND_COLORS.lightGray);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('GODOY PRIME REALTY - CRECI 11841 PJ', pageWidth / 2, pageHeight - 4, { align: 'center' });
  }

  // Notes section on last page
  doc.setPage(totalPages);
  const notesY = y + 10;
  if (notesY < pageHeight - 50) {
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', marginLeft, notesY);
    
    doc.setDrawColor(...BRAND_COLORS.gray);
    for (let i = 0; i < 4; i++) {
      doc.line(marginLeft, notesY + 8 + (i * 8), pageWidth - marginRight, notesY + 8 + (i * 8));
    }
  }

  doc.save('checklist-testes-godoy-prime.pdf');
}
