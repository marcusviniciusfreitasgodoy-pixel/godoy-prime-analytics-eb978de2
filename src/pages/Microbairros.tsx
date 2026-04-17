import { useState, useMemo } from "react";
import { MapPin, GitCompare, Plus, X, LayoutGrid, List, TrendingUp, Building2, Home, Search, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MicrobairroCard } from "@/components/MicrobairroCard";
import { useMicrobairroDetalhado } from "@/hooks/useITBITransactions";
import { useBairro } from "@/contexts/BairroContext";
import { BairroSelector } from "@/components/BairroSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStreetComparison } from "@/hooks/useStreetComparison";
import { StreetComparisonChart } from "@/components/StreetComparisonChart";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { extractSimplifiedCode, normalizeAccents } from "@/lib/utils";
import { expandLogradouroSearchTerms } from "@/lib/logradouroSearch";

const ABBREV_MAP: Record<string, string> = {
  'AVN': 'Avenida', 'AV': 'Avenida', 'AV.': 'Avenida',
  'EST': 'Estrada', 'EST.': 'Estrada',
  'TV': 'Travessa', 'TV.': 'Travessa',
  'PCA': 'Praça', 'PC': 'Praça', 'PÇ': 'Praça',
  'AL': 'Alameda', 'AL.': 'Alameda',
  'R': 'Rua', 'R.': 'Rua',
};

function formatLogradouro(name: string): string {
  if (!name) return name;
  const parts = name.split(/\s+/);
  const prefix = parts[0]?.toUpperCase();
  if (ABBREV_MAP[prefix]) {
    const rest = parts.slice(1).map(w =>
      w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    return `${ABBREV_MAP[prefix]} ${rest}`;
  }
  // If already full word like AVENIDA, ESTRADA etc, just title-case
  const fullWords = ['AVENIDA', 'ESTRADA', 'TRAVESSA', 'PRAÇA', 'PRACA', 'ALAMEDA', 'RUA'];
  if (fullWords.includes(prefix)) {
    const rest = parts.slice(1).map(w =>
      w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()} ${rest}`;
  }
  return name;
}

export default function Microbairros() {
  const { selectedBairro, setSelectedBairro } = useBairro();
  const { data: microbairros, isLoading } = useMicrobairroDetalhado(selectedBairro);
  const [selectedStreets, setSelectedStreets] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(isMobile ? 'list' : 'cards');
  
  const { data: streetComparisonData, isLoading: isLoadingComparison } = useStreetComparison(
    selectedStreets, 
    72, 
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

  const filteredMicrobairros = useMemo(() => {
    if (!microbairros) return [];
    if (!searchFilter.trim()) return microbairros;
    const normInput = normalizeAccents(searchFilter.toUpperCase().trim());
    // Generate expanded search variants (e.g. "LUCIO COSTA" → also matches "AVN LUCIO COSTA")
    const searchVariants = expandLogradouroSearchTerms(searchFilter.trim().toUpperCase())
      .map(t => normalizeAccents(t.toUpperCase()));
    if (!searchVariants.length) searchVariants.push(normInput);
    
    return microbairros.filter(item => {
      const rawName = normalizeAccents((item.microbairro || '').toUpperCase());
      const condName = normalizeAccents((item.condominioNome || '').toUpperCase());
      return searchVariants.some(v => rawName.includes(v) || condName.includes(v));
    });
  }, [microbairros, searchFilter]);

  const maxTransacoes = Math.max(...(filteredMicrobairros).map((r) => r.total_transacoes), 1);

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

  const getDisplayName = (item: { microbairro: string; condominioNome?: string; isTechnicalCode?: boolean }) => {
    if (item.condominioNome) return item.condominioNome;
    if (item.isTechnicalCode) return extractSimplifiedCode(item.microbairro);
    return formatLogradouro(item.microbairro);
  };

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
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'cards' | 'list')}>
              <ToggleGroupItem value="cards" aria-label="Visualização em cards" className="px-2.5">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Visualização em lista" className="px-2.5">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <BairroSelector value={selectedBairro} onChange={setSelectedBairro} />
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar logradouro..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 max-w-sm"
          />
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
            {viewMode === 'list' 
              ? 'Clique no botão "+" na tabela abaixo para comparar até 5 ruas'
              : 'Clique no botão "+" nos cards abaixo para comparar até 5 ruas'}
          </p>
        </CardHeader>
        <CardContent>
          {selectedStreets.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedStreets.map((street) => (
                  <Badge key={street} variant="outline" className="pl-3 pr-1 py-1.5 gap-2">
                    <span className="text-xs max-w-[150px] truncate">{street}</span>
                    <Button 
                      variant="ghost" size="sm" 
                      className="h-5 w-5 p-0 hover:bg-destructive/20"
                      onClick={() => handleRemoveStreet(street)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              {isLoadingComparison ? (
                <Skeleton className="h-[200px] w-full" />
              ) : streetComparisonData && streetComparisonData.length > 0 ? (
                <StreetComparisonChart data={streetComparisonData} />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Carregando dados de comparação...
                </div>
              )}
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
                          <p className="font-bold text-primary">R$ {street.mediana_m2.toLocaleString('pt-BR')}</p>
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
              <p>Selecione ruas {viewMode === 'list' ? 'na tabela' : 'nos cards'} abaixo para comparar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualização Lista */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Logradouro</TableHead>
                  <TableHead className="text-right">R$/m²</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Vendas</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Apt</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Casa</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Tendência</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMicrobairros.map((item) => {
                  const isSelected = selectedStreets.includes(item.microbairro);
                  const displayName = getDisplayName(item);
                  return (
                    <TableRow 
                      key={item.microbairro}
                      className={isSelected ? 'bg-accent/10' : 'cursor-pointer'}
                      onClick={() => {
                        if (isSelected) {
                          handleRemoveStreet(item.microbairro);
                        } else if (selectedStreets.length < 5) {
                          handleAddStreet(item.microbairro);
                        }
                      }}
                    >
                      <TableCell className="text-center font-bold text-muted-foreground">{item.rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none" title={item.microbairro}>
                            {displayName}
                          </span>
                          {(item.isTechnicalCode || item.condominioNome) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 border-amber-300 text-amber-700">
                              <Building2 className="h-2.5 w-2.5 mr-0.5" />
                              Cond.
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                        R$ {item.valor_m2.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{item.total_transacoes}</TableCell>
                      <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                        R$ {item.valor_m2_apt.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                        R$ {item.valor_m2_casa.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge 
                          variant={item.rank <= 3 ? "default" : "secondary"} 
                          className={`text-[10px] ${item.rank <= 3 ? 'bg-emerald-500/20 text-emerald-700 border-emerald-300' : ''}`}
                        >
                          {item.trend === "high" ? "Alta" : "Estável"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {isSelected ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRemoveStreet(item.microbairro)}>
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        ) : selectedStreets.length < 5 ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAddStreet(item.microbairro)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Visualização Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredMicrobairros.map((item) => (
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
              {!selectedStreets.includes(item.microbairro) && selectedStreets.length < 5 && (
                <Button
                  variant="secondary" size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => handleAddStreet(item.microbairro)}
                  title="Adicionar ao comparativo"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {selectedStreets.includes(item.microbairro) && (
                <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">Selecionado</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredMicrobairros.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum dado disponível para exibição.
        </div>
      )}
    </div>
  );
}
