import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { MicrobairroCard } from "@/components/MicrobairroCard";
import { useMicrobairroDetalhado } from "@/hooks/useITBITransactions";
import { BairroSelector } from "@/components/BairroSelector";
import { Skeleton } from "@/components/ui/skeleton";

const STORAGE_KEY = 'godoy-selected-bairro';
const DEFAULT_BAIRRO = 'BARRA DA TIJUCA';

export default function Microbairros() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get bairro from URL params or localStorage
  const getBairroFromStorage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_BAIRRO;
    } catch {
      return DEFAULT_BAIRRO;
    }
  };

  const urlBairro = searchParams.get('bairro');
  const [selectedBairro, setSelectedBairroState] = useState(urlBairro || getBairroFromStorage());

  // Update URL and localStorage when bairro changes
  const setSelectedBairro = (bairro: string) => {
    setSelectedBairroState(bairro);
    setSearchParams({ bairro });
    try {
      localStorage.setItem(STORAGE_KEY, bairro);
    } catch {
      // localStorage not available
    }
  };

  // Sync with URL params on mount
  useEffect(() => {
    if (urlBairro && urlBairro !== selectedBairro) {
      setSelectedBairroState(urlBairro);
    }
  }, [urlBairro]);

  const { data: microbairros, isLoading } = useMicrobairroDetalhado(selectedBairro);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-10 w-64 sm:w-96" />
          <Skeleton className="h-4 sm:h-5 w-full sm:w-[500px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[320px] sm:h-[400px]" />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-accent flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0C2340]">Análise por Microregiões</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Comparativo de performance regional em {selectedBairro} (2025)
            </p>
          </div>
          <BairroSelector value={selectedBairro} onChange={setSelectedBairro} />
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
