import { useState } from "react";
import { MapPin, GitCompare, Plus, X } from "lucide-react";
import { MicrobairroCard } from "@/components/MicrobairroCard";
import { useMicrobairroDetalhado } from "@/hooks/useITBITransactions";
import { useBairro } from "@/contexts/BairroContext";
import { BairroSelector } from "@/components/BairroSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStreetComparison } from "@/hooks/useStreetComparison";
import { StreetComparisonChart } from "@/components/StreetComparisonChart";

export default function Microbairros() {
  const { selectedBairro, setSelectedBairro } = useBairro();
  const { data: microbairros, isLoading } = useMicrobairroDetalhado(selectedBairro);
  const [selectedStreets, setSelectedStreets] = useState<string[]>([]);
  
  // Hook para comparativo de ruas
  const { data: streetComparisonData, isLoading: isLoadingComparison } = useStreetComparison(
    selectedStreets, 
    12, 
    selectedBairro
  );

  const handleAddStreet = (logradouro: string) => {
    if (selectedStreets.length < 5 && !selectedStreets.includes(logradouro)) {
      setSelectedStreets([...selectedStreets, logradouro]);
    }
  };

  const handleRemoveStreet = (logradouro: string) => {
    setSelectedStreets(selectedStreets.filter(s => s !== logradouro));
  };

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

      {/* Comparativo de Ruas */}
      <Card className="border-accent/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5 text-accent" />
            Comparativo de Ruas
            <Badge variant="secondary" className="ml-2">{selectedStreets.length}/5</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Clique no botão "+" nos cards abaixo para comparar até 5 ruas
          </p>
        </CardHeader>
        <CardContent>
          {selectedStreets.length > 0 ? (
            <div className="space-y-4">
              {/* Badges das ruas selecionadas */}
              <div className="flex flex-wrap gap-2">
                {selectedStreets.map((street) => (
                  <Badge 
                    key={street} 
                    variant="outline" 
                    className="pl-3 pr-1 py-1.5 gap-2"
                  >
                    <span className="text-xs max-w-[150px] truncate">{street}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0 hover:bg-destructive/20"
                      onClick={() => handleRemoveStreet(street)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              {/* Gráfico de comparação */}
              {isLoadingComparison ? (
                <Skeleton className="h-[200px] w-full" />
              ) : streetComparisonData && streetComparisonData.length > 0 ? (
                <StreetComparisonChart data={streetComparisonData} />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Carregando dados de comparação...
                </div>
              )}

              {/* Tabela de estatísticas */}
              {streetComparisonData && streetComparisonData.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {streetComparisonData.map((street) => (
                    <div key={street.logradouro} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-foreground truncate mb-2" title={street.logradouro}>
                        {street.logradouro}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Mediana</p>
                          <p className="font-bold text-primary">
                            R$ {street.mediana_m2.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Transações</p>
                          <p className="font-bold text-foreground">{street.total_transacoes}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Selecione ruas nos cards abaixo para comparar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {(microbairros || []).map((item) => (
          <div key={item.microbairro} className="relative group">
            <MicrobairroCard
              microbairro={item.microbairro}
              valor_m2={item.valor_m2}
              total_transacoes={item.total_transacoes}
              valor_m2_apt={item.valor_m2_apt}
              valor_m2_casa={item.valor_m2_casa}
              rank={item.rank}
              trend={item.trend}
              maxTransacoes={maxTransacoes}
              condominioNome={item.condominioNome}
              isTechnicalCode={item.isTechnicalCode}
            />
            {/* Botão de adicionar ao comparativo */}
            {!selectedStreets.includes(item.microbairro) && selectedStreets.length < 5 && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                onClick={() => handleAddStreet(item.microbairro)}
                title="Adicionar ao comparativo"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {selectedStreets.includes(item.microbairro) && (
              <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                Selecionado
              </Badge>
            )}
          </div>
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
