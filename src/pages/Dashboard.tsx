import { Building2, TrendingUp, Home, Target } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { PriceChart } from "@/components/PriceChart";
import { PropertyTable } from "@/components/PropertyTable";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Mercado imobiliário premium - Barra da Tijuca</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Properties"
          value="247"
          change="+12% vs last month"
          icon={Building2}
          trend="up"
        />
        <KPICard
          title="Average Price"
          value="R$ 3.2M"
          change="+8% vs last month"
          icon={TrendingUp}
          trend="up"
        />
        <KPICard
          title="Active Listings"
          value="189"
          change="+5% vs last month"
          icon={Home}
          trend="up"
        />
        <KPICard
          title="Closing Rate"
          value="68%"
          change="+3% vs last month"
          icon={Target}
          trend="up"
        />
      </div>

      <PriceChart />
      
      <PropertyTable />
    </div>
  );
}
