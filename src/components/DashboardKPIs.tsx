import { TrendingUp, Activity, TrendingDown, MapPin } from "lucide-react";
import { KPICard } from "./KPICard";
import { useKPIStats } from "@/hooks/useITBITransactions";
import { Skeleton } from "./ui/skeleton";

export function DashboardKPIs() {
  const { data: stats, isLoading } = useKPIStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const variacaoPositiva = parseFloat(stats.variacaoAnual) >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Preço Médio (R$/m²)"
        value={`R$ ${stats.precoMedio.toLocaleString('pt-BR')}`}
        change="Últimos 12 meses"
        icon={TrendingUp}
        trend="up"
      />
      <KPICard
        title="Liquidez (Volume)"
        value={stats.liquidez.toString()}
        change="Imóveis vendidos (12 meses)"
        icon={Activity}
        trend="up"
      />
      <KPICard
        title="Variação Anual (YoY)"
        value={`${stats.variacaoAnual}%`}
        change={`${variacaoPositiva ? 'Alta' : 'Queda'} vs 12 meses anteriores`}
        icon={variacaoPositiva ? TrendingUp : TrendingDown}
        trend={variacaoPositiva ? "up" : "down"}
      />
      <KPICard
        title="Bairro Mais Valorizado"
        value={stats.bairroMaisValorizado}
        change={`R$ ${Math.round(stats.precoMedioBairro).toLocaleString('pt-BR')}/m²`}
        icon={MapPin}
        trend="up"
      />
    </div>
  );
}
