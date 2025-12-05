import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { useMicrobairroRanking } from "@/hooks/useITBITransactions";
import { Skeleton } from "./ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { TrendingUp, Activity } from "lucide-react";

interface MicrobairroRankingProps {
  bairro?: string;
}

type ViewMode = 'valorization' | 'liquidity';

export function MicrobairroRanking({ bairro = "BARRA DA TIJUCA" }: MicrobairroRankingProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('valorization');
  const { data: ranking, isLoading } = useMicrobairroRanking(bairro);

  const title = viewMode === 'valorization' 
    ? 'Ranking por Valorização' 
    : 'Ranking por Liquidez';

  const subtitle = viewMode === 'valorization'
    ? 'Regiões mais valorizadas (R$/m²)'
    : 'Regiões com maior volume de vendas';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filtrar "Outros" e ordenar conforme modo selecionado
  const sortedRanking = [...(ranking || [])]
    .filter(item => {
      if (!item.microbairro) return false;
      const nome = item.microbairro.toLowerCase().trim();
      return nome !== 'outros';
    })
    .sort((a, b) => {
      if (viewMode === 'valorization') {
        return (b.preco_medio_m2 || 0) - (a.preco_medio_m2 || 0);
      }
      return (b.total_transacoes || 0) - (a.total_transacoes || 0);
    });

  const maxValue = viewMode === 'valorization'
    ? Math.max(...sortedRanking.map(r => r.preco_medio_m2 || 0))
    : Math.max(...sortedRanking.map(r => r.total_transacoes || 0));

  // Calcular período dos últimos 12 meses
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const periodText = `${startDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} - ${now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;

  return (
    <Card>
      <CardHeader className="pb-2 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{subtitle} • {periodText}</CardDescription>
          </div>
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="justify-start sm:justify-end"
          >
            <ToggleGroupItem value="valorization" size="sm" className="text-xs px-2 py-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              R$/m²
            </ToggleGroupItem>
            <ToggleGroupItem value="liquidity" size="sm" className="text-xs px-2 py-1">
              <Activity className="h-3 w-3 mr-1" />
              Trans.
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {sortedRanking.slice(0, 8).map((item, index) => {
          const value = viewMode === 'valorization' 
            ? (item.preco_medio_m2 || 0) 
            : (item.total_transacoes || 0);
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          const primaryValue = viewMode === 'valorization'
            ? `R$ ${((item.preco_medio_m2 || 0) / 1000).toFixed(1)}k/m²`
            : `${item.total_transacoes || 0} trans.`;
          
          const secondaryValue = viewMode === 'valorization'
            ? `${item.total_transacoes || 0} trans.`
            : `R$ ${((item.preco_medio_m2 || 0) / 1000).toFixed(1)}k/m²`;
          
          return (
            <div key={item.microbairro || index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="flex items-center gap-2 sm:min-w-[140px]">
                <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                  {item.microbairro || 'N/A'}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  ({secondaryValue})
                </span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-5 sm:h-6 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground min-w-[60px] sm:min-w-[80px] text-right">
                  {primaryValue}
                </span>
              </div>
            </div>
          );
        })}

        {sortedRanking.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
