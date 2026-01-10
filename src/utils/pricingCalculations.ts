import { 
  DiagnosticAnswers, 
  StrategyType, 
  StrategyCalculation,
  COMMISSION_RATE,
  FLOOR_DISCOUNT
} from '@/types/pricingStrategy';

/**
 * Calcula o percentual ajustado para cada estratégia baseado no diagnóstico
 */
export function calculateAdjustedPercentages(answers: DiagnosticAnswers): {
  atracao: number;
  mercado: number;
  premium: number;
} {
  const { 
    q3_prioridade, 
    q4_horizonte_tempo, 
    q5_situacao_financeira, 
    q6_estado_mercado,
    q2_concorrencia,
    q9_padrao_imovel
  } = answers;

  // ATRAÇÃO: default 4%, pode subir para 7%
  let pAtracao = 0.04;
  if (
    q6_estado_mercado !== 'em_baixa' && 
    (q3_prioridade === 'vender_rapido' || q5_situacao_financeira === 'liquidez_rapida')
  ) {
    pAtracao = 0.07;
  }

  // MERCADO: default 9%, pode subir para 12%
  let pMercado = 0.09;
  if (
    q6_estado_mercado === 'em_alta' && 
    (q9_padrao_imovel === 'com_diferenciais' || q9_padrao_imovel === 'alto_padrao' || q9_padrao_imovel === 'premium')
  ) {
    pMercado = 0.12;
  }

  // PREMIUM: default 14%, pode subir para 20%
  let pPremium = 0.14;
  if (
    q9_padrao_imovel === 'premium' &&
    q4_horizonte_tempo === 'sem_pressa' &&
    (q2_concorrencia === 'poucos' || q6_estado_mercado === 'em_alta')
  ) {
    pPremium = 0.20;
  }

  return { atracao: pAtracao, mercado: pMercado, premium: pPremium };
}

/**
 * Determina a estratégia recomendada baseada nas respostas do diagnóstico
 */
export function determineRecommendedStrategy(answers: DiagnosticAnswers): StrategyType {
  const { 
    q2_concorrencia,
    q3_prioridade, 
    q4_horizonte_tempo, 
    q5_situacao_financeira,
    q6_estado_mercado,
    q9_padrao_imovel
  } = answers;

  // Recomendar ATRAÇÃO se QUALQUER condição for verdadeira
  if (
    q3_prioridade === 'vender_rapido' ||
    q4_horizonte_tempo === 'ate_30_dias' ||
    q5_situacao_financeira === 'liquidez_rapida' ||
    q2_concorrencia === 'muitos'
  ) {
    return 'atracao';
  }

  // Recomendar PREMIUM se TODAS forem verdadeiras
  if (
    (q9_padrao_imovel === 'alto_padrao' || q9_padrao_imovel === 'premium') &&
    q4_horizonte_tempo !== 'ate_30_dias' &&
    (q2_concorrencia === 'poucos' || q6_estado_mercado === 'em_alta')
  ) {
    return 'premium';
  }

  // Caso contrário, recomendar MERCADO
  return 'mercado';
}

/**
 * Calcula todos os valores de uma estratégia
 */
export function calculateStrategy(valorItbi: number, percentual: number): StrategyCalculation {
  const precoAnuncio = valorItbi * (1 + percentual);
  const corretagem = precoAnuncio * COMMISSION_RATE;
  const liquido = precoAnuncio * (1 - COMMISSION_RATE);
  const pisoPlanejado = precoAnuncio * FLOOR_DISCOUNT;
  const liquidoMin = pisoPlanejado * (1 - COMMISSION_RATE);
  const premioLiquidoPct = ((liquido / valorItbi) - 1) * 100;

  return {
    percentual,
    preco_anuncio: Math.round(precoAnuncio),
    corretagem: Math.round(corretagem),
    liquido: Math.round(liquido),
    piso_planejado: Math.round(pisoPlanejado),
    liquido_min: Math.round(liquidoMin),
    premio_liquido_pct: Math.round(premioLiquidoPct * 10) / 10,
  };
}

/**
 * Calcula todas as 3 estratégias
 */
export function calculateAllStrategies(valorItbi: number, answers: DiagnosticAnswers): {
  atracao: StrategyCalculation;
  mercado: StrategyCalculation;
  premium: StrategyCalculation;
} {
  const percentages = calculateAdjustedPercentages(answers);

  return {
    atracao: calculateStrategy(valorItbi, percentages.atracao),
    mercado: calculateStrategy(valorItbi, percentages.mercado),
    premium: calculateStrategy(valorItbi, percentages.premium),
  };
}

/**
 * Formata valor monetário para BRL sem centavos
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Formata percentual
 */
export function formatPercentage(value: number, showSign: boolean = true): string {
  const formatted = (value * 100).toFixed(0);
  return showSign && value > 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Verifica se o diagnóstico está completo
 */
export function isDiagnosticComplete(answers: DiagnosticAnswers): boolean {
  return Object.values(answers).every(answer => answer !== null);
}

/**
 * Conta quantas perguntas foram respondidas
 */
export function countAnsweredQuestions(answers: DiagnosticAnswers): number {
  return Object.values(answers).filter(answer => answer !== null).length;
}
