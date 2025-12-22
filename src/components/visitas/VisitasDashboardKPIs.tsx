import { Calendar, CheckCircle, TrendingUp, Star, XCircle, MessageSquare } from "lucide-react";
import { KPICard } from "@/components/KPICard";

interface VisitasStats {
  totalAgendadas: number;
  totalRealizadas: number;
  totalCanceladas: number;
  realizadasMesAtual: number;
  variacaoMensal: number;
  taxaConversao: number;
  avaliacaoMedia: number;
  totalFeedbacks: number;
}

interface VisitasDashboardKPIsProps {
  stats: VisitasStats | undefined;
  isLoading: boolean;
}

export function VisitasDashboardKPIs({ stats, isLoading }: VisitasDashboardKPIsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const variacaoFormatada = stats.variacaoMensal > 0 
    ? `+${stats.variacaoMensal.toFixed(0)}% vs mês ant.`
    : stats.variacaoMensal < 0 
    ? `${stats.variacaoMensal.toFixed(0)}% vs mês ant.`
    : "sem variação";

  const trendVariacao = stats.variacaoMensal > 0 ? "up" : stats.variacaoMensal < 0 ? "down" : "neutral";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPICard
        title="Agendadas"
        value={stats.totalAgendadas.toString()}
        subtitle="aguardando"
        icon={Calendar}
        trend="neutral"
      />
      <KPICard
        title="Realizadas"
        value={stats.totalRealizadas.toString()}
        subtitle={`${stats.realizadasMesAtual} este mês`}
        change={variacaoFormatada}
        icon={CheckCircle}
        trend={trendVariacao}
      />
      <KPICard
        title="Canceladas"
        value={stats.totalCanceladas.toString()}
        subtitle="total"
        icon={XCircle}
        trend="neutral"
      />
      <KPICard
        title="Conversão"
        value={`${stats.taxaConversao.toFixed(1)}%`}
        subtitle="compraria o imóvel"
        icon={TrendingUp}
        trend={stats.taxaConversao >= 30 ? "up" : "neutral"}
      />
      <KPICard
        title="Avaliação"
        value={stats.avaliacaoMedia > 0 ? `${stats.avaliacaoMedia.toFixed(1)}/5` : "-"}
        subtitle="média geral"
        icon={Star}
        trend={stats.avaliacaoMedia >= 4 ? "up" : "neutral"}
      />
      <KPICard
        title="Feedbacks"
        value={stats.totalFeedbacks.toString()}
        subtitle="recebidos"
        icon={MessageSquare}
        trend="neutral"
      />
    </div>
  );
}
