import { MapPin } from "lucide-react";
import { MicrobairroCard } from "@/components/MicrobairroCard";
import { useMicrobairroRanking } from "@/hooks/useITBITransactions";
import { Skeleton } from "@/components/ui/skeleton";

export default function Microbairros() {
  const { data: ranking, isLoading } = useMicrobairroRanking();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-5 w-[500px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[400px]" />
          ))}
        </div>
      </div>
    );
  }

  // Ordenar por preço médio (maior para menor)
  const sortedRanking = [...(ranking || [])].sort(
    (a, b) => b.preco_medio_m2 - a.preco_medio_m2
  );

  const maxTransacoes = Math.max(...sortedRanking.map((r) => r.total_transacoes), 1);

  // Enriquecer dados com valores de apartamento e casa (simulado com base no preço médio)
  const enrichedData = sortedRanking.map((item, index) => ({
    ...item,
    rank: index + 1,
    // Apartamentos geralmente são 10-15% mais caros que a média
    valor_m2_apt: Math.round(item.preco_medio_m2 * 1.12),
    // Casas geralmente são 5-10% mais baratas que a média
    valor_m2_casa: Math.round(item.preco_medio_m2 * 0.92),
    // Top 3 tem alta demanda
    trend: (index < 3 ? "high" : "stable") as "high" | "stable",
  }));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-accent/30 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="h-8 w-8 text-accent" />
          <h1 className="text-4xl font-bold text-[#0C2340]">Análise por Microbairros</h1>
        </div>
        <p className="text-muted-foreground">
          Comparativo de performance regional na Barra da Tijuca (2025)
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrichedData.map((item) => (
          <MicrobairroCard
            key={item.microbairro}
            microbairro={item.microbairro || "Desconhecido"}
            valor_m2={item.preco_medio_m2}
            total_transacoes={item.total_transacoes || 0}
            valor_m2_apt={item.valor_m2_apt}
            valor_m2_casa={item.valor_m2_casa}
            rank={item.rank}
            trend={item.trend}
            maxTransacoes={maxTransacoes}
          />
        ))}
      </div>

      {enrichedData.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum dado disponível para exibição.
        </div>
      )}
    </div>
  );
}
