import { Building2, TrendingUp, Home, Target } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { PriceChart } from "@/components/PriceChart";
import { PropertyTable } from "@/components/PropertyTable";
import { useKPIStats } from "@/hooks/useKPIStats";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const stats = useKPIStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Painel</h2>
        <p className="text-muted-foreground mt-1">Mercado imobiliário premium - Barra da Tijuca</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total de Propriedades"
          value={stats.totalProperties.toString()}
          change="+12% vs mês anterior"
          icon={Building2}
          trend="up"
        />
        <KPICard
          title="Preço Médio"
          value={stats.averagePrice}
          change="+8% vs mês anterior"
          icon={TrendingUp}
          trend="up"
        />
        <KPICard
          title="Anúncios Ativos"
          value={stats.activeListings.toString()}
          change="+5% vs mês anterior"
          icon={Home}
          trend="up"
        />
        <KPICard
          title="Taxa de Fechamento"
          value={stats.closingRate}
          change="+3% vs mês anterior"
          icon={Target}
          trend="up"
        />
      </div>

      <PriceChart />
      
      <PropertyTable />
    </div>
  );
}
