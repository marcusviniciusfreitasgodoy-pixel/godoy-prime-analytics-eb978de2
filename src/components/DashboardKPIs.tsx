import { TrendingUp, Activity, TrendingDown, MapPin } from "lucide-react";
import { KPICard } from "./KPICard";
import { useKPIStats } from "@/hooks/useKPIStats";
import { Skeleton } from "./ui/skeleton";
import { MethodologyDisclaimer } from "./MethodologyDisclaimer";

export function DashboardKPIs() {
  const { data: stats, isLoading } = useKPIStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const variacaoPositiva = parseFloat(stats.variacaoAnual) >= 0;
  const variacaoMensalPositiva = parseFloat(stats.variacaoMensal) >= 0;

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <MethodologyDisclaimer />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title={`Preço Médio (${currentYear} YTD)`}
        value={`R$ ${stats.precoMedio.toLocaleString('pt-BR')}`}
        change={`${variacaoMensalPositiva ? '+' : ''}${stats.variacaoMensal}% vs mês anterior`}
        icon={TrendingUp}
        trend={variacaoMensalPositiva ? "up" : "down"}
        breakdown={{
          apt: `R$ ${stats.precoMedioApt.toLocaleString('pt-BR')}`,
          casa: `R$ ${stats.precoMedioCasa.toLocaleString('pt-BR')}`,
        }}
      />
      <KPICard
        title={`Liquidez (Acumulado ${currentYear})`}
        value={stats.liquidez.toString()}
        subtitle="transações volume total"
        icon={Activity}
        trend="neutral"
        breakdown={{
          apt: stats.liquidezApt.toString(),
          casa: stats.liquidezCasa.toString(),
        }}
      />
      <KPICard
        title="Variação Anual (YoY)"
        value={`${parseFloat(stats.variacaoAnual) >= 0 ? '+' : ''}${stats.variacaoAnual}%`}
        subtitle="últimos 12 meses"
        icon={variacaoPositiva ? TrendingUp : TrendingDown}
        trend={variacaoPositiva ? "up" : "down"}
        breakdown={{
          apt: `${parseFloat(stats.variacaoAnualApt) >= 0 ? '+' : ''}${stats.variacaoAnualApt}%`,
          casa: `${parseFloat(stats.variacaoAnualCasa) >= 0 ? '+' : ''}${stats.variacaoAnualCasa}%`,
        }}
      />
      <KPICard
        title="Bairro Mais Valorizado"
        value={stats.bairroMaisValorizado}
        subtitle="média/m²"
        icon={MapPin}
        trend="up"
        breakdown={{
          apt: `R$ ${stats.precoMedioBairroApt.toLocaleString('pt-BR')}`,
          casa: `R$ ${stats.precoMedioBairroCasa.toLocaleString('pt-BR')}`,
        }}
      />
      </div>
    </div>
  );
}
