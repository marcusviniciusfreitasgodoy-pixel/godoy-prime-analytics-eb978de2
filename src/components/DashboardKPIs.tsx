import { TrendingUp, Activity, TrendingDown, MapPin, Building2, BarChart3 } from "lucide-react";
import { KPICard } from "./KPICard";
import { useKPIStats } from "@/hooks/useKPIStats";
import { useTerritorialKPIs } from "@/hooks/useTerritorialData";
import { Skeleton } from "./ui/skeleton";
import { MethodologyDisclaimer } from "./MethodologyDisclaimer";

interface DashboardKPIsProps {
  bairro?: string;
}

export function DashboardKPIs({ bairro = "BARRA DA TIJUCA" }: DashboardKPIsProps) {
  const { data: stats, isLoading } = useKPIStats(bairro);
  const { data: territorialKpis } = useTerritorialKPIs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 md:h-40" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const variacaoAnualNum = parseFloat(stats.variacaoAnual);
  const variacaoMensalNum = parseFloat(stats.variacaoMensal);
  const variacaoPositiva = !isNaN(variacaoAnualNum) && variacaoAnualNum >= 0;
  const variacaoMensalPositiva = !isNaN(variacaoMensalNum) && variacaoMensalNum >= 0;
  const variacaoMensalDisponivel = stats.variacaoMensal !== 'N/A';

  const currentYear = new Date().getFullYear();

  // Formatar variação mensal com mês de referência
  const formatarVariacaoMensal = () => {
    if (!variacaoMensalDisponivel) return 'Dados insuficientes';
    const prefix = variacaoMensalPositiva ? '+' : '';
    const mesRef = stats.mesReferencia !== 'N/A' ? ` (${stats.mesReferencia})` : '';
    return `${prefix}${stats.variacaoMensal}% vs mês anterior${mesRef}`;
  };

  return (
    <div className="space-y-1.5 sm:space-y-3">
      <div className="flex justify-end">
        <MethodologyDisclaimer />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4">
      <KPICard
        title={`Preço Médio (${currentYear} YTD)`}
        value={`R$ ${stats.precoMedio.toLocaleString('pt-BR')}`}
        change={formatarVariacaoMensal()}
        icon={TrendingUp}
        trend={variacaoMensalDisponivel ? (variacaoMensalPositiva ? "up" : "down") : "neutral"}
        breakdown={{
          apt: `R$ ${stats.precoMedioApt.toLocaleString('pt-BR')}`,
          casa: `R$ ${stats.precoMedioCasa.toLocaleString('pt-BR')}`,
        }}
      />
      <KPICard
        title="Liquidez (Últimos 12 meses)"
        value={stats.liquidez.toString()}
        subtitle="transações no período"
        icon={Activity}
        trend="neutral"
        breakdown={{
          apt: stats.liquidezApt.toString(),
          casa: stats.liquidezCasa.toString(),
        }}
      />
      <KPICard
        title="Variação Anual (YoY)"
        value={stats.variacaoAnual === 'N/A' ? 'N/A' : `${variacaoPositiva ? '+' : ''}${stats.variacaoAnual}%`}
        subtitle="Últimos 12 meses vs período anterior"
        icon={variacaoPositiva ? TrendingUp : TrendingDown}
        trend={stats.variacaoAnual === 'N/A' ? "neutral" : (variacaoPositiva ? "up" : "down")}
        breakdown={{
          apt: stats.variacaoAnualApt === 'N/A' ? 'N/A' : `${parseFloat(stats.variacaoAnualApt) >= 0 ? '+' : ''}${stats.variacaoAnualApt}%`,
          casa: stats.variacaoAnualCasa === 'N/A' ? 'N/A' : `${parseFloat(stats.variacaoAnualCasa) >= 0 ? '+' : ''}${stats.variacaoAnualCasa}%`,
        }}
      />
      <KPICard
        title="Região Mais Valorizada (Ano)"
        value={stats.bairroMaisValorizado}
        subtitle={`R$ ${stats.precoMedioBairro.toLocaleString('pt-BR')}/m² • variação anual`}
        icon={MapPin}
        trend="up"
        breakdown={{
          apt: `R$ ${stats.precoMedioBairroApt.toLocaleString('pt-BR')}`,
          casa: `R$ ${stats.precoMedioBairroCasa.toLocaleString('pt-BR')}`,
        }}
      />
      {territorialKpis && (
        <>
          <KPICard
            title="Condomínios Mapeados"
            value={territorialKpis.total_condominios?.toLocaleString("pt-BR") ?? "—"}
            subtitle="Barra da Tijuca"
            icon={Building2}
            trend="neutral"
          />
          <KPICard
            title="Com Histórico de Preços"
            value={territorialKpis.com_historico_precos?.toLocaleString("pt-BR") ?? "—"}
            subtitle="Dados ITBI reais"
            icon={BarChart3}
            trend="neutral"
          />
        </>
      )}
      </div>
    </div>
  );
}
