import type { ValuationCharacteristic, DocumentationFactor } from "@/hooks/useValuationCharacteristics";
import type { 
  ITBIData, 
  AnuncioData, 
  CharacteristicResponse, 
  ValuationResult, 
  RecommendationResult 
} from "@/types/valuation";

// Re-export types for convenience
export type { ITBIData, AnuncioData, CharacteristicResponse, ValuationResult, RecommendationResult };

export type MarketAlignment = 'EQUILIBRADO' | 'MODERADO' | 'DESALINHADO' | 'CRITICO';

export interface CombinedPrices {
  min_m2: number;
  med_m2: number;
  max_m2: number;
  // Gap de Mercado (reformulado do antigo "Trend")
  market_gap_percentage: number;       // Discrepância anúncios vs ITBI
  market_alignment: MarketAlignment;   // Classificação do alinhamento
  gap_impact: string;                  // Texto explicativo do impacto
  // Compatibilidade com código existente
  trend_percentage: number;            // Alias para market_gap_percentage
  trend_direction: "UP" | "STABLE" | "DOWN";
  trend_capped?: boolean;
  trend_original?: number;
}

// Combina ITBI (70%) + Anúncios (30%)
// ITBI = transações reais, Anúncios = sinal de mercado
// Cap para evitar distorções extremas
const MARKET_GAP_CAP = 35; // Cap máximo para o gap

// Pesos: ITBI como âncora principal
const ITBI_WEIGHT = 0.70;
const ANUNCIO_WEIGHT = 0.30;

// Classifica o alinhamento de mercado baseado no gap
const classifyMarketAlignment = (gap: number): MarketAlignment => {
  const absGap = Math.abs(gap);
  if (absGap <= 10) return 'EQUILIBRADO';
  if (absGap <= 20) return 'MODERADO';
  if (absGap <= 35) return 'DESALINHADO';
  return 'CRITICO';
};

// Gera texto explicativo do impacto do gap
const getGapImpact = (gap: number, alignment: MarketAlignment): string => {
  if (gap <= 0) {
    return 'Anúncios abaixo ou iguais às transações reais - mercado favorável ao comprador';
  }
  switch (alignment) {
    case 'EQUILIBRADO':
      return 'Mercado saudável - anúncios próximos das transações reais';
    case 'MODERADO':
      return 'Margem de negociação típica do mercado';
    case 'DESALINHADO':
      return 'Anúncios acima das transações reais - pode impactar tempo de venda';
    case 'CRITICO':
      return 'Grande discrepância - precificação competitiva recomendada para garantir liquidez';
  }
};

export const calculateCombinedPrices = (
  itbi: ITBIData,
  anuncio?: AnuncioData
): CombinedPrices => {
  // Se não há dados de anúncios, usa 100% ITBI
  if (!anuncio || !anuncio.med_m2) {
    return {
      min_m2: itbi.min_m2,
      med_m2: itbi.med_m2,
      max_m2: itbi.max_m2,
      market_gap_percentage: 0,
      market_alignment: 'EQUILIBRADO',
      gap_impact: 'Avaliação baseada 100% em transações reais (ITBI)',
      trend_percentage: 0,
      trend_direction: "STABLE",
      trend_capped: false,
    };
  }

  const combined_min = itbi.min_m2 * ITBI_WEIGHT + anuncio.min_m2 * ANUNCIO_WEIGHT;
  const combined_med = itbi.med_m2 * ITBI_WEIGHT + anuncio.med_m2 * ANUNCIO_WEIGHT;
  const combined_max = itbi.max_m2 * ITBI_WEIGHT + anuncio.max_m2 * ANUNCIO_WEIGHT;

  // Calcula Gap de Mercado: diferença entre anúncios e ITBI
  const gap_original = ((anuncio.med_m2 - itbi.med_m2) / itbi.med_m2) * 100;
  let market_gap_percentage = gap_original;
  let trend_capped = false;
  
  // Aplica cap para evitar distorções extremas
  if (market_gap_percentage > MARKET_GAP_CAP) {
    market_gap_percentage = MARKET_GAP_CAP;
    trend_capped = true;
    console.log(`[ValuationCalc] Market Gap capped: ${gap_original.toFixed(1)}% → +${MARKET_GAP_CAP}%`);
  } else if (market_gap_percentage < -MARKET_GAP_CAP) {
    market_gap_percentage = -MARKET_GAP_CAP;
    trend_capped = true;
    console.log(`[ValuationCalc] Market Gap capped: ${gap_original.toFixed(1)}% → -${MARKET_GAP_CAP}%`);
  }
  
  const market_alignment = classifyMarketAlignment(market_gap_percentage);
  const gap_impact = getGapImpact(market_gap_percentage, market_alignment);
  
  // Mantém trend_direction para compatibilidade
  const trend_direction: "UP" | "STABLE" | "DOWN" =
    market_gap_percentage > 5 ? "UP" : market_gap_percentage < -5 ? "DOWN" : "STABLE";

  return {
    min_m2: Math.round(combined_min * 100) / 100,
    med_m2: Math.round(combined_med * 100) / 100,
    max_m2: Math.round(combined_max * 100) / 100,
    market_gap_percentage: Math.round(market_gap_percentage * 100) / 100,
    market_alignment,
    gap_impact,
    trend_percentage: Math.round(market_gap_percentage * 100) / 100, // Alias
    trend_direction,
    trend_capped,
    trend_original: trend_capped ? Math.round(gap_original * 100) / 100 : undefined,
  };
};

// Caps diferenciados por tipo de imóvel e categoria
const CATEGORY_CAPS = {
  casa: {
    A: { max: 0.15, min: -0.12 },  // Posição/Vista/Luz
    B: { max: 0.10, min: -0.08 },  // Conservação
    C: { max: 0.10, min: -0.06 },  // Conforto
    D: { max: 0.06, min: -0.06 },  // Segurança
    E: { max: 0.08, min: -0.04 },  // Funcionalidade
  },
  apartamento: {
    A: { max: 0.12, min: -0.12 },  // Posição/Vista/Luz
    B: { max: 0.08, min: -0.08 },  // Conservação
    C: { max: 0.06, min: -0.06 },  // Conforto
    D: { max: 0.06, min: -0.06 },  // Segurança
    E: { max: 0.06, min: -0.06 },  // Funcionalidade
  },
};

// Cap global por tipo de imóvel
const GLOBAL_CAPS = {
  casa: { max: 0.35, min: -0.35 },
  apartamento: { max: 0.35, min: -0.35 },
};

// Determina se o tipo de imóvel é casa
const isCasaType = (tipoImovel: string): boolean => {
  const tipoLower = tipoImovel.toLowerCase();
  return tipoLower.includes('casa') || tipoLower.includes('cobertura');
};

// Calcula ajuste total com cap por categoria (diferenciado por tipo de imóvel)
export const calculateTotalAdjustment = (
  responses: CharacteristicResponse[],
  characteristics: ValuationCharacteristic[],
  bonusTerreno: number = 0,
  tipoImovel: string = "Apartamento"
): { total: number; auto_capped: boolean; by_category: Record<string, number>; global_cap: number } => {
  const propertyType = isCasaType(tipoImovel) ? 'casa' : 'apartamento';
  const categoryCaps = CATEGORY_CAPS[propertyType];
  const globalCap = GLOBAL_CAPS[propertyType];
  
  // Agrupa respostas por categoria
  const byCategory: Record<string, number> = {};

  responses.forEach((response) => {
    if (response.response !== "sim") return;

    const char = characteristics.find((c) => c.id === response.char_id);
    if (!char) return;

    if (!byCategory[char.category]) {
      byCategory[char.category] = 0;
    }
    byCategory[char.category] += char.weight_value;
  });

  // Aplica cap por categoria (diferenciado por tipo de imóvel)
  const cappedByCategory: Record<string, number> = {};
  Object.entries(byCategory).forEach(([category, value]) => {
    const customCap = categoryCaps[category as keyof typeof categoryCaps];
    
    // Usa caps customizados se disponíveis, senão usa os do banco de dados
    let cap_max: number;
    let cap_min: number;
    
    if (customCap) {
      cap_max = customCap.max;
      cap_min = customCap.min;
    } else {
      const char = characteristics.find((c) => c.category === category);
      if (!char) {
        cappedByCategory[category] = value;
        return;
      }
      cap_max = char.category_cap_max;
      cap_min = char.category_cap_min;
    }

    if (value > cap_max) {
      cappedByCategory[category] = cap_max;
    } else if (value < cap_min) {
      cappedByCategory[category] = cap_min;
    } else {
      cappedByCategory[category] = value;
    }
  });

  // Soma total das categorias
  let total = Object.values(cappedByCategory).reduce((sum, val) => sum + val, 0);
  
  // Adiciona bônus/penalidade de terreno (para casas)
  total += bonusTerreno;
  
  let auto_capped = false;

  // Cap global diferenciado por tipo (Casa: ±35%, Apartamento: ±30%)
  if (total > globalCap.max) {
    total = globalCap.max;
    auto_capped = true;
  } else if (total < globalCap.min) {
    total = globalCap.min;
    auto_capped = true;
  }

  return { total, auto_capped, by_category: cappedByCategory, global_cap: globalCap.max };
};

// Calcula os 3 valores finais com compressão de spread AGRESSIVA
// O valor pessimista não pode estar muito distante do provável (máximo -20%)
// O valor otimista não pode estar muito distante do provável (máximo +15%)
const SPREAD_COMPRESSION = 0.50; // 50% de compressão do spread original
const MAX_PESSIMIST_DISCOUNT = 0.20; // Máximo 20% abaixo do provável
const MAX_OPTIMIST_PREMIUM = 0.15;   // Máximo 15% acima do provável

export const calculateFinalValues = (
  area_m2: number,
  combined: CombinedPrices,
  adjustment: number,
  doc_factor: number
): { pessimista: number; provavel: number; otimista: number } => {
  const multiplier = 1 + adjustment;

  // Valores base antes de compressão
  const base_min = combined.min_m2 * area_m2;
  const base_med = combined.med_m2 * area_m2;
  const base_max = combined.max_m2 * area_m2;

  // Aplica compressão: aproxima min/max em direção à mediana
  let compressed_min = base_min + (base_med - base_min) * SPREAD_COMPRESSION;
  let compressed_max = base_max - (base_max - base_med) * SPREAD_COMPRESSION;

  // Valor provável ajustado (referência)
  const adjusted_med = base_med * multiplier * doc_factor;

  // Aplica limites de spread: pessimista não pode ser mais de 20% abaixo
  let adjusted_min = compressed_min * multiplier * doc_factor;
  const min_floor = adjusted_med * (1 - MAX_PESSIMIST_DISCOUNT);
  if (adjusted_min < min_floor) {
    adjusted_min = min_floor;
  }

  // Otimista não pode ser mais de 15% acima
  let adjusted_max = compressed_max * multiplier * doc_factor;
  const max_ceiling = adjusted_med * (1 + MAX_OPTIMIST_PREMIUM);
  if (adjusted_max > max_ceiling) {
    adjusted_max = max_ceiling;
  }

  return {
    pessimista: Math.round(adjusted_min),
    provavel: Math.round(adjusted_med),
    otimista: Math.round(adjusted_max),
  };
};

// Calcula spread
export const calculateSpread = (pessimista: number, otimista: number, provavel: number): number => {
  return ((otimista - pessimista) / provavel) * 100;
};

// Calcula score de confiança (0-100) com foco na qualidade dos dados de entrada
// PREMISSA: O valor "provável" já é considerado REAL e FACTÍVEL
// A confiança mede: qualidade dos dados, consistência do mercado, documentação
export const calculateConfidenceScore = (
  adjustment: number,
  spread: number,
  doc_factor: number,
  marketGap: number, // Gap de Mercado (antigo trend)
  liquidityScore?: number // Score de liquidez 0-100 do histórico 5 anos
): number => {
  let score = 100;

  // Penalidade 1: Magnitude do ajuste (peso reduzido: ~15%)
  // Ajustes altos são normais quando o imóvel tem diferenciais reais
  // Penalizamos apenas ajustes extremos (>40%)
  const adjMag = Math.abs(adjustment) * 100;
  if (adjMag > 40) {
    score -= 15; // Reduzido de 40 para 15
  } else if (adjMag > 35) {
    score -= 8;  // Reduzido de 25 para 8
  } else if (adjMag > 25) {
    score -= 4;  // Reduzido de 10 para 4
  }
  // Ajustes até 25% são considerados normais (sem penalidade)

  // Penalidade 2: Spread amplo (peso: ~15%)
  // Spreads de 20-30% são normais no mercado imobiliário
  if (spread > 40) {
    score -= 15; // Reduzido de 30 para 15
  } else if (spread > 35) {
    score -= 8;  // Reduzido de 15 para 8
  } else if (spread > 30) {
    score -= 4;  // Ajustado
  }
  // Spreads até 30% são considerados normais (sem penalidade)

  // Penalidade 3: Documentação (peso mantido: ~15%)
  // Documentação é crítica - mantém penalidades
  if (doc_factor < 0.85) {
    score -= 20;
  } else if (doc_factor < 0.95) {
    score -= 8;
  }

  // Bônus/Penalidade 4: Liquidez do mercado (peso: ~15%)
  // Foco em dar bônus para alta liquidez, penalidade leve para baixa
  if (liquidityScore !== undefined) {
    if (liquidityScore >= 70) {
      // Alta liquidez: bônus significativo
      score += 10;
    } else if (liquidityScore >= 50) {
      // Liquidez média-alta: bônus moderado
      score += 5;
    } else if (liquidityScore >= 30) {
      // Liquidez média: neutro
    } else {
      // Liquidez baixa: penalidade leve
      score -= 5;
    }
  }

  // Penalidade 5: Gap de Mercado (peso reduzido: ~5%)
  // Gap indica discrepância entre anúncios e transações reais
  // Não deveria penalizar fortemente a avaliação que usa dados reais (ITBI)
  const absGap = Math.abs(marketGap);
  if (absGap <= 15) {
    // Mercado bem equilibrado: pequeno bônus
    score += 3;
  } else if (absGap <= 25) {
    // Gap moderado: neutro
  } else if (absGap <= 35) {
    // Gap alto: penalidade leve
    score -= 3;
  } else {
    // Gap crítico: penalidade moderada
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
};

// Mapeia score para nível de confiança
export const mapScoreToLevel = (score: number): "green" | "yellow_high" | "yellow_medium" | "red" => {
  if (score >= 85) return "green";
  if (score >= 70) return "yellow_high";
  if (score >= 55) return "yellow_medium";
  return "red";
};

// Ícones PDF-safe (sem emojis que corrompem no jsPDF)
const PDF_ICONS = {
  blocked: "[X]",
  warning: "[!]",
  specialist: "[?]",
  wait: "[^]",
  fix: "[*]",
  down: "[v]",
  ready: "[OK]",
};

// Gera recomendação automática
export const generateRecommendation = (
  doc_status: string,
  doc_factor: number,
  spread: number,
  score: number,
  trend: number,
  provavel: number
): RecommendationResult => {
  // Regra 1: Documentação incompleta
  if (doc_status === "incompleta") {
    return {
      status: "BLOCKED_EVALUATION",
      title: "Avaliação Bloqueada",
      icon: PDF_ICONS.blocked,
      message: "Documentação incompleta. Solicitar ao proprietário os documentos necessários.",
      details: [
        "CCIR atualizado",
        "Matrícula do imóvel",
        "Certidão de ônus e encargos",
        "Comprovante IPTU recente",
      ],
      urgency: "HIGH",
    };
  }

  // Regra 2: Problemas legais graves
  if (doc_factor < 0.8) {
    return {
      status: "CONSULT_SPECIALIST",
      title: "Consultar Especialista Jurídico",
      icon: PDF_ICONS.warning,
      message: "Problemas legais detectados (penhora/restrição/débito grave).",
      details: [
        "Análise jurídica completa",
        "Entender restrições e custos",
        "Decidir se prossegue com venda",
      ],
      urgency: "HIGH",
      potential_gain: provavel * (1 - doc_factor),
    };
  }

  // Regra 3: Confiança baixa + spread alto
  if (spread > 40 && score < 55) {
    return {
      status: "NEED_SPECIALIST_VALUATION",
      title: "Requerer Avaliação Técnica Formal",
      icon: PDF_ICONS.specialist,
      message: "Intervalo muito amplo. Recomenda-se avaliação por perito CREA (NBR 14653-2).",
      details: [
        "Contratar perito CREA",
        "Aguardar parecer técnico formal",
        "Usar parecer como referência de mercado",
      ],
      urgency: "MEDIUM",
    };
  }

  // Regra 4: Gap significativo entre anúncios e ITBI + boa confiança
  // NOTA: Gap alto indica anúncios inflados, NÃO valorização real do mercado
  if (trend > 5 && score >= 70) {
    return {
      status: "WAIT_30_DAYS",
      title: "Anúncios Acima do Mercado",
      icon: PDF_ICONS.wait,
      message: `Gap de ${trend.toFixed(0)}% entre anúncios e transações reais (ITBI). Anúncios estão inflados.`,
      details: [
        `⚠️ Anúncios ${trend.toFixed(0)}% acima das vendas reais`,
        "Isso NÃO significa valorização real",
        "Use o valor ITBI (provável) como referência",
        "Anúncios inflados demoram mais para vender",
        "Negociar com margem de 5-10% sobre valor provável",
      ],
      urgency: "MEDIUM",
    };
  }

  // Regra 5: Pequena pendência documental
  if (doc_factor >= 0.9 && doc_factor < 1.0) {
    return {
      status: "REGULARIZE_FIRST",
      title: "Regularizar Antes de Vender",
      icon: PDF_ICONS.fix,
      message: "Pequena pendência de documentação. Regularizar pré-venda aumenta valor.",
      details: [
        "Pagar débito IPTU/Condomínio",
        "Obter certidão negativa",
        "Reenviar avaliação (valor aumenta)",
      ],
      urgency: "MEDIUM",
      potential_gain: provavel * (1 - doc_factor),
    };
  }

  // Regra 6: Mercado em queda
  if (trend < -5) {
    return {
      status: "MARKET_CAUTION",
      title: "Mercado em Cautela",
      icon: PDF_ICONS.down,
      message: "Recomendação: anunciar 5% abaixo do valor provável para venda mais rápida.",
      urgency: "MEDIUM",
    };
  }

  // Regra padrão: Pronto para vender
  return {
    status: "READY_TO_MARKET",
    title: "Pronto para Comercializar",
    icon: PDF_ICONS.ready,
    message: "Imóvel em excelentes condições. Recomendação: iniciar marketing imobiliário.",
    details: [
      "Fotos/vídeo profissional em 360°",
      "Anúncio em principais portais",
      "WhatsApp marketing para lista",
      "Tour virtual HD para estrangeiros",
    ],
    urgency: "LOW",
  };
};

// Aplica seleção de base (min/max/custom) sobre os preços combinados
export const applyBaseSelection = (
  combined: CombinedPrices,
  baseSelected: "min" | "med" | "max" | "custom",
  customBaseM2: number | null
): CombinedPrices => {
  if (baseSelected === "med") return combined;

  const original_med = combined.med_m2;
  if (!original_med || original_med === 0) return combined;

  let newMed: number;

  if (baseSelected === "min") {
    newMed = combined.min_m2;
  } else if (baseSelected === "max") {
    newMed = combined.max_m2;
  } else if (baseSelected === "custom" && customBaseM2 && customBaseM2 > 0) {
    newMed = customBaseM2;
  } else {
    return combined;
  }

  // Mantém proporção relativa do spread original
  const ratio = newMed / original_med;

  return {
    ...combined,
    min_m2: Math.round(combined.min_m2 * ratio * 100) / 100,
    med_m2: Math.round(newMed * 100) / 100,
    max_m2: Math.round(combined.max_m2 * ratio * 100) / 100,
  };
};

// Função principal que calcula tudo
export const calculateValuation = (
  area_m2: number,
  itbi: ITBIData,
  anuncio: AnuncioData | undefined,
  responses: CharacteristicResponse[],
  characteristics: ValuationCharacteristic[],
  doc_status: string,
  doc_factor: number,
  bonusTerreno: number = 0,
  tipoImovel: string = "Apartamento",
  liquidityScore?: number,
  baseSelected: "min" | "med" | "max" | "custom" = "med",
  customBaseM2: number | null = null
): ValuationResult => {
  // 1. Combina preços e aplica seleção de base
  const rawCombined = calculateCombinedPrices(itbi, anuncio);
  const combined = applyBaseSelection(rawCombined, baseSelected, customBaseM2);

  // 2. Calcula ajuste total (com caps diferenciados por tipo de imóvel)
  const { total: adjustment, auto_capped } = calculateTotalAdjustment(
    responses, 
    characteristics, 
    bonusTerreno,
    tipoImovel
  );

  // 3. Calcula valores finais
  const { pessimista, provavel, otimista } = calculateFinalValues(
    area_m2,
    combined,
    adjustment,
    doc_factor
  );

  // 4. Calcula spread
  const spread = calculateSpread(pessimista, otimista, provavel);

  // 5. Calcula confiança (agora inclui liquidez)
  const confidence_score = calculateConfidenceScore(
    adjustment,
    spread,
    doc_factor,
    combined.trend_percentage,
    liquidityScore // Novo parâmetro de liquidez
  );
  const confidence_level = mapScoreToLevel(confidence_score);

  // 6. Gera recomendação
  const recommendation = generateRecommendation(
    doc_status,
    doc_factor,
    spread,
    confidence_score,
    combined.trend_percentage,
    provavel
  );

  return {
    pessimista,
    provavel,
    otimista,
    spread_percentage: Math.round(spread * 10) / 10,
    confidence_score,
    confidence_level,
    total_adjustment: Math.round(adjustment * 1000) / 1000,
    auto_capped,
    recommendation,
  };
};
