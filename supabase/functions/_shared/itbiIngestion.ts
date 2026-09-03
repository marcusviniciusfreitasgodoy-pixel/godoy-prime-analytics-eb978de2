// Regras de aceitação de uma feature da API da Prefeitura na carga de
// itbi_transactions. FONTE ÚNICA para sync-itbi-prefeitura (carga completa)
// e sync-itbi-daily (mês corrente e anterior): as duas cargas precisam
// aceitar e rejeitar exatamente as mesmas linhas, senão os meses recentes
// ficam com uma população diferente do histórico.
//
// Histórico dos limites:
// - Até 2026-09-03 a carga completa descartava valor_transacao < R$ 100 mil.
//   A consulta 7.11 (docs/calibracao-consultas.sql) mostrou o corte ativo em
//   toda a base (nenhum bairro com valor mínimo abaixo de 100.368; P1 de
//   valor empilhado em 101 a 108 mil) e a API da Prefeitura devolveu, só na
//   faixa de 50 a 100 mil em 2021–2026, 186 escrituras em Santa Cruz, 129 em
//   Campo Grande e 82 em Guaratiba, contra 85 e 54 mantidas em Santa Cruz e
//   Guaratiba. O pior caso é INHOAÍBA|Apartamento com 59,5 % da amostra
//   remanescente abaixo de 110 mil. Um imóvel de 40 m² a R$ 2.400/m² vale
//   R$ 96 mil e é mercado, não erro. O piso passou a R$ 30 mil; o erro de
//   digitação continua barrado pelos limites de área e de R$/m².
// - sync-itbi-daily não aplicava limite nenhum e não gravava
//   total_transacoes nem percentual_transferido (entravam com os defaults
//   1 e 100). Passou a usar este módulo.
//
// Sem dependências: precisa rodar em Deno e no navegador (testes).

export const LIMITES_INGESTAO = {
  areaMinM2: 20,
  areaMaxM2: 5000,
  valorMin: 30_000,
  valorMax: 200_000_000,
  valorM2Min: 500,
  valorM2Max: 300_000,
  percentualMin: 90,
} as const;

export type MotivoRejeicao = "dados_invalidos" | "percentual" | "fora_da_faixa";

export interface FeatureItbi {
  valor: number | null | undefined;
  area: number | null | undefined;
  logradouro: string | null | undefined;
  /** Escrituras do agregado; a API às vezes omite (padrão 1). */
  totalTransacoes?: number | null;
  /** Percentual médio transferido; a API às vezes omite (padrão 100). */
  percentualTransferido?: number | null;
}

export interface FeatureAceita {
  valor: number;
  area: number;
  valorM2: number;
  totalTransacoes: number;
  percentualTransferido: number;
}

/**
 * Aplica as regras de aceitação. Devolve a feature normalizada ou o motivo
 * da rejeição, na mesma ordem em que a carga completa sempre avaliou:
 * dados obrigatórios → percentual → faixas de área, valor e R$/m².
 */
export const validarFeatureItbi = (
  f: FeatureItbi,
  limites: typeof LIMITES_INGESTAO = LIMITES_INGESTAO
): { ok: true; feature: FeatureAceita } | { ok: false; motivo: MotivoRejeicao } => {
  const valor = f.valor ?? null;
  const area = f.area ?? null;
  if (!f.logradouro || valor === null || area === null || valor <= 0 || area <= 0) {
    return { ok: false, motivo: "dados_invalidos" };
  }
  const percentualTransferido = f.percentualTransferido ?? 100;
  if (percentualTransferido < limites.percentualMin) return { ok: false, motivo: "percentual" };

  const valorM2 = valor / area;
  if (area < limites.areaMinM2 || area > limites.areaMaxM2) return { ok: false, motivo: "fora_da_faixa" };
  if (valor < limites.valorMin || valor > limites.valorMax) return { ok: false, motivo: "fora_da_faixa" };
  if (valorM2 < limites.valorM2Min || valorM2 > limites.valorM2Max) return { ok: false, motivo: "fora_da_faixa" };

  const totalTransacoes = Math.max(1, Math.round(f.totalTransacoes ?? 1));
  return { ok: true, feature: { valor, area, valorM2, totalTransacoes, percentualTransferido } };
};
