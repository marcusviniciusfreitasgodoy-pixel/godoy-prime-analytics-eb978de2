// Tipos para o módulo de Estratégia de Precificação

export type StrategyType = 'atracao' | 'mercado' | 'premium';

export interface DiagnosticAnswers {
  q1_tempo_mercado: string | null;
  q2_concorrencia: string | null;
  q3_prioridade: string | null;
  q4_horizonte_tempo: string | null;
  q5_situacao_financeira: string | null;
  q6_estado_mercado: string | null;
  q7_clientes_potenciais: string | null;
  q8_pronto_vender: string | null;
  q9_padrao_imovel: string | null;
}

export interface StrategyCalculation {
  percentual: number;
  preco_anuncio: number;
  corretagem: number;
  liquido: number;
  piso_planejado: number;
  liquido_min: number;
  premio_liquido_pct: number;
}

export interface PricingStrategyState {
  id?: string;
  valuation_id?: string;
  valor_itbi: number;
  is_new_listing: boolean | null;
  diagnostico: DiagnosticAnswers;
  estrategia_recomendada: StrategyType | null;
  estrategia_selecionada: StrategyType | null;
  calculos: {
    atracao: StrategyCalculation;
    mercado: StrategyCalculation;
    premium: StrategyCalculation;
  } | null;
  plano_ajuste_ativo: boolean;
  status: 'inicial' | 'diagnostico' | 'analisado' | 'selecionado' | 'confirmado';
}

export const initialDiagnosticAnswers: DiagnosticAnswers = {
  q1_tempo_mercado: null,
  q2_concorrencia: null,
  q3_prioridade: null,
  q4_horizonte_tempo: null,
  q5_situacao_financeira: null,
  q6_estado_mercado: null,
  q7_clientes_potenciais: null,
  q8_pronto_vender: null,
  q9_padrao_imovel: null,
};

export const initialPricingStrategyState: PricingStrategyState = {
  valor_itbi: 0,
  is_new_listing: null,
  diagnostico: initialDiagnosticAnswers,
  estrategia_recomendada: null,
  estrategia_selecionada: null,
  calculos: null,
  plano_ajuste_ativo: false,
  status: 'inicial',
};

// Opções de resposta para cada pergunta
export const DIAGNOSTIC_OPTIONS = {
  q1_tempo_mercado: [
    { value: 'nao_listado', label: 'Ainda não listado' },
    { value: '1_3_meses', label: '1–3 meses' },
    { value: '3_6_meses', label: '3–6 meses' },
    { value: 'mais_6_meses', label: 'Mais de 6 meses' },
  ],
  q2_concorrencia: [
    { value: 'poucos', label: 'Poucos similares' },
    { value: 'varios', label: 'Vários similares' },
    { value: 'muitos', label: 'Muitos similares' },
  ],
  q3_prioridade: [
    { value: 'vender_rapido', label: 'Vender rápido (urgência)' },
    { value: 'equilibrio', label: 'Equilíbrio' },
    { value: 'melhor_preco', label: 'Melhor preço (sem pressa)' },
  ],
  q4_horizonte_tempo: [
    { value: 'ate_30_dias', label: 'Até 30 dias' },
    { value: '30_90_dias', label: '30–90 dias' },
    { value: '90_180_dias', label: '90–180 dias' },
    { value: 'sem_pressa', label: 'Sem pressa' },
  ],
  q5_situacao_financeira: [
    { value: 'liquidez_rapida', label: 'Preciso de liquidez rápida' },
    { value: 'flexivel', label: 'Flexível' },
    { value: 'sem_pressao', label: 'Sem pressão' },
  ],
  q6_estado_mercado: [
    { value: 'em_alta', label: 'Em alta (muita demanda)' },
    { value: 'equilibrado', label: 'Equilibrado' },
    { value: 'em_baixa', label: 'Em baixa (pouca demanda)' },
  ],
  q7_clientes_potenciais: [
    { value: 'um_comprador', label: 'Um comprador específico' },
    { value: 'varios_interessados', label: 'Vários interessados' },
    { value: 'multiplos_qualificados', label: 'Múltiplos qualificados' },
  ],
  q8_pronto_vender: [
    { value: 'totalmente_preparado', label: 'Sim, totalmente preparado' },
    { value: 'mais_ou_menos', label: 'Mais ou menos' },
    { value: 'preciso_preparar', label: 'Preciso me preparar' },
  ],
  q9_padrao_imovel: [
    { value: 'padrao', label: 'Padrão' },
    { value: 'com_diferenciais', label: 'Com diferenciais' },
    { value: 'alto_padrao', label: 'Alto padrão' },
    { value: 'premium', label: 'Premium / Luxo' },
  ],
} as const;

// Constantes de cálculo
export const COMMISSION_RATE = 0.06;
export const FLOOR_DISCOUNT = 0.97;
