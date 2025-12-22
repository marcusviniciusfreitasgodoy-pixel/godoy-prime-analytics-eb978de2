import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

interface VisitasStats {
  totalAgendadas: number;
  totalRealizadas: number;
  totalCanceladas: number;
  realizadasMesAtual: number;
  realizadasMesAnterior: number;
  variacaoMensal: number;
  taxaConversao: number;
  avaliacaoMedia: number;
  totalFeedbacks: number;
  feedbacksPositivos: number;
}

interface CorretorStats {
  nome: string;
  totalVisitas: number;
  realizadas: number;
  avaliacaoMedia: number;
}

interface EvolucaoMensal {
  mes: string;
  agendadas: number;
  realizadas: number;
  canceladas: number;
}

export function useVisitasStats() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["visitas-stats"],
    queryFn: async (): Promise<VisitasStats> => {
      const inicioMesAtual = startOfMonth(new Date()).toISOString();
      const inicioMesAnterior = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const fimMesAnterior = startOfMonth(new Date()).toISOString();

      // Buscar todas as fichas de visita
      const { data: fichas, error: fichasError } = await supabase
        .from("fichas_visita")
        .select("*");

      if (fichasError) throw fichasError;

      // Buscar feedbacks
      const { data: feedbacks, error: feedbacksError } = await supabase
        .from("feedbacks_visita" as any)
        .select("*");

      if (feedbacksError) throw feedbacksError;

      const fichasData = fichas || [];
      const feedbacksData = (feedbacks || []) as any[];

      // Contagens por status
      const totalAgendadas = fichasData.filter(f => f.status === "agendada").length;
      const totalRealizadas = fichasData.filter(f => f.status === "realizada").length;
      const totalCanceladas = fichasData.filter(f => f.status === "cancelada").length;

      // Realizadas no mês atual
      const realizadasMesAtual = fichasData.filter(
        f => f.status === "realizada" && f.data_visita >= inicioMesAtual
      ).length;

      // Realizadas no mês anterior
      const realizadasMesAnterior = fichasData.filter(
        f => f.status === "realizada" && 
        f.data_visita >= inicioMesAnterior && 
        f.data_visita < fimMesAnterior
      ).length;

      // Variação mensal
      const variacaoMensal = realizadasMesAnterior > 0 
        ? ((realizadasMesAtual - realizadasMesAnterior) / realizadasMesAnterior) * 100 
        : 0;

      // Feedbacks e taxa de conversão
      const totalFeedbacks = feedbacksData.length;
      const feedbacksPositivos = feedbacksData.filter(f => f.compraria_imovel === true).length;
      const taxaConversao = totalFeedbacks > 0 ? (feedbacksPositivos / totalFeedbacks) * 100 : 0;

      // Avaliação média
      const avaliacoesValidas = feedbacksData.filter(f => f.avaliacao_geral != null);
      const avaliacaoMedia = avaliacoesValidas.length > 0
        ? avaliacoesValidas.reduce((sum, f) => sum + (f.avaliacao_geral || 0), 0) / avaliacoesValidas.length
        : 0;

      return {
        totalAgendadas,
        totalRealizadas,
        totalCanceladas,
        realizadasMesAtual,
        realizadasMesAnterior,
        variacaoMensal,
        taxaConversao,
        avaliacaoMedia,
        totalFeedbacks,
        feedbacksPositivos,
      };
    },
  });

  const { data: corretorRanking, isLoading: loadingRanking } = useQuery({
    queryKey: ["corretor-ranking"],
    queryFn: async (): Promise<CorretorStats[]> => {
      // Buscar fichas de visita com nome do corretor
      const { data: fichas, error: fichasError } = await supabase
        .from("fichas_visita")
        .select("id, nome_corretor, status");

      if (fichasError) throw fichasError;

      // Buscar feedbacks
      const { data: feedbacks, error: feedbacksError } = await supabase
        .from("feedbacks_visita" as any)
        .select("ficha_visita_id, avaliacao_geral");

      if (feedbacksError) throw feedbacksError;

      const fichasData = fichas || [];
      const feedbacksData = (feedbacks || []) as any[];

      // Agrupar por corretor
      const corretorMap = new Map<string, { total: number; realizadas: number; avaliacoes: number[] }>();

      fichasData.forEach(ficha => {
        const nome = ficha.nome_corretor || "Não informado";
        if (!corretorMap.has(nome)) {
          corretorMap.set(nome, { total: 0, realizadas: 0, avaliacoes: [] });
        }
        const stats = corretorMap.get(nome)!;
        stats.total++;
        if (ficha.status === "realizada") stats.realizadas++;

        // Buscar avaliação do feedback correspondente
        const feedback = feedbacksData.find(f => f.ficha_visita_id === ficha.id);
        if (feedback?.avaliacao_geral) {
          stats.avaliacoes.push(feedback.avaliacao_geral);
        }
      });

      // Converter para array e ordenar
      const ranking: CorretorStats[] = Array.from(corretorMap.entries()).map(([nome, data]) => ({
        nome,
        totalVisitas: data.total,
        realizadas: data.realizadas,
        avaliacaoMedia: data.avaliacoes.length > 0 
          ? data.avaliacoes.reduce((a, b) => a + b, 0) / data.avaliacoes.length 
          : 0,
      }));

      return ranking.sort((a, b) => b.realizadas - a.realizadas);
    },
  });

  const { data: evolucaoMensal, isLoading: loadingEvolucao } = useQuery({
    queryKey: ["visitas-evolucao"],
    queryFn: async (): Promise<EvolucaoMensal[]> => {
      // Buscar fichas dos últimos 6 meses
      const dataInicio = subMonths(new Date(), 5);
      
      const { data: fichas, error } = await supabase
        .from("fichas_visita")
        .select("data_visita, status")
        .gte("data_visita", startOfMonth(dataInicio).toISOString());

      if (error) throw error;

      const fichasData = fichas || [];

      // Agrupar por mês
      const mesesMap = new Map<string, { agendadas: number; realizadas: number; canceladas: number }>();

      // Inicializar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const mes = format(subMonths(new Date(), i), "MMM/yy");
        mesesMap.set(mes, { agendadas: 0, realizadas: 0, canceladas: 0 });
      }

      fichasData.forEach(ficha => {
        const mes = format(new Date(ficha.data_visita), "MMM/yy");
        if (mesesMap.has(mes)) {
          const stats = mesesMap.get(mes)!;
          if (ficha.status === "agendada") stats.agendadas++;
          else if (ficha.status === "realizada") stats.realizadas++;
          else if (ficha.status === "cancelada") stats.canceladas++;
        }
      });

      return Array.from(mesesMap.entries()).map(([mes, data]) => ({
        mes,
        ...data,
      }));
    },
  });

  return {
    stats,
    corretorRanking,
    evolucaoMensal,
    isLoading: loadingStats || loadingRanking || loadingEvolucao,
  };
}
