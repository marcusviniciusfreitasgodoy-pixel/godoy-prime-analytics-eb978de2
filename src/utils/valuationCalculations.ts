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

export interface CombinedPrices {
  min_m2: number;
  med_m2: number;
  max_m2: number;
  trend_percentage: number;
  trend_direction: "UP" | "STABLE" | "DOWN";
  trend_capped?: boolean; // Indica se o trend foi limitado pelo cap
  trend_original?: number; // Valor original antes do cap (para referência)
}

// Combina ITBI (70%) + Anúncios (30%)
// Com cap de trend para evitar distorções por poucos dados de anúncios
const TREND_CAP = 50; // Limita trend a ±50%

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
      trend_percentage: 0,
      trend_direction: "STABLE",
      trend_capped: false,
    };
  }

  const combined_min = itbi.min_m2 * 0.7 + anuncio.min_m2 * 0.3;
  const combined_med = itbi.med_m2 * 0.7 + anuncio.med_m2 * 0.3;
  const combined_max = itbi.max_m2 * 0.7 + anuncio.max_m2 * 0.3;

  // Calcula trend: diferença entre anúncios e ITBI
  const trend_original = ((anuncio.med_m2 - itbi.med_m2) / itbi.med_m2) * 100;
  let trend_percentage = trend_original;
  let trend_capped = false;
  
  // Aplica cap para evitar distorções extremas (poucos dados de anúncios)
  if (trend_percentage > TREND_CAP) {
    trend_percentage = TREND_CAP;
    trend_capped = true;
    console.log(`[ValuationCalc] Trend capped: ${trend_original.toFixed(1)}% → ${TREND_CAP}%`);
  } else if (trend_percentage < -TREND_CAP) {
    trend_percentage = -TREND_CAP;
    trend_capped = true;
    console.log(`[ValuationCalc] Trend capped: ${trend_original.toFixed(1)}% → -${TREND_CAP}%`);
  }
  
  const trend_direction: "UP" | "STABLE" | "DOWN" =
    trend_percentage > 5 ? "UP" : trend_percentage < -5 ? "DOWN" : "STABLE";

  return {
    min_m2: Math.round(combined_min * 100) / 100,
    med_m2: Math.round(combined_med * 100) / 100,
    max_m2: Math.round(combined_max * 100) / 100,
    trend_percentage: Math.round(trend_percentage * 100) / 100,
    trend_direction,
    trend_capped,
    trend_original: trend_capped ? Math.round(trend_original * 100) / 100 : undefined,
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
    D: { max: 0.04, min: -0.06 },  // Segurança
    E: { max: 0.04, min: -0.04 },  // Funcionalidade
  },
};

// Cap global por tipo de imóvel
const GLOBAL_CAPS = {
  casa: { max: 0.35, min: -0.35 },
  apartamento: { max: 0.30, min: -0.30 },
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

// Calcula os 3 valores finais
export const calculateFinalValues = (
  area_m2: number,
  combined: CombinedPrices,
  adjustment: number,
  doc_factor: number
): { pessimista: number; provavel: number; otimista: number } => {
  const multiplier = 1 + adjustment;

  const base_min = combined.min_m2 * area_m2;
  const base_med = combined.med_m2 * area_m2;
  const base_max = combined.max_m2 * area_m2;

  const adjusted_min = base_min * multiplier;
  const adjusted_med = base_med * multiplier;
  const adjusted_max = base_max * multiplier;

  return {
    pessimista: Math.round(adjusted_min * doc_factor),
    provavel: Math.round(adjusted_med * doc_factor),
    otimista: Math.round(adjusted_max * doc_factor),
  };
};

// Calcula spread
export const calculateSpread = (pessimista: number, otimista: number, provavel: number): number => {
  return ((otimista - pessimista) / provavel) * 100;
};

// Calcula score de confiança (0-100)
export const calculateConfidenceScore = (
  adjustment: number,
  spread: number,
  doc_factor: number,
  trend: number
): number => {
  let score = 100;

  // Penalidade 1: Magnitude do ajuste
  const adjMag = Math.abs(adjustment) * 100;
  if (adjMag > 40) {
    score -= 40;
  } else if (adjMag > 30) {
    score -= 25;
  } else if (adjMag > 15) {
    score -= 10;
  } else {
    score -= 5;
  }

  // Penalidade 2: Spread amplo
  if (spread > 40) {
    score -= 30;
  } else if (spread > 30) {
    score -= 15;
  } else if (spread > 20) {
    score -= 8;
  } else {
    score -= 3;
  }

  // Penalidade 3: Documentação
  if (doc_factor < 0.85) {
    score -= 25;
  } else if (doc_factor < 0.95) {
    score -= 10;
  }

  // Bônus: Trend favorável
  if (trend > 10) {
    score += 10;
  } else if (trend > 5) {
    score += 5;
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

  // Regra 4: Mercado em alta + boa confiança
  if (trend > 5 && score >= 70) {
    return {
      status: "WAIT_30_DAYS",
      title: "Esperar Oportunidade",
      icon: PDF_ICONS.wait,
      message: `Mercado em ALTA de ${trend.toFixed(1)}%. Aguardar 30-60 dias para melhor preço.`,
      details: [
        "Preparar imóvel (fotos, limpeza)",
        "Monitorar trend do mercado",
        "Anunciar após período de espera",
      ],
      urgency: "LOW",
      potential_gain: provavel * (trend / 100),
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
  tipoImovel: string = "Apartamento"
): ValuationResult => {
  // 1. Combina preços
  const combined = calculateCombinedPrices(itbi, anuncio);

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

  // 5. Calcula confiança
  const confidence_score = calculateConfidenceScore(
    adjustment,
    spread,
    doc_factor,
    combined.trend_percentage
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
