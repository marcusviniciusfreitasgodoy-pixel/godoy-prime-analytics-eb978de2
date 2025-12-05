// Utility functions for exporting data
import * as XLSX from 'xlsx';

// Godoy Prime brand colors
const BRAND_COLORS = {
  navy: '0C2340',
  gold: 'D4AF37',
  white: 'FFFFFF',
  lightGray: 'F5F5F5',
};

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value.toLocaleString('pt-BR');
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(';')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ExportXLSXOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  filters?: Record<string, string>;
  data: Record<string, any>[];
  columns?: { key: string; header: string; width?: number; format?: 'currency' | 'number' | 'date' | 'text' }[];
  summary?: { label: string; value: string | number }[];
}

export function exportToXLSX(options: ExportXLSXOptions) {
  const { filename, title, subtitle, filters, data, columns, summary } = options;
  
  if (data.length === 0) return;

  const workbook = XLSX.utils.book_new();
  
  // ============ ABA 1: RESUMO ============
  const summaryRows: any[][] = [];
  
  // Header com título
  summaryRows.push([title || 'Relatório Godoy Prime Analytics']);
  summaryRows.push([subtitle || `Gerado em ${new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`]);
  summaryRows.push([]); // Linha vazia
  
  // Filtros aplicados
  if (filters && Object.keys(filters).length > 0) {
    summaryRows.push(['FILTROS APLICADOS']);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        summaryRows.push([key, value]);
      }
    });
    summaryRows.push([]);
  }
  
  // Estatísticas resumidas
  if (summary && summary.length > 0) {
    summaryRows.push(['ESTATÍSTICAS']);
    summary.forEach(({ label, value }) => {
      summaryRows.push([label, typeof value === 'number' ? formatCurrencyNumber(value) : value]);
    });
    summaryRows.push([]);
  }
  
  // Info do relatório
  summaryRows.push(['INFORMAÇÕES DO RELATÓRIO']);
  summaryRows.push(['Total de Registros', data.length.toString()]);
  summaryRows.push(['Fonte de Dados', 'ITBI - Prefeitura do Rio de Janeiro']);
  summaryRows.push(['Data de Geração', new Date().toLocaleString('pt-BR')]);
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  
  // Definir largura das colunas do resumo
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  
  // ============ ABA 2: DADOS ============
  const dataColumns = columns || Object.keys(data[0]).map(key => ({ 
    key, 
    header: key, 
    width: 15 
  }));
  
  // Preparar dados formatados
  const formattedData = data.map((row, idx) => {
    const formattedRow: Record<string, any> = { '#': idx + 1 };
    dataColumns.forEach(col => {
      const value = row[col.key];
      if (col.format === 'currency' && typeof value === 'number') {
        formattedRow[col.header] = formatCurrencyNumber(value);
      } else if (col.format === 'number' && typeof value === 'number') {
        formattedRow[col.header] = value.toLocaleString('pt-BR');
      } else if (col.format === 'date' && value) {
        formattedRow[col.header] = new Date(value).toLocaleDateString('pt-BR');
      } else {
        formattedRow[col.header] = value ?? '';
      }
    });
    return formattedRow;
  });
  
  const dataSheet = XLSX.utils.json_to_sheet(formattedData);
  
  // Definir largura das colunas
  const colWidths = [{ wch: 5 }, ...dataColumns.map(col => ({ wch: col.width || 15 }))];
  dataSheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Transações');
  
  // ============ ABA 3: METODOLOGIA ============
  const methodologyRows = [
    ['METODOLOGIA E FONTES DE DADOS'],
    [],
    ['Fonte dos Dados'],
    ['Os dados apresentados neste relatório são provenientes do sistema ITBI (Imposto sobre Transmissão de Bens Imóveis) da Prefeitura do Rio de Janeiro.'],
    [],
    ['IMPORTANTE: Dados Agregados'],
    ['Cada registro (linha) representa dados AGREGADOS por logradouro e período mensal, NÃO transações individuais.'],
    ['A coluna "Transações" indica quantas transações reais compõem cada agregação.'],
    ['Exemplo: Um registro com "12" na coluna Transações representa a média de 12 transações reais naquele logradouro/mês.'],
    [],
    ['Critérios de Filtragem'],
    ['• Percentual de transferência ≥ 90%'],
    ['• Uso: Residencial'],
    ['• Valor por m² válido (não nulo)'],
    [],
    ['Metodologia de Cálculo'],
    ['• Valor Médio: Média dos valores de transação por agregação'],
    ['• Total de Transações Reais: Soma da coluna "Transações" (representa o número real de transações)'],
    ['• Média R$/m²: Média ponderada do valor por metro quadrado'],
    [],
    ['Limitações'],
    ['• Os dados representam transações agregadas por logradouro e período'],
    ['• Valores podem incluir outliers que não foram removidos'],
    ['• Esta ferramenta é de referência estatística e não substitui laudo PTAM'],
    [],
    ['Contato'],
    ['Godoy Prime Analytics'],
    ['Especialistas em Inteligência Imobiliária'],
  ];
  
  const methodologySheet = XLSX.utils.aoa_to_sheet(methodologyRows);
  methodologySheet['!cols'] = [{ wch: 100 }];
  
  XLSX.utils.book_append_sheet(workbook, methodologySheet, 'Metodologia');
  
  // Gerar arquivo
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}

function formatCurrencyNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return formatCurrencyNumber(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// PDF Export for Advanced Search Report
interface ExportPDFOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  filters?: Record<string, string>;
  data: Record<string, any>[];
  columns?: { key: string; header: string }[];
  summary?: { label: string; value: string | number }[];
}

export async function exportToPDF(options: ExportPDFOptions) {
  const { jsPDF } = await import('jspdf');
  const { filename, title, subtitle, filters, data, columns, summary } = options;
  
  if (data.length === 0) return;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Header
  doc.setFillColor(12, 35, 64); // Navy
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Relatório Godoy Prime Analytics', 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle || `Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
  
  yPos = 45;
  doc.setTextColor(0, 0, 0);
  
  // Filters section
  if (filters && Object.keys(filters).length > 0) {
    doc.setFillColor(245, 245, 245);
    doc.rect(10, yPos - 5, pageWidth - 20, 8 + Object.keys(filters).length * 6, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 35, 64);
    doc.text('Filtros Aplicados:', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        doc.text(`${key}: ${value}`, 18, yPos);
        yPos += 5;
      }
    });
    yPos += 8;
  }
  
  // Summary section
  if (summary && summary.length > 0) {
    doc.setFillColor(212, 175, 55); // Gold
    doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 35, 64);
    doc.text('Resumo Estatístico', 14, yPos + 3);
    yPos += 12;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    summary.forEach(({ label, value }) => {
      const formattedValue = typeof value === 'number' ? formatCurrencyNumber(value) : String(value);
      doc.text(`${label}: ${formattedValue}`, 14, yPos);
      yPos += 6;
    });
    yPos += 8;
  }
  
  // Table header
  const dataColumns = columns || Object.keys(data[0]).slice(0, 6).map(key => ({ key, header: key }));
  const colWidth = (pageWidth - 28) / Math.min(dataColumns.length, 6);
  
  doc.setFillColor(12, 35, 64);
  doc.rect(10, yPos - 4, pageWidth - 20, 8, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  
  dataColumns.slice(0, 6).forEach((col, idx) => {
    doc.text(col.header.substring(0, 12), 14 + idx * colWidth, yPos);
  });
  yPos += 8;
  
  // Table data (limited to fit page)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  
  const maxRows = Math.min(data.length, 35);
  data.slice(0, maxRows).forEach((row, rowIdx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    // Alternate row colors
    if (rowIdx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(10, yPos - 3, pageWidth - 20, 6, 'F');
    }
    
    dataColumns.slice(0, 6).forEach((col, colIdx) => {
      let value = row[col.key];
      if (typeof value === 'number') {
        value = value > 1000 ? formatCurrencyNumber(value) : value.toLocaleString('pt-BR');
      }
      const text = String(value ?? '').substring(0, 18);
      doc.text(text, 14 + colIdx * colWidth, yPos);
    });
    yPos += 6;
  });
  
  if (data.length > maxRows) {
    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`... e mais ${data.length - maxRows} registros (veja exportação Excel para dados completos)`, 14, yPos);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Godoy Prime Analytics - Inteligência Imobiliária', 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, 290);
  }
  
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`${filename}_${dateStr}.pdf`);
}
