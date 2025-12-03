import jsPDF from 'jspdf';

interface ValuationResult {
  min: number;
  justo: number;
  max: number;
  confianca: number;
  mercado: string;
  mercadoDescricao: string;
}

interface ValuationParams {
  localizacao: string;
  area: string;
  quartos: string;
  vagas: string;
  sol: string;
  vista: string;
  estado: string;
  tipologia: string;
}

interface LocationData {
  mediana_m2: number;
  total_transacoes: number;
}

export function exportValuationToPDF(
  result: ValuationResult,
  params: ValuationParams,
  locationData: LocationData
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(12, 35, 64); // Navy - primary color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME ANALYTICS', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório de Avaliação Imobiliária', pageWidth / 2, 28, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 36, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Location section
  let yPos = 55;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Localização', 20, yPos);
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(params.localizacao || 'Não informado', 20, yPos);
  
  yPos += 6;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Base de dados: ${locationData.total_transacoes} transações | Mediana: R$ ${locationData.mediana_m2.toLocaleString('pt-BR')}/m²`, 20, yPos);
  doc.setTextColor(0, 0, 0);

  // Property characteristics
  yPos += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Características do Imóvel', 20, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const characteristics = [
    ['Área', `${params.area || '-'} m²`],
    ['Tipologia', formatValue(params.tipologia)],
    ['Quartos', params.quartos || '-'],
    ['Vagas', params.vagas || '-'],
    ['Sol', formatValue(params.sol)],
    ['Vista', formatValue(params.vista)],
    ['Estado', formatValue(params.estado)],
  ];

  const colWidth = (pageWidth - 40) / 2;
  characteristics.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const xPos = 20 + col * colWidth;
    const currentY = yPos + row * 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${item[0]}:`, xPos, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(item[1], xPos + 25, currentY);
  });

  // Valuation result - highlighted box
  yPos += 45;
  doc.setFillColor(212, 175, 55, 0.1); // Gold accent
  doc.setDrawColor(212, 175, 55);
  doc.roundedRect(15, yPos - 5, pageWidth - 30, 50, 3, 3, 'FD');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 35, 64);
  doc.text('Resultado da Avaliação', pageWidth / 2, yPos + 5, { align: 'center' });

  yPos += 18;
  doc.setFontSize(24);
  doc.setTextColor(212, 175, 55);
  doc.text(`R$ ${result.justo.toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Preço Justo de Mercado', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Liquidez (Mín): R$ ${result.min.toLocaleString('pt-BR')}`, 40, yPos);
  doc.text(`Oportunidade (Máx): R$ ${result.max.toLocaleString('pt-BR')}`, pageWidth - 40, yPos, { align: 'right' });

  // Market analysis
  yPos += 25;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Análise de Mercado', 20, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Termômetro: Mercado de ${result.mercado}`, 20, yPos);

  yPos += 6;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(result.mercadoDescricao, 20, yPos);

  yPos += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Índice de Confiança: ${result.confianca}%`, 20, yPos);

  // Disclaimer
  yPos = 250;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPos - 5, pageWidth - 30, 25, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('AVISO LEGAL', 20, yPos);
  
  yPos += 5;
  const disclaimer = 'Este relatório é uma estimativa baseada em dados públicos de transações ITBI da Prefeitura do Rio de Janeiro. Não substitui laudo de avaliação profissional (PTAM). Os valores são indicativos e devem ser validados por um corretor ou avaliador credenciado.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
  doc.text(splitDisclaimer, 20, yPos);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Godoy Prime Realty - Analytics Dashboard', pageWidth / 2, 285, { align: 'center' });
  doc.text('www.godoyprime.com.br', pageWidth / 2, 290, { align: 'center' });

  // Save
  const filename = `valuation_${params.localizacao?.replace(/\s+/g, '_').substring(0, 30) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function formatValue(value: string | undefined): string {
  if (!value) return '-';
  
  const map: Record<string, string> = {
    'apartamento': 'Apartamento',
    'cobertura': 'Cobertura',
    'garden': 'Garden',
    'flat': 'Flat',
    'casa': 'Casa',
    'manha': 'Manhã',
    'tarde': 'Tarde',
    'dia-todo': 'Dia Todo',
    'frente-mar': 'Frente Mar',
    'mar': 'Vista Mar',
    'verde': 'Verde',
    'urbana': 'Urbana',
    'novo': 'Novo',
    'reformado': 'Reformado',
    'bom': 'Bom Estado',
    'original': 'Original',
    'reformar': 'A Reformar',
  };
  
  return map[value] || value;
}
