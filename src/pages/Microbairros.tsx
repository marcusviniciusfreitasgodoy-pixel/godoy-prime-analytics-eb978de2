import { MapPin } from "lucide-react";
import { MicrobairroCard } from "@/components/MicrobairroCard";
import { useMicrobairroDetalhado } from "@/hooks/useITBITransactions";
import { Skeleton } from "@/components/ui/skeleton";

export default function Microbairros() {
  const { data: microbairros, isLoading } = useMicrobairroDetalhado();

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

  const maxTransacoes = Math.max(...(microbairros || []).map((r) => r.total_transacoes), 1);

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
        {(microbairros || []).map((item) => (
          <MicrobairroCard
            key={item.microbairro}
            microbairro={item.microbairro}
            valor_m2={item.valor_m2}
            total_transacoes={item.total_transacoes}
            valor_m2_apt={item.valor_m2_apt}
            valor_m2_casa={item.valor_m2_casa}
            rank={item.rank}
            trend={item.trend}
            maxTransacoes={maxTransacoes}
          />
        ))}
      </div>

      {(microbairros || []).length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum dado disponível para exibição.
        </div>
      )}
    </div>
  );
}
