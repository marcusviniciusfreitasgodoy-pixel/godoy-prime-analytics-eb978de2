// Dashboard export utilities - complete export with KPIs, rankings, and evolution data
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { KPIStatsData } from '@/hooks/useKPIStats';
import {
  BRAND_COLORS,
  drawGodoyHeader,
  drawSectionTitle,
  applyFootersToAllPages,
  getMaxContentY,
} from './pdfTemplate';

export interface MicrobairroRankingData {
  microbairro: string;
  preco_medio_m2: number;
  total_transacoes: number;
}

export interface EvolutionDataItem {
  mes: string;
  geral: number;
  apartamento: number;
  casa: number;
  variacao: number;
}

interface DashboardExportData {
  bairro: string;
  kpis: KPIStatsData | null;
  ranking: MicrobairroRankingData[];
  evolution: EvolutionDataItem[];
  granularity: 'semester' | 'annual';
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: string | number): string => {
  if (value === 'N/A') return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

// Export Dashboard to XLSX with all data
export function exportDashboardXLSX(data: DashboardExportData) {
  const { bairro, kpis, ranking, evolution, granularity } = data;
  const workbook = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];
  
  // ============ ABA 1: RESUMO EXECUTIVO ============
  const summaryRows: any[][] = [];
  summaryRows.push(['RELATÓRIO DE INTELIGÊNCIA IMOBILIÁRIA']);
  summaryRows.push([`Godoy Prime Realty - ${bairro}`]);
  summaryRows.push([`Gerado em ${new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })}`]);
  summaryRows.push([]);
  
  // KPIs
  if (kpis) {
    summaryRows.push(['═══════════════════════════════════════════════════════════════']);
    summaryRows.push(['INDICADORES DE MERCADO (KPIs) - Últimos 12 Meses']);
    summaryRows.push(['═══════════════════════════════════════════════════════════════']);
    summaryRows.push([]);
    
    summaryRows.push(['PREÇO MÉDIO POR M²']);
    summaryRows.push(['Geral', formatCurrency(kpis.precoMedio)]);
    summaryRows.push(['Apartamentos', formatCurrency(kpis.precoMedioApt)]);
    summaryRows.push(['Casas', formatCurrency(kpis.precoMedioCasa)]);
    summaryRows.push([]);
    
    summaryRows.push(['LIQUIDEZ (Volume de Transações)']);
    summaryRows.push(['Total', kpis.liquidez.toLocaleString('pt-BR')]);
    summaryRows.push(['Apartamentos', kpis.liquidezApt.toLocaleString('pt-BR')]);
    summaryRows.push(['Casas', kpis.liquidezCasa.toLocaleString('pt-BR')]);
    summaryRows.push([]);
    
    summaryRows.push(['VARIAÇÃO ANUAL (YoY)']);
    summaryRows.push(['Geral', formatPercent(kpis.variacaoAnual)]);
    summaryRows.push(['Apartamentos', formatPercent(kpis.variacaoAnualApt)]);
    summaryRows.push(['Casas', formatPercent(kpis.variacaoAnualCasa)]);
    summaryRows.push([]);
    
    summaryRows.push(['VARIAÇÃO MENSAL', formatPercent(kpis.variacaoMensal), `(${kpis.mesReferencia})`]);
    summaryRows.push([]);
    
    summaryRows.push(['MICROBAIRRO MAIS VALORIZADO']);
    summaryRows.push(['Nome', kpis.bairroMaisValorizado]);
    summaryRows.push(['Preço Médio (Apt)', formatCurrency(kpis.precoMedioBairroApt)]);
    summaryRows.push(['Preço Médio (Casa)', formatCurrency(kpis.precoMedioBairroCasa)]);
  }
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Executivo');
  
  // ============ ABA 2: RANKING MICROBAIRROS ============
  if (ranking && ranking.length > 0) {
    const rankingRows: any[][] = [];
    rankingRows.push(['RANKING DE MICROBAIRROS POR PREÇO MÉDIO']);
    rankingRows.push([`Região: ${bairro}`]);
    rankingRows.push([]);
    rankingRows.push(['#', 'Microbairro', 'Preço Médio (R$/m²)', 'Volume Transações']);
    
    ranking.forEach((item, index) => {
      rankingRows.push([
        index + 1,
        item.microbairro || 'N/A',
        formatCurrency(item.preco_medio_m2 || 0),
        (item.total_transacoes || 0).toLocaleString('pt-BR')
      ]);
    });
    
    const rankingSheet = XLSX.utils.aoa_to_sheet(rankingRows);
    rankingSheet['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, rankingSheet, 'Ranking Microbairros');
  }
  
  // ============ ABA 3: EVOLUÇÃO HISTÓRICA ============
  if (evolution && evolution.length > 0) {
    const evolutionRows: any[][] = [];
    evolutionRows.push([`EVOLUÇÃO HISTÓRICA DE PREÇOS (${granularity === 'semester' ? 'Semestral' : 'Anual'})`]);
    evolutionRows.push([`Região: ${bairro}`]);
    evolutionRows.push([]);
    evolutionRows.push(['Período', 'Preço Geral (R$/m²)', 'Apartamentos (R$/m²)', 'Casas (R$/m²)', 'Variação (%)']);
    
    evolution.forEach(item => {
      evolutionRows.push([
        item.mes,
        formatCurrency(item.geral),
        formatCurrency(item.apartamento),
        formatCurrency(item.casa),
        formatPercent(item.variacao)
      ]);
    });
    
    const evolutionSheet = XLSX.utils.aoa_to_sheet(evolutionRows);
    evolutionSheet['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, evolutionSheet, 'Evolução Histórica');
  }
  
  // ============ ABA 4: METODOLOGIA ============
  const methodologyRows = [
    ['METODOLOGIA E FONTES DE DADOS'],
    [],
    ['Fonte dos Dados'],
    ['Os dados apresentados neste relatório são provenientes do sistema ITBI (Imposto sobre Transmissão de Bens Imóveis) da Prefeitura do Rio de Janeiro.'],
    [],
    ['Critérios de Filtragem'],
    ['• Percentual de transferência ≥ 90%'],
    ['• Uso: Residencial'],
    ['• Valor por m² válido (não nulo)'],
    [],
    ['Metodologia de Cálculo - KPIs'],
    ['• Preço Médio: Média ponderada pelo número de transações de cada registro agregado'],
    ['• Liquidez: Soma total de transações reais no período (últimos 12 meses)'],
    ['• Variação Anual: Comparação entre período atual e mesmo período do ano anterior'],
    ['• Variação Mensal: Comparação entre os dois últimos meses com dados disponíveis'],
    [],
    ['Metodologia de Cálculo - Evolução'],
    ['• Agrupamento por semestre ou ano conforme seleção'],
    ['• Médias calculadas para cada tipologia separadamente'],
    ['• Variação calculada em relação ao período anterior'],
    [],
    ['Limitações'],
    ['• Os dados representam transações agregadas por logradouro e período'],
    ['• Valores podem incluir outliers que não foram removidos'],
    ['• Esta ferramenta é de referência estatística e não substitui laudo PTAM'],
    [],
    ['Contato'],
    ['Godoy Prime Realty - CRECI 11841-PJ'],
    ['Tel: 21. 96407 5124'],
    ['Av. das Américas 10101 Bloco 2, Sala 316, Barra da Tijuca, RJ'],
  ];
  
  const methodologySheet = XLSX.utils.aoa_to_sheet(methodologyRows);
  methodologySheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, methodologySheet, 'Metodologia');
  
  // Gerar arquivo
  XLSX.writeFile(workbook, `relatorio_dashboard_${bairro.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// Export Dashboard to PDF
export function exportDashboardPDF(data: DashboardExportData) {
  const { bairro, kpis, ranking, evolution, granularity } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 15;
  
  // Header
  let y = drawGodoyHeader(doc, `Relatório de Inteligência Imobiliária - ${bairro}`);
  
  // KPIs Section
  if (kpis) {
    y = drawSectionTitle(doc, 'Indicadores de Mercado (KPIs)', y, marginLeft);
    
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_COLORS.gray);
    
    // KPI Grid - 2 columns
    const col1X = marginLeft + 5;
    const col2X = 110;
    
    // Preço Médio
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Preço Médio por m²', col1X, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    y += 6;
    doc.text(`Geral: ${formatCurrency(kpis.precoMedio)}`, col1X, y);
    doc.text(`Apt: ${formatCurrency(kpis.precoMedioApt)}  |  Casa: ${formatCurrency(kpis.precoMedioCasa)}`, col1X, y + 5);
    
    // Liquidez
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Liquidez (Volume)', col2X, y - 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(`Total: ${kpis.liquidez.toLocaleString('pt-BR')} transações`, col2X, y);
    doc.text(`Apt: ${kpis.liquidezApt.toLocaleString('pt-BR')}  |  Casa: ${kpis.liquidezCasa.toLocaleString('pt-BR')}`, col2X, y + 5);
    
    y += 18;
    
    // Variação Anual
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Variação Anual (YoY)', col1X, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    y += 6;
    doc.text(`Geral: ${formatPercent(kpis.variacaoAnual)}`, col1X, y);
    doc.text(`Apt: ${formatPercent(kpis.variacaoAnualApt)}  |  Casa: ${formatPercent(kpis.variacaoAnualCasa)}`, col1X, y + 5);
    
    // Bairro Mais Valorizado
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Microbairro Mais Valorizado', col2X, y - 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    doc.text(kpis.bairroMaisValorizado, col2X, y);
    doc.text(`Apt: ${formatCurrency(kpis.precoMedioBairroApt)}  |  Casa: ${formatCurrency(kpis.precoMedioBairroCasa)}`, col2X, y + 5);
    
    y += 20;
  }
  
  // Ranking Section
  if (ranking && ranking.length > 0) {
    y = drawSectionTitle(doc, 'Ranking de Microbairros', y, marginLeft);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('#', marginLeft + 5, y);
    doc.text('Microbairro', marginLeft + 15, y);
    doc.text('Preço Médio (R$/m²)', 100, y);
    doc.text('Volume', 160, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    
    const maxItems = Math.min(ranking.length, 8);
    for (let i = 0; i < maxItems; i++) {
      const item = ranking[i];
      doc.text(`${i + 1}`, marginLeft + 5, y);
      doc.text(item.microbairro || 'N/A', marginLeft + 15, y);
      doc.text(formatCurrency(item.preco_medio_m2 || 0), 100, y);
      doc.text((item.total_transacoes || 0).toLocaleString('pt-BR'), 160, y);
      y += 5;
    }
    
    y += 8;
  }
  
  // Evolution Section (if space available)
  if (evolution && evolution.length > 0 && y < 200) {
    y = drawSectionTitle(doc, `Evolução Histórica (${granularity === 'semester' ? 'Semestral' : 'Anual'})`, y, marginLeft);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.navy);
    doc.text('Período', marginLeft + 5, y);
    doc.text('Geral', 55, y);
    doc.text('Apartamentos', 95, y);
    doc.text('Casas', 140, y);
    doc.text('Variação', 175, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.gray);
    
    const recentEvolution = evolution.slice(-8);
    for (const item of recentEvolution) {
      if (y > getMaxContentY()) break;
      doc.text(item.mes, marginLeft + 5, y);
      doc.text(formatCurrency(item.geral), 55, y);
      doc.text(formatCurrency(item.apartamento), 95, y);
      doc.text(formatCurrency(item.casa), 140, y);
      doc.text(formatPercent(item.variacao), 175, y);
      y += 5;
    }
  }
  
  // Apply footers to all pages
  applyFootersToAllPages(doc);
  
  // Save
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`relatorio_dashboard_${bairro.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.pdf`);
}
