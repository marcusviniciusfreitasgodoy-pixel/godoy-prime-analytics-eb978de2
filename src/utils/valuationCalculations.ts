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

export type MarketAlignment =
  | 'EQUILIBRADO'
  | 'MODERADO'
  | 'DESALINHADO'
  | 'CRITICO'
  | 'SEM_DADOS'
  | 'AMOSTRA_INSUFICIENTE';

// Mínimo de anúncios para gerar gap de mercado estatisticamente relevante.
// Abaixo disso, um único outlier domina a mediana e distorce o alinhamento.
export const ANUNCIOS_MINIMO_ESTATISTICO = 3;

export interface CombinedPrices {
  min_m2: number;
  med_m2: number;
  max_m2: number;
  // Gap de Mercado (reformulado do antigo "Trend")
  market_gap_percentage: number | null; // Discrepância anúncios vs ITBI; null quando sem dados ou <3 anúncios
  market_alignment: MarketAlignment;   // Classificação do alinhamento
  gap_impact: string;                  // Texto explicativo do impacto
  anuncios_count?: number;             // Nº de anúncios usados no cálculo (0 se ausente)
  // Compatibilidade com código existente
  trend_percentage: number | null;     // Alias para market_gap_percentage
  trend_direction: "UP" | "STABLE" | "DOWN";
  trend_capped?: boolean;
  trend_original?: number;
}

// Valor de referência = 100% transações reais (ITBI).
// Anúncios são preço PEDIDO; ITBI é preço FECHADO. Misturá-los na base inflava o
// valor provável (auditoria, achado A3). Os anúncios continuam entrando como SINAL:
// gap de mercado, alinhamento, recomendação e confiança.
const MARKET_GAP_CAP = 35; // Cap máximo para o gap exibido

/** Gap anúncios × ITBI acima do qual a recomendação alerta (calibrar com a base; ver auditoria §7). */
export const ANUNCIO_GAP_ALERT_PCT = 15;

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
    case 'SEM_DADOS':
    case 'AMOSTRA_INSUFICIENTE':
      return 'Gap não aplicável — sem amostra suficiente de anúncios';
  }
};

export const calculateCombinedPrices = (
  itbi: ITBIData,
  anuncio?: AnuncioData
): CombinedPrices => {
  const anunciosCount = anuncio?.count ?? anuncio?.fontes?.length ?? 0;

  // Caso 1: nenhum anúncio disponível → 100% ITBI, gap não aplicável
  if (!anuncio || !anuncio.med_m2) {
    return {
      min_m2: itbi.min_m2,
      med_m2: itbi.med_m2,
      max_m2: itbi.max_m2,
      market_gap_percentage: null,
      market_alignment: 'SEM_DADOS',
      gap_impact:
        'Sem dados de anúncio disponíveis — avaliação 100% baseada em transações reais (ITBI). Gap de mercado não aplicável.',
      anuncios_count: 0,
      trend_percentage: null,
      trend_direction: "STABLE",
      trend_capped: false,
    };
  }

  // Caso 2: amostra insuficiente (1-2 anúncios) → 100% ITBI, gap declarado como incalculável
  if (anunciosCount > 0 && anunciosCount < ANUNCIOS_MINIMO_ESTATISTICO) {
    return {
      min_m2: itbi.min_m2,
      med_m2: itbi.med_m2,
      max_m2: itbi.max_m2,
      market_gap_percentage: null,
      market_alignment: 'AMOSTRA_INSUFICIENTE',
      gap_impact: `Apenas ${anunciosCount} anúncio(s) encontrado(s) — amostra insuficiente para calcular gap de mercado (mínimo recomendado: ${ANUNCIOS_MINIMO_ESTATISTICO}). Avaliação usa 100% ITBI.`,
      anuncios_count: anunciosCount,
      trend_percentage: null,
      trend_direction: "STABLE",
      trend_capped: false,
    };
  }

  // Base de referência: 100% ITBI. Os anúncios só alimentam o gap abaixo.
  const combined_min = itbi.min_m2;
  const combined_med = itbi.med_m2;
  const combined_max = itbi.max_m2;

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
    anuncios_count: anunciosCount,
    trend_percentage: Math.round(market_gap_percentage * 100) / 100, // Alias
    trend_direction,
    trend_capped,
    trend_original: trend_capped ? Math.round(gap_original * 100) / 100 : undefined,
  };
};

// Caps diferenciados por tipo de imóvel e categoria
export const CATEGORY_CAPS = {
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

// Cap global por tipo de imóvel (fonte única: a UI lê daqui)
export const GLOBAL_CAPS = {
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

  // Cap global por tipo (ver GLOBAL_CAPS)
  if (total > globalCap.max) {
    total = globalCap.max;
    auto_capped = true;
  } else if (total < globalCap.min) {
    total = globalCap.min;
    auto_capped = true;
  }

  return { total, auto_capped, by_category: cappedByCategory, global_cap: globalCap.max };
};

// Calcula os 3 valores finais.
// A faixa é a que os dados sustentam: P10 (pessimista), mediana (provável) e P90
// (otimista) de R$/m² × área × ajuste × documentação. Sem compressão de spread e
// sem clamps: a versão anterior limitava o spread a 35% por construção, o que
// tornava a Regra 3 (avaliação formal) inalcançável (auditoria, achado A1).
export const calculateFinalValues = (
  area_m2: number,
  combined: CombinedPrices,
  adjustment: number,
  doc_factor: number
): { pessimista: number; provavel: number; otimista: number } => {
  const factor = area_m2 * (1 + adjustment) * doc_factor;
  const values = [combined.min_m2 * factor, combined.med_m2 * factor, combined.max_m2 * factor]
    .map((v) => Math.round(v))
    .sort((a, b) => a - b);
  return { pessimista: values[0], provavel: Math.round(combined.med_m2 * factor), otimista: values[2] };
};

// Calcula spread
export const calculateSpread = (pessimista: number, otimista: number, provavel: number): number => {
  return ((otimista - pessimista) / provavel) * 100;
};

/** Informações da amostra ITBI usadas por confiança e recomendação. */
export interface SampleInfo {
  /** escrituras válidas após o corte de outliers */
  escrituras: number;
  linhas: number;
  dataSource: "logradouro" | "bairro";
  tipologiaFallback: boolean;
  truncado: boolean;
}

/** Deriva SampleInfo do ITBIData (usa os metadados quando existem; avaliações antigas caem no total). */
export const sampleFromITBI = (itbi: ITBIData): SampleInfo | undefined => {
  if (itbi.meta) {
    return {
      escrituras: itbi.meta.escrituras_validas,
      linhas: itbi.meta.linhas_agregadas,
      dataSource: itbi.meta.data_source,
      tipologiaFallback: itbi.meta.tipologia_fallback,
      truncado: itbi.meta.truncado,
    };
  }
  if (itbi.transaction_count > 0) {
    return { escrituras: itbi.transaction_count, linhas: 0, dataSource: "logradouro", tipologiaFallback: false, truncado: false };
  }
  return undefined;
};

// Abaixo deste número de escrituras o parecer é emitido, mas marcado como indicativo.
export const MIN_ESCRITURAS_PARECER = 3;
// Tetos de confiança por tamanho de amostra (escrituras válidas).
export const SAMPLE_SCORE_CAPS: ReadonlyArray<{ maxEscrituras: number; cap: number }> = [
  { maxEscrituras: 2, cap: 40 },
  { maxEscrituras: 9, cap: 55 },
  { maxEscrituras: 29, cap: 75 },
];
export const BAIRRO_FALLBACK_PENALTY = 15;
export const TIPOLOGIA_FALLBACK_PENALTY = 5;
// Limiares de spread (faixa P10–P90 sem compressão). Calibrar com a base (auditoria §7).
export const SPREAD_NORMAL_PCT = 35;
export const SPREAD_WIDE_PCT = 50;
export const SPREAD_VERY_WIDE_PCT = 65;

// Calcula score de confiança (0-100) com foco na qualidade dos dados de entrada.
// A confiança mede: tamanho e origem da amostra, dispersão do mercado, documentação,
// liquidez e coerência com anúncios. Não mede se o valor provável está "certo".
export const calculateConfidenceScore = (
  adjustment: number,
  spread: number,
  doc_factor: number,
  marketGap: number | null, // Gap de Mercado; null indica ausência ou amostra insuficiente
  liquidityScore?: number, // Score de liquidez 0-100 do histórico 5 anos
  sample?: SampleInfo
): number => {
  let score = 100;

  // Penalidade 1: Magnitude do ajuste
  // Ajustes altos são normais quando o imóvel tem diferenciais reais; penaliza só extremos.
  const adjMag = Math.abs(adjustment) * 100;
  if (adjMag > 40) {
    score -= 15;
  } else if (adjMag > 35) {
    score -= 8;
  } else if (adjMag > 25) {
    score -= 4;
  }

  // Penalidade 2: Spread da faixa P10–P90
  if (spread > SPREAD_VERY_WIDE_PCT) {
    score -= 18;
  } else if (spread > SPREAD_WIDE_PCT) {
    score -= 10;
  } else if (spread > SPREAD_NORMAL_PCT) {
    score -= 4;
  }

  // Penalidade 3: Documentação
  if (doc_factor < 0.85) {
    score -= 20;
  } else if (doc_factor < 0.95) {
    score -= 8;
  }

  // Bônus/Penalidade 4: Liquidez do mercado
  if (liquidityScore !== undefined) {
    if (liquidityScore >= 70) {
      score += 10;
    } else if (liquidityScore >= 50) {
      score += 5;
    } else if (liquidityScore < 30) {
      score -= 5;
    }
  }

  // Penalidade 5: Gap de Mercado (anúncios × ITBI). Sem anúncios, fonte ausente: -10.
  if (marketGap === null) {
    score -= 10;
  } else {
    const absGap = Math.abs(marketGap);
    if (absGap <= 15) {
      score += 3;
    } else if (absGap <= 25) {
      // neutro
    } else if (absGap <= 35) {
      score -= 3;
    } else {
      score -= 5;
    }
  }

  // Penalidade 6: origem da amostra (auditoria, achado A2)
  if (sample) {
    if (sample.dataSource === "bairro") score -= BAIRRO_FALLBACK_PENALTY;
    if (sample.tipologiaFallback) score -= TIPOLOGIA_FALLBACK_PENALTY;
  }

  score = Math.max(0, Math.min(100, score));

  // Teto por tamanho da amostra: uma rua com uma escritura nunca é "Alta Confiança".
  if (sample) {
    const cap = SAMPLE_SCORE_CAPS.find((c) => sample.escrituras <= c.maxEscrituras)?.cap;
    if (cap !== undefined) score = Math.min(score, cap);
  }

  return score;
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
  trend: number | null,
  provavel: number,
  market_alignment?: MarketAlignment,
  sample?: SampleInfo
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

  // Regra 1b: Amostra insuficiente (auditoria, achado A2)
  if (sample && sample.escrituras < MIN_ESCRITURAS_PARECER) {
    return {
      status: "INSUFFICIENT_SAMPLE",
      title: "Amostra Insuficiente",
      icon: PDF_ICONS.specialist,
      message: `Apenas ${sample.escrituras} escritura(s) na referência de mercado. O valor é indicativo e não sustenta decisão de preço.`,
      details: [
        "Ampliar a amostra: raio de 100–300 m ou bairro (Etapa 4)",
        "Confrontar com anúncios comparáveis (mínimo 3)",
        "Para decisão formal, contratar avaliação por perito CREA (NBR 14653-2)",
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

  // Regra 3: Confiança baixa + faixa larga (a faixa não é mais comprimida; ver calculateFinalValues)
  if (spread > SPREAD_WIDE_PCT && score < 55) {
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

  // Regra 4: Anúncios bem acima das transações reais + boa confiança
  // NOTA: o valor provável usa só ITBI; o gap mede margem de negociação e tempo de venda.
  if (trend !== null && trend > ANUNCIO_GAP_ALERT_PCT && score >= 70) {
    return {
      status: "WAIT_30_DAYS",
      title: "Anúncios Acima do Mercado",
      icon: PDF_ICONS.wait,
      message: `Anúncios de referência ${trend.toFixed(0)}% acima das transações reais (ITBI). O valor provável usa apenas transações reais.`,
      details: [
        `Anúncios ${trend.toFixed(0)}% acima das vendas registradas`,
        "Isso NÃO significa valorização real",
        "Use o valor provável (ITBI) como referência de fechamento",
        "Anúncios inflados demoram mais para vender",
        "Negociar com margem de 5-10% sobre o valor provável",
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
  if (trend !== null && trend < -5) {
    return {
      status: "MARKET_CAUTION",
      title: "Mercado em Cautela",
      icon: PDF_ICONS.down,
      message: "Recomendação: anunciar 5% abaixo do valor provável para venda mais rápida.",
      urgency: "MEDIUM",
    };
  }

  // Regra 7: Alinhamento desalinhado/crítico não capturado acima → bloquear READY_TO_MARKET.
  // Elimina contradição interna do motor (alinhamento ruim × recomendação "pronto para vender").
  if (market_alignment === 'DESALINHADO' || market_alignment === 'CRITICO') {
    return {
      status: "REVIEW_PRICING",
      title: "Revisar Precificação",
      icon: PDF_ICONS.wait,
      message:
        "Gap de mercado alto entre anúncios e transações reais. Revisar posicionamento de preço antes de anunciar.",
      details: [
        "Comparar valor de anúncio com valor ITBI ajustado",
        "Considerar anunciar próximo ao valor provável para preservar liquidez",
        "Reavaliar se houver mudança nos anúncios de referência",
      ],
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

  // 5. Calcula confiança (liquidez + tamanho e origem da amostra)
  const sample = sampleFromITBI(itbi);
  const confidence_score = calculateConfidenceScore(
    adjustment,
    spread,
    doc_factor,
    combined.trend_percentage,
    liquidityScore,
    sample
  );
  const confidence_level = mapScoreToLevel(confidence_score);

  // 6. Gera recomendação
  const recommendation = generateRecommendation(
    doc_status,
    doc_factor,
    spread,
    confidence_score,
    combined.trend_percentage,
    provavel,
    combined.market_alignment,
    sample
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
