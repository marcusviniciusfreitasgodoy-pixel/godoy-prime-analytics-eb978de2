import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeedbackRaw {
  id: string;
  avaliacao_geral: number | null;
  nivel_interesse: string | null;
  percepcao_valor: string | null;
  gostaria_fazer_proposta: boolean | null;
  conexao_imovel: number | null;
  efeito_uau: string[] | null;
  created_at: string | null;
  ficha?: {
    codigo: string;
    nome_visitante: string;
    endereco_imovel: string;
    data_visita: string;
  };
}

export interface FeedbackAnalytics {
  totalFeedbacks: number;
  avgRating: number;
  proposalRate: number;
  justValueRate: number;
  avgConexao: number;
  distributionByRating: { nota: string; count: number }[];
  interestDistribution: { nivel: string; count: number }[];
  valuePerception: { percepcao: string; count: number }[];
  monthlyTrend: { mes: string; mediaAvaliacao: number; totalFeedbacks: number }[];
  topEfeitosUau: { efeito: string; count: number }[];
  recentFeedbacks: FeedbackRaw[];
}

function computeAnalytics(feedbacks: FeedbackRaw[]): FeedbackAnalytics {
  const total = feedbacks.length;

  // Avg rating
  const rated = feedbacks.filter((f) => f.avaliacao_geral != null);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, f) => sum + (f.avaliacao_geral ?? 0), 0) / rated.length
    : 0;

  // Proposal rate
  const withProposal = feedbacks.filter((f) => f.gostaria_fazer_proposta != null);
  const proposalRate = withProposal.length > 0
    ? (withProposal.filter((f) => f.gostaria_fazer_proposta).length / withProposal.length) * 100
    : 0;

  // Just value rate
  const withValue = feedbacks.filter((f) => f.percepcao_valor != null);
  const justValueRate = withValue.length > 0
    ? (withValue.filter((f) => f.percepcao_valor === "justo").length / withValue.length) * 100
    : 0;

  // Avg conexao
  const withConexao = feedbacks.filter((f) => f.conexao_imovel != null);
  const avgConexao = withConexao.length > 0
    ? withConexao.reduce((sum, f) => sum + (f.conexao_imovel ?? 0), 0) / withConexao.length
    : 0;

  // Distribution by rating
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rated.forEach((f) => {
    const r = f.avaliacao_geral!;
    if (r >= 1 && r <= 5) ratingCounts[r]++;
  });
  const distributionByRating = [5, 4, 3, 2, 1].map((n) => ({
    nota: `${n} ★`,
    count: ratingCounts[n],
  }));

  // Interest distribution
  const interestMap: Record<string, number> = {};
  const interestLabels: Record<string, string> = {
    muito_alto: "Muito Alto",
    alto: "Alto",
    medio: "Médio",
    baixo: "Baixo",
  };
  feedbacks.forEach((f) => {
    if (f.nivel_interesse) {
      const label = interestLabels[f.nivel_interesse] || f.nivel_interesse;
      interestMap[label] = (interestMap[label] || 0) + 1;
    }
  });
  const interestDistribution = Object.entries(interestMap).map(([nivel, count]) => ({ nivel, count }));

  // Value perception
  const valueMap: Record<string, number> = {};
  const valueLabels: Record<string, string> = {
    abaixo: "Abaixo",
    justo: "Justo",
    acima: "Acima",
  };
  feedbacks.forEach((f) => {
    if (f.percepcao_valor) {
      const label = valueLabels[f.percepcao_valor] || f.percepcao_valor;
      valueMap[label] = (valueMap[label] || 0) + 1;
    }
  });
  const valuePerception = Object.entries(valueMap).map(([percepcao, count]) => ({ percepcao, count }));

  // Monthly trend (last 6 months)
  const sixMonthsAgo = subMonths(new Date(), 6);
  const monthlyMap: Record<string, { sum: number; count: number }> = {};
  feedbacks.forEach((f) => {
    if (f.created_at && f.avaliacao_geral != null) {
      const d = new Date(f.created_at);
      if (d >= sixMonthsAgo) {
        const key = format(d, "MMM/yy", { locale: ptBR });
        if (!monthlyMap[key]) monthlyMap[key] = { sum: 0, count: 0 };
        monthlyMap[key].sum += f.avaliacao_geral;
        monthlyMap[key].count++;
      }
    }
  });
  // Build ordered array for last 6 months
  const monthlyTrend: FeedbackAnalytics["monthlyTrend"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = format(d, "MMM/yy", { locale: ptBR });
    const entry = monthlyMap[key];
    monthlyTrend.push({
      mes: key,
      mediaAvaliacao: entry ? Number((entry.sum / entry.count).toFixed(1)) : 0,
      totalFeedbacks: entry?.count || 0,
    });
  }

  // Top efeitos UAU
  const efeitoMap: Record<string, number> = {};
  feedbacks.forEach((f) => {
    if (f.efeito_uau) {
      f.efeito_uau.forEach((e) => {
        efeitoMap[e] = (efeitoMap[e] || 0) + 1;
      });
    }
  });
  const topEfeitosUau = Object.entries(efeitoMap)
    .map(([efeito, count]) => ({ efeito, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    totalFeedbacks: total,
    avgRating,
    proposalRate,
    justValueRate,
    avgConexao,
    distributionByRating,
    interestDistribution,
    valuePerception,
    monthlyTrend,
    topEfeitosUau,
    recentFeedbacks: feedbacks.slice(0, 10),
  };
}

export function useFeedbackAnalytics() {
  return useQuery({
    queryKey: ["feedback-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedbacks_visita" as any)
        .select(`
          *,
          ficha:fichas_visita!ficha_visita_id(codigo, nome_visitante, endereco_imovel, data_visita)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const feedbacks = data as unknown as FeedbackRaw[];
      return computeAnalytics(feedbacks);
    },
  });
}
