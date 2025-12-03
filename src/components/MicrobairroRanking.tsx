import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { useMicrobairroRanking } from "@/hooks/useITBITransactions";
import { Skeleton } from "./ui/skeleton";

interface MicrobairroRankingProps {
  bairro?: string;
}

export function MicrobairroRanking({ bairro = "BARRA DA TIJUCA" }: MicrobairroRankingProps) {
  const { data: ranking, isLoading } = useMicrobairroRanking(bairro);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Ranking por Microbairro</CardTitle>
          <CardDescription>Mês referência:</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const sortedRanking = [...(ranking || [])]
    .filter(item => item.microbairro && item.microbairro.toUpperCase() !== 'OUTROS')
    .sort((a, b) => (b.preco_medio_m2 || 0) - (a.preco_medio_m2 || 0));

  const maxValue = Math.max(...sortedRanking.map(r => r.preco_medio_m2 || 0));

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <Card>
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Ranking por Microbairro</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Mês referência: {currentMonth}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {sortedRanking.slice(0, 8).map((item, index) => {
          const percentage = maxValue > 0 ? ((item.preco_medio_m2 || 0) / maxValue) * 100 : 0;
          
          return (
            <div key={item.microbairro || index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-foreground sm:min-w-[120px] truncate">
                {item.microbairro || 'N/A'}
              </span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-5 sm:h-6 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground min-w-[60px] sm:min-w-[70px] text-right">
                  R$ {((item.preco_medio_m2 || 0) / 1000).toFixed(1)}k/m²
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
