import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, DollarSign, Calculator, Loader2, FileDown, MapPin, X, History, RotateCcw, Plus, Trash2, TrendingUp, TrendingDown, GitCompare, FileSpreadsheet, FileText } from "lucide-react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useLocationSearch, useTransactionSearch } from "@/hooks/useLocationSearch";
import { useStreetSuggestions } from "@/hooks/useStreetSuggestions";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useStreetComparison } from "@/hooks/useStreetComparison";
import { Badge } from "./ui/badge";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { StreetComparisonChart } from "./StreetComparisonChart";
import { ValuationEngine } from "./valuation/ValuationEngine";

interface SearchToolsProps {
  bairro?: string;
}

const PERIODO_OPTIONS = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
];

const VALOR_OPTIONS = [
  { value: '', label: 'Sem limite' },
  { value: '100000', label: 'R$ 100 mil' },
  { value: '200000', label: 'R$ 200 mil' },
  { value: '300000', label: 'R$ 300 mil' },
  { value: '500000', label: 'R$ 500 mil' },
  { value: '750000', label: 'R$ 750 mil' },
  { value: '1000000', label: 'R$ 1 milhão' },
  { value: '1500000', label: 'R$ 1,5 milhões' },
  { value: '2000000', label: 'R$ 2 milhões' },
  { value: '3000000', label: 'R$ 3 milhões' },
  { value: '5000000', label: 'R$ 5 milhões' },
  { value: '7500000', label: 'R$ 7,5 milhões' },
  { value: '10000000', label: 'R$ 10 milhões' },
  { value: '15000000', label: 'R$ 15 milhões' },
  { value: '20000000', label: 'R$ 20 milhões' },
  { value: '30000000', label: 'R$ 30 milhões' },
  { value: '50000000', label: 'R$ 50 milhões' },
  { value: '75000000', label: 'R$ 75 milhões' },
  { value: '100000000', label: 'R$ 100 milhões' },
];

export function SearchTools({ bairro = "BARRA DA TIJUCA" }: SearchToolsProps) {
  const { toast } = useToast();
  const { history, addToHistory, clearHistory } = useSearchHistory();
  
  // Location search state
  const [locationQuery, setLocationQuery] = useState("");
  const [tipologia, setTipologia] = useState<string>("");
  const [finalidade, setFinalidade] = useState<string>("");
  const [areaMin, setAreaMin] = useState<string>("");
  const [areaMax, setAreaMax] = useState<string>("");
  const [periodoMeses, setPeriodoMeses] = useState<string>("12");
  const [searchLocation, setSearchLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Comparison state
  const [comparisonStreets, setComparisonStreets] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Transaction search state
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");
  const [transacaoBairro, setTransacaoBairro] = useState<string>("BARRA DA TIJUCA");
  const [transacaoTipologia, setTransacaoTipologia] = useState<string>("");
  const [transacaoPeriodo, setTransacaoPeriodo] = useState<string>("12");
  const [transacaoAreaMin, setTransacaoAreaMin] = useState<string>("");
  const [transacaoAreaMax, setTransacaoAreaMax] = useState<string>("");
  const [searchTransactions, setSearchTransactions] = useState(false);

  // Queries
  const { data: locationResult, isLoading: locationLoading } = useLocationSearch(
    {
      query: locationQuery,
      tipologia: tipologia === 'todas' ? undefined : tipologia || undefined,
      finalidade: finalidade === 'todas' ? undefined : finalidade || undefined,
      areaMin: areaMin ? parseFloat(areaMin) : undefined,
      areaMax: areaMax ? parseFloat(areaMax) : undefined,
      periodoMeses: parseInt(periodoMeses),
    },
    searchLocation
  );

  const { data: transactionResult, isLoading: transactionLoading } = useTransactionSearch(
    {
      valorMin: valorMin && valorMin !== 'none' ? parseFloat(valorMin) : undefined,
      valorMax: valorMax && valorMax !== 'none' ? parseFloat(valorMax) : undefined,
      bairro: transacaoBairro || undefined,
      tipologia: transacaoTipologia === 'todas' ? undefined : transacaoTipologia || undefined,
      periodoMeses: parseInt(transacaoPeriodo),
      areaMin: transacaoAreaMin ? parseFloat(transacaoAreaMin) : undefined,
      areaMax: transacaoAreaMax ? parseFloat(transacaoAreaMax) : undefined,
    },
    searchTransactions
  );

  const { data: comparisonData, isLoading: comparisonLoading } = useStreetComparison(
    comparisonStreets,
    parseInt(periodoMeses)
  );

  // Street suggestions for autocomplete
  const { data: suggestions, isLoading: suggestionsLoading } = useStreetSuggestions(locationQuery);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (logradouro: string) => {
    setLocationQuery(logradouro);
    setShowSuggestions(false);
    setShowHistory(false);
    setSearchLocation(true);
    addToHistory(logradouro, 'location');
  };

  const handleSelectFromHistory = (item: { query: string; type: string }) => {
    if (item.type === 'location') {
      setLocationQuery(item.query);
      setSearchLocation(true);
    }
    setShowHistory(false);
  };

  const handleLocationSearch = () => {
    setSearchLocation(true);
    if (locationQuery) {
      addToHistory(locationQuery, 'location');
    }
  };

  const handleTransactionSearch = () => {
    setSearchTransactions(true);
    const minLabel = VALOR_OPTIONS.find(o => o.value === valorMin)?.label || 'Sem limite';
    const maxLabel = VALOR_OPTIONS.find(o => o.value === valorMax)?.label || 'Sem limite';
    addToHistory(`${minLabel} - ${maxLabel}`, 'transaction');
  };

  const clearLocationFilters = () => {
    setLocationQuery("");
    setTipologia("");
    setFinalidade("");
    setAreaMin("");
    setAreaMax("");
    setPeriodoMeses("12");
    setSearchLocation(false);
  };

  const clearTransactionFilters = () => {
    setValorMin("");
    setValorMax("");
    setTransacaoBairro("BARRA DA TIJUCA");
    setTransacaoTipologia("");
    setTransacaoPeriodo("12");
    setTransacaoAreaMin("");
    setTransacaoAreaMax("");
    setSearchTransactions(false);
  };

  const exportTransactionResults = () => {
    if (!transactionResult || transactionResult.length === 0) {
      toast({
        title: "Sem dados",
        description: "Faça uma busca primeiro para exportar os resultados.",
        variant: "destructive",
      });
      return;
    }
    
    const exportData = transactionResult.map((item, idx) => ({
      Ranking: idx + 1,
      Logradouro: item.microbairro,
      Total_Transacoes: item.total_transacoes,
      Preco_Medio_m2: item.preco_medio_m2,
      Bairro: transacaoBairro,
      Periodo_Meses: transacaoPeriodo,
    }));
    
    exportToCSV(exportData, `transacoes_${transacaoBairro.replace(/\s+/g, '_')}_${transacaoPeriodo}m`);
    toast({
      title: "Exportado com sucesso",
      description: `${exportData.length} logradouros exportados para CSV.`,
    });
  };

  const exportTransactionResultsXLSX = () => {
    if (!transactionResult || transactionResult.length === 0) {
      toast({
        title: "Sem dados",
        description: "Faça uma busca primeiro para exportar os resultados.",
        variant: "destructive",
      });
      return;
    }

    const minLabel = VALOR_OPTIONS.find(o => o.value === valorMin)?.label || 'Sem limite';
    const maxLabel = VALOR_OPTIONS.find(o => o.value === valorMax)?.label || 'Sem limite';

    exportToXLSX({
      filename: `transacoes_${transacaoBairro.replace(/\s+/g, '_')}_${transacaoPeriodo}m`,
      title: 'Ranking de Transações por Logradouro',
      subtitle: `Bairro: ${transacaoBairro} | Período: ${transacaoPeriodo} meses`,
      filters: {
        'Valor Mínimo': minLabel,
        'Valor Máximo': maxLabel,
        'Bairro': transacaoBairro,
        'Tipologia': transacaoTipologia || 'Todas',
        'Período': `${transacaoPeriodo} meses`,
      },
      data: transactionResult,
      columns: [
        { key: 'microbairro', header: 'Logradouro', width: 40, format: 'text' },
        { key: 'total_transacoes', header: 'Total Transações', width: 18, format: 'number' },
        { key: 'preco_medio_m2', header: 'Preço Médio R$/m²', width: 20, format: 'currency' },
      ],
      summary: [
        { label: 'Total de Logradouros', value: transactionResult.length },
        { label: 'Total de Transações', value: transactionResult.reduce((sum, r) => sum + r.total_transacoes, 0) },
      ],
    });

    toast({
      title: "Exportado com sucesso",
      description: `${transactionResult.length} logradouros exportados para Excel.`,
    });
  };

  const addToComparison = () => {
    if (locationResult && comparisonStreets.length < 3) {
      const street = locationResult.logradouro;
      if (!comparisonStreets.includes(street)) {
        setComparisonStreets([...comparisonStreets, street]);
        setShowComparison(true);
        toast({
          title: "Adicionado à comparação",
          description: `${street} (${comparisonStreets.length + 1}/3)`,
        });
      }
    }
  };

  const removeFromComparison = (street: string) => {
    setComparisonStreets(comparisonStreets.filter(s => s !== street));
  };

  const clearComparison = () => {
    setComparisonStreets([]);
    setShowComparison(false);
  };

  const exportLocationResults = () => {
    if (!locationResult || !locationResult.transacoes) {
      toast({
        title: "Sem dados",
        description: "Faça uma busca primeiro para exportar os resultados.",
        variant: "destructive",
      });
      return;
    }
    
    const exportData = locationResult.transacoes.map(t => ({
      Logradouro: locationResult.logradouro,
      Valor_Transacao: t.valor_transacao,
      Area_m2: t.area_m2,
      Valor_m2: t.valor_m2,
      Data: t.data_transacao,
      Tipologia: t.tipologia || '',
    }));
    
    exportToCSV(exportData, `transacoes_${locationQuery.replace(/\s+/g, '_')}`);
    toast({
      title: "Exportado com sucesso",
      description: `${exportData.length} transações exportadas para CSV.`,
    });
  };

  const locationHistoryItems = history.filter(h => h.type === 'location');

  return (
    <Card data-tour="search-tools">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-sm sm:text-base">Ferramentas de Busca</span>
          {history.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 text-xs">
                    <Trash2 className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Limpar Histórico</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpar histórico de buscas recentes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="localizacao" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="localizacao" data-tour="tab-localizacao" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Localização</span>
            </TabsTrigger>
            <TabsTrigger value="transacoes" data-tour="tab-transacoes" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <DollarSign className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Transações</span>
            </TabsTrigger>
            <TabsTrigger value="valuation" data-tour="tab-valuation" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
              <Calculator className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Valuation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="localizacao" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="rua">Rua ou Condomínio</Label>
              <div className="relative">
                <Input 
                  ref={inputRef}
                  id="rua"
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    setSearchLocation(false);
                    setShowSuggestions(true);
                    setShowHistory(false);
                  }}
                  onFocus={() => {
                    if (locationQuery.length >= 2) {
                      setShowSuggestions(true);
                    } else if (locationHistoryItems.length > 0) {
                      setShowHistory(true);
                    }
                  }}
                  placeholder="Digite o nome da rua ou condomínio..." 
                  autoComplete="off"
                />
                
                {/* History dropdown */}
                {showHistory && locationHistoryItems.length > 0 && locationQuery.length < 2 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                  >
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Buscas recentes
                    </div>
                    {locationHistoryItems.map((item) => (
                      <button
                        key={item.timestamp}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                        onClick={() => handleSelectFromHistory(item)}
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{item.query}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && locationQuery.length >= 2 && (suggestions?.length ?? 0) > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                  >
                    {suggestionsLoading ? (
                      <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando...
                      </div>
                    ) : (
                      suggestions?.map((s) => (
                        <button
                          key={s.logradouro}
                          type="button"
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                            "flex flex-col gap-1 border-b border-border/50 last:border-0"
                          )}
                          onClick={() => handleSelectSuggestion(s.logradouro)}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate font-medium">
                                {s.nome_condominio || s.logradouro}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {s.microbairro && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {s.microbairro}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {s.total_transacoes}
                              </Badge>
                            </div>
                          </div>
                          {s.nome_condominio && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                              <span className="truncate">{s.logradouro}</span>
                              {s.padrao_construtivo && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-accent/50">
                                  {s.padrao_construtivo}
                                </Badge>
                              )}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia">Tipologia</Label>
                <Select 
                  value={tipologia} 
                  onValueChange={setTipologia}
                  disabled={finalidade === 'todas'}
                >
                  <SelectTrigger id="tipologia">
                    <SelectValue placeholder={finalidade === 'todas' ? 'Selecione finalidade' : 'Todas'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {(finalidade === 'residencial' || finalidade === '') && (
                      <>
                        <SelectItem value="apartamento">Apartamento</SelectItem>
                        <SelectItem value="casa">Casa</SelectItem>
                      </>
                    )}
                    {finalidade === 'comercial' && (
                      <>
                        <SelectItem value="sala">Sala Comercial</SelectItem>
                        <SelectItem value="loja">Loja</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="finalidade">Finalidade</Label>
                <Select 
                  value={finalidade} 
                  onValueChange={(value) => {
                    setFinalidade(value);
                    setTipologia(''); // Limpa tipologia ao mudar finalidade
                  }}
                >
                  <SelectTrigger id="finalidade">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodo">Período</Label>
                <Select value={periodoMeses} onValueChange={setPeriodoMeses}>
                  <SelectTrigger id="periodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="area-min">Área Mínima (m²)</Label>
                <Input 
                  id="area-min" 
                  type="number" 
                  placeholder="0" 
                  value={areaMin}
                  onChange={(e) => setAreaMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area-max">Área Máxima (m²)</Label>
                <Input 
                  id="area-max" 
                  type="number" 
                  placeholder="1000" 
                  value={areaMax}
                  onChange={(e) => setAreaMax(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1">
                      <Button 
                        className="w-full" 
                        onClick={handleLocationSearch} 
                        disabled={locationLoading || !locationQuery}
                      >
                        {locationLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Buscar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!locationQuery && (
                    <TooltipContent>Digite uma localização para buscar</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              
              <Button variant="outline" onClick={clearLocationFilters} title="Limpar filtros">
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              {locationResult && locationResult.transacoes && (
                <>
                  <Button variant="outline" onClick={exportLocationResults} title="Exportar CSV">
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          onClick={addToComparison}
                          disabled={comparisonStreets.length >= 3 || comparisonStreets.includes(locationResult.logradouro)}
                          title="Adicionar à comparação"
                        >
                          <GitCompare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {comparisonStreets.length >= 3 
                          ? "Máximo de 3 ruas para comparar"
                          : comparisonStreets.includes(locationResult.logradouro)
                            ? "Já adicionado à comparação"
                            : "Adicionar à comparação"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
            
            {locationResult ? (
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex flex-col">
                      {locationResult.nome_condominio ? (
                        <>
                          <span className="font-semibold text-foreground text-sm sm:text-base">
                            {locationResult.nome_condominio}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {locationResult.logradouro}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                          {locationResult.logradouro}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 self-start sm:self-auto">
                      {locationResult.microbairro && (
                        <Badge variant="outline" className="text-xs">
                          {locationResult.microbairro}
                        </Badge>
                      )}
                      {locationResult.padrao_construtivo && (
                        <Badge variant="outline" className="text-xs bg-accent/50">
                          {locationResult.padrao_construtivo}
                        </Badge>
                      )}
                      <Badge variant="secondary">{locationResult.total_transacoes} transações</Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Mediana:</span>
                    <span className="sm:ml-2 font-semibold">R$ {locationResult.mediana_m2.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Média:</span>
                    <span className="sm:ml-2 font-semibold">R$ {locationResult.media_m2.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Desvio:</span>
                    <span className="sm:ml-2 font-semibold">R$ {locationResult.desvio_padrao.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Faixa:</span>
                    <span className="sm:ml-2 font-semibold text-xs sm:text-sm">
                      R$ {locationResult.transacoes.length > 0 ? Math.min(...locationResult.transacoes.map(t => t.valor_m2)).toLocaleString('pt-BR') : 0} - {locationResult.transacoes.length > 0 ? Math.max(...locationResult.transacoes.map(t => t.valor_m2)).toLocaleString('pt-BR') : 0}/m²
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                Digite uma localização para ver as transações oficiais
              </div>
            )}

            {/* Comparison Section */}
            {comparisonStreets.length > 0 && (
              <div className="p-3 sm:p-4 border rounded-lg bg-accent/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                    <GitCompare className="h-4 w-4" />
                    Comparação ({comparisonStreets.length}/3)
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearComparison}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {comparisonStreets.map((street, idx) => (
                    <Badge key={street} variant="secondary" className="flex items-center gap-1 text-xs">
                      <span className="truncate max-w-[100px] sm:max-w-[150px]">{street}</span>
                      <button onClick={() => removeFromComparison(street)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {comparisonLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comparisonData && comparisonData.length > 0 && (
                  <>
                    <div className="grid gap-2">
                      {comparisonData.map((street, idx) => (
                        <div key={street.logradouro} className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm p-2 bg-background rounded gap-1">
                          <span className="truncate max-w-full sm:max-w-[180px] font-medium">{street.logradouro}</span>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                            <span className="text-muted-foreground">
                              R$ {street.media_m2.toLocaleString('pt-BR')}/m²
                            </span>
                            {street.variacao_periodo !== null && (
                              <span className={cn(
                                "flex items-center text-xs",
                                street.variacao_periodo >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {street.variacao_periodo >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {street.variacao_periodo >= 0 ? '+' : ''}{street.variacao_periodo.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Gráfico apenas no desktop */}
                    <div className="hidden sm:block">
                      <StreetComparisonChart data={comparisonData} />
                    </div>
                    <div className="sm:hidden p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">
                        📊 Gráfico de comparação disponível apenas no computador
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transacoes" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="trans-bairro">Bairro</Label>
                <Select 
                  value={transacaoBairro} 
                  onValueChange={(value) => {
                    setTransacaoBairro(value);
                    setSearchTransactions(false);
                  }}
                >
                  <SelectTrigger id="trans-bairro">
                    <SelectValue placeholder="Selecione o bairro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BARRA DA TIJUCA">Barra da Tijuca</SelectItem>
                    <SelectItem value="RECREIO DOS BANDEIRANTES">Recreio dos Bandeirantes</SelectItem>
                    <SelectItem value="JACAREPAGUA">Jacarepaguá</SelectItem>
                    <SelectItem value="COPACABANA">Copacabana</SelectItem>
                    <SelectItem value="IPANEMA">Ipanema</SelectItem>
                    <SelectItem value="LEBLON">Leblon</SelectItem>
                    <SelectItem value="BOTAFOGO">Botafogo</SelectItem>
                    <SelectItem value="TIJUCA">Tijuca</SelectItem>
                    <SelectItem value="FLAMENGO">Flamengo</SelectItem>
                    <SelectItem value="LARANJEIRAS">Laranjeiras</SelectItem>
                    <SelectItem value="GAVEA">Gávea</SelectItem>
                    <SelectItem value="JARDIM BOTANICO">Jardim Botânico</SelectItem>
                    <SelectItem value="LAGOA">Lagoa</SelectItem>
                    <SelectItem value="SAO CONRADO">São Conrado</SelectItem>
                    <SelectItem value="HUMAITA">Humaitá</SelectItem>
                    <SelectItem value="URCA">Urca</SelectItem>
                    <SelectItem value="CENTRO">Centro</SelectItem>
                    <SelectItem value="VILA ISABEL">Vila Isabel</SelectItem>
                    <SelectItem value="MEIER">Méier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trans-tipologia">Tipologia</Label>
                <Select 
                  value={transacaoTipologia} 
                  onValueChange={(value) => {
                    setTransacaoTipologia(value);
                    setSearchTransactions(false);
                  }}
                >
                  <SelectTrigger id="trans-tipologia">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trans-periodo">Período</Label>
                <Select 
                  value={transacaoPeriodo} 
                  onValueChange={(value) => {
                    setTransacaoPeriodo(value);
                    setSearchTransactions(false);
                  }}
                >
                  <SelectTrigger id="trans-periodo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor-min">Valor Mínimo</Label>
                <Select 
                  value={valorMin} 
                  onValueChange={(value) => {
                    setValorMin(value);
                    setSearchTransactions(false);
                  }}
                >
                  <SelectTrigger id="valor-min">
                    <SelectValue placeholder="Sem limite" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor-max">Valor Máximo</Label>
                <Select 
                  value={valorMax} 
                  onValueChange={(value) => {
                    setValorMax(value);
                    setSearchTransactions(false);
                  }}
                >
                  <SelectTrigger id="valor-max">
                    <SelectValue placeholder="Sem limite" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || 'none-max'} value={opt.value || 'none'}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="trans-area-min">Área Mínima (m²)</Label>
                <Input 
                  id="trans-area-min" 
                  type="number" 
                  placeholder="50" 
                  value={transacaoAreaMin}
                  onChange={(e) => {
                    setTransacaoAreaMin(e.target.value);
                    setSearchTransactions(false);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trans-area-max">Área Máxima (m²)</Label>
                <Input 
                  id="trans-area-max" 
                  type="number" 
                  placeholder="500" 
                  value={transacaoAreaMax}
                  onChange={(e) => {
                    setTransacaoAreaMax(e.target.value);
                    setSearchTransactions(false);
                  }}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button className="flex-1 min-w-0" onClick={handleTransactionSearch} disabled={transactionLoading}>
                {transactionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Buscar Transações</span>
                <span className="sm:hidden">Buscar</span>
              </Button>
              <Button variant="outline" onClick={clearTransactionFilters} title="Limpar filtros">
                <RotateCcw className="h-4 w-4" />
              </Button>
              {transactionResult && transactionResult.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" title="Exportar">
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportTransactionResultsXLSX} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportTransactionResults} className="gap-2">
                      <FileText className="h-4 w-4" />
                      CSV (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {transactionResult && transactionResult.length > 0 ? (
              <div className="space-y-2">
                {/* Mostrar total geral de transações */}
                {(() => {
                  const totalGeral = (transactionResult as any).__totalGeral || transactionResult.reduce((s, r) => s + r.total_transacoes, 0);
                  const totalLogradouros = (transactionResult as any).__totalLogradouros || transactionResult.length;
                  return (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-3">
                      <p className="text-sm font-medium text-foreground">
                        Total: <span className="text-primary">{totalGeral} transações</span> em {totalLogradouros} logradouros
                      </p>
                    </div>
                  );
                })()}
                <p className="text-sm text-muted-foreground mb-2">TOP 10 logradouros por liquidez:</p>
                {transactionResult.map((item, idx) => (
                  <div key={item.microbairro} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded bg-muted/30 text-sm gap-1 sm:gap-0">
                    <span className="truncate max-w-full sm:max-w-[200px] font-medium sm:font-normal">{idx + 1}. {item.microbairro}</span>
                    <div className="flex gap-3 sm:gap-4 text-muted-foreground text-xs sm:text-sm">
                      <span>{item.total_transacoes} trans.</span>
                      <span className="font-medium text-foreground">R$ {(item.preco_medio_m2 / 1000).toFixed(1)}k/m²</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                Defina a faixa de preço para ver os microbairros disponíveis
              </div>
            )}
          </TabsContent>

          <TabsContent value="valuation" className="mt-4">
            <ValuationEngine bairro={bairro} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
