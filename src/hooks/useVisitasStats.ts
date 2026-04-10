import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_VISITAS_STATS, DEMO_CORRETOR_RANKING, DEMO_EVOLUCAO_MENSAL } from "@/data/demoData";

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
  const { isDemo } = useDemo();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["visitas-stats"],
    queryFn: async (): Promise<VisitasStats> => {
      if (isDemo) return DEMO_VISITAS_STATS;

      const inicioMesAtual = startOfMonth(new Date()).toISOString();
      const inicioMesAnterior = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const fimMesAnterior = startOfMonth(new Date()).toISOString();

      const [
        { data: fichas, error: fichasError },
        { data: feedbacks, error: feedbacksError },
        { data: agendamentos, error: agendamentosError },
      ] = await Promise.all([
        supabase.from("fichas_visita").select("*"),
        supabase.from("feedbacks_visita" as any).select("*"),
        supabase.from("agendamentos_visita" as any).select("status"),
      ]);

      if (fichasError) throw fichasError;
      if (feedbacksError) throw feedbacksError;
      if (agendamentosError) throw agendamentosError;

      const fichasData = fichas || [];
      const feedbacksData = (feedbacks || []) as any[];
      const agendamentosData = (agendamentos || []) as unknown as Array<{ status: string | null }>;

      const totalAgendadas = agendamentosData.filter(
        (agendamento) => agendamento.status === "agendada" || agendamento.status === "confirmada"
      ).length;
      const totalRealizadas = fichasData.filter(f => f.status === "realizada").length;
      const totalCanceladas = agendamentosData.filter((agendamento) => agendamento.status === "cancelada").length;
      const realizadasMesAtual = fichasData.filter(f => f.status === "realizada" && f.data_visita >= inicioMesAtual).length;
      const realizadasMesAnterior = fichasData.filter(f => f.status === "realizada" && f.data_visita >= inicioMesAnterior && f.data_visita < fimMesAnterior).length;
      const variacaoMensal = realizadasMesAnterior > 0 ? ((realizadasMesAtual - realizadasMesAnterior) / realizadasMesAnterior) * 100 : 0;

      const totalFeedbacks = feedbacksData.length;
      const feedbacksPositivos = feedbacksData.filter(f => f.compraria_imovel === true).length;
      const taxaConversao = totalFeedbacks > 0 ? (feedbacksPositivos / totalFeedbacks) * 100 : 0;

      const avaliacoesValidas = feedbacksData.filter(f => f.avaliacao_geral != null);
      const avaliacaoMedia = avaliacoesValidas.length > 0
        ? avaliacoesValidas.reduce((sum: number, f: any) => sum + (f.avaliacao_geral || 0), 0) / avaliacoesValidas.length
        : 0;

      return { totalAgendadas, totalRealizadas, totalCanceladas, realizadasMesAtual, realizadasMesAnterior, variacaoMensal, taxaConversao, avaliacaoMedia, totalFeedbacks, feedbacksPositivos };
    },
    staleTime: isDemo ? Infinity : 0,
  });

  const { data: corretorRanking, isLoading: loadingRanking } = useQuery({
    queryKey: ["corretor-ranking"],
    queryFn: async (): Promise<CorretorStats[]> => {
      if (isDemo) return DEMO_CORRETOR_RANKING;

      const { data: fichas, error: fichasError } = await supabase.from("fichas_visita").select("id, nome_corretor, status");
      if (fichasError) throw fichasError;

      const { data: feedbacks, error: feedbacksError } = await supabase.from("feedbacks_visita" as any).select("ficha_visita_id, avaliacao_geral");
      if (feedbacksError) throw feedbacksError;

      const fichasData = fichas || [];
      const feedbacksData = (feedbacks || []) as any[];
      const corretorMap = new Map<string, { total: number; realizadas: number; avaliacoes: number[] }>();

      fichasData.forEach(ficha => {
        const nome = ficha.nome_corretor || "Não informado";
        if (!corretorMap.has(nome)) corretorMap.set(nome, { total: 0, realizadas: 0, avaliacoes: [] });
        const stats = corretorMap.get(nome)!;
        stats.total++;
        if (ficha.status === "realizada") stats.realizadas++;
        const feedback = feedbacksData.find(f => f.ficha_visita_id === ficha.id);
        if (feedback?.avaliacao_geral) stats.avaliacoes.push(feedback.avaliacao_geral);
      });

      const ranking: CorretorStats[] = Array.from(corretorMap.entries()).map(([nome, data]) => ({
        nome, totalVisitas: data.total, realizadas: data.realizadas,
        avaliacaoMedia: data.avaliacoes.length > 0 ? data.avaliacoes.reduce((a, b) => a + b, 0) / data.avaliacoes.length : 0,
      }));
      return ranking.sort((a, b) => b.realizadas - a.realizadas);
    },
    staleTime: isDemo ? Infinity : 0,
  });

  const { data: evolucaoMensal, isLoading: loadingEvolucao } = useQuery({
    queryKey: ["visitas-evolucao"],
    queryFn: async (): Promise<EvolucaoMensal[]> => {
      if (isDemo) return DEMO_EVOLUCAO_MENSAL;

      const dataInicio = subMonths(new Date(), 5);
      const { data: fichas, error } = await supabase.from("fichas_visita")
        .select("data_visita, status").gte("data_visita", startOfMonth(dataInicio).toISOString());
      if (error) throw error;

      const fichasData = fichas || [];
      const mesesMap = new Map<string, { agendadas: number; realizadas: number; canceladas: number }>();
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

      return Array.from(mesesMap.entries()).map(([mes, data]) => ({ mes, ...data }));
    },
    staleTime: isDemo ? Infinity : 0,
  });

  return { stats, corretorRanking, evolucaoMensal, isLoading: loadingStats || loadingRanking || loadingEvolucao };
}
