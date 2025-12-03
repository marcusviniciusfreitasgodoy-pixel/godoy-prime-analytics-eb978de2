import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, DollarSign, Bot, Loader2, FileDown, MapPin, X, History, RotateCcw, Plus, Trash2, TrendingUp, TrendingDown, GitCompare } from "lucide-react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useLocationSearch, useTransactionSearch } from "@/hooks/useLocationSearch";
import { useValuationWeights } from "@/hooks/useValuationWeights";
import { useStreetSuggestions } from "@/hooks/useStreetSuggestions";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useStreetComparison } from "@/hooks/useStreetComparison";
import { Badge } from "./ui/badge";
import { exportToCSV } from "@/utils/exportUtils";
import { exportValuationToPDF } from "@/utils/valuationPdfExport";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { StreetComparisonChart } from "./StreetComparisonChart";

interface SearchToolsProps {
  bairro?: string;
}

const PERIODO_OPTIONS = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
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

  // Valuation state
  const [valLocalizacao, setValLocalizacao] = useState("");
  const [showValSuggestions, setShowValSuggestions] = useState(false);
  const valSuggestionsRef = useRef<HTMLDivElement>(null);
  const valInputRef = useRef<HTMLInputElement>(null);
  const [valArea, setValArea] = useState("");
  const [valQuartos, setValQuartos] = useState("");
  const [valVagas, setValVagas] = useState("");
  const [valSol, setValSol] = useState("");
  const [valVista, setValVista] = useState("");
  const [valEstado, setValEstado] = useState("");
  const [valTipologia, setValTipologia] = useState("");
  const [valuationResult, setValuationResult] = useState<{
    min: number;
    justo: number;
    max: number;
    confianca: number;
    mercado: string;
    mercadoDescricao: string;
  } | null>(null);

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
      valorMin: valorMin ? parseFloat(valorMin) : undefined,
      valorMax: valorMax ? parseFloat(valorMax) : undefined,
      bairro: transacaoBairro || undefined,
      tipologia: transacaoTipologia === 'todas' ? undefined : transacaoTipologia || undefined,
      periodoMeses: parseInt(transacaoPeriodo),
      areaMin: transacaoAreaMin ? parseFloat(transacaoAreaMin) : undefined,
      areaMax: transacaoAreaMax ? parseFloat(transacaoAreaMax) : undefined,
    },
    searchTransactions
  );

  const { data: weights } = useValuationWeights();
  const { data: comparisonData, isLoading: comparisonLoading } = useStreetComparison(
    comparisonStreets,
    parseInt(periodoMeses)
  );

  // Street suggestions for autocomplete
  const { data: suggestions, isLoading: suggestionsLoading } = useStreetSuggestions(locationQuery);
  const { data: valSuggestions, isLoading: valSuggestionsLoading } = useStreetSuggestions(valLocalizacao);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
      if (valSuggestionsRef.current && !valSuggestionsRef.current.contains(event.target as Node) &&
          valInputRef.current && !valInputRef.current.contains(event.target as Node)) {
        setShowValSuggestions(false);
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

  const handleSelectValSuggestion = (logradouro: string) => {
    setValLocalizacao(logradouro);
    setLocationQuery(logradouro);
    setShowValSuggestions(false);
    setSearchLocation(true);
    setValuationResult(null);
    addToHistory(logradouro, 'valuation');
  };

  const handleSelectFromHistory = (item: { query: string; type: string }) => {
    if (item.type === 'location' || item.type === 'valuation') {
      setLocationQuery(item.query);
      setSearchLocation(true);
    }
    setShowHistory(false);
  };

  // Map weights by factor_key for easy lookup
  const weightsMap = useMemo(() => {
    if (!weights) return {};
    return weights.reduce((acc, w) => {
      if (w.factor_key) {
        acc[w.factor_key] = w.multiplier || 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [weights]);

  const handleLocationSearch = () => {
    setSearchLocation(true);
    if (locationQuery) {
      addToHistory(locationQuery, 'location');
    }
  };

  const handleTransactionSearch = () => {
    setSearchTransactions(true);
    if (valorMin || valorMax) {
      addToHistory(`R$ ${valorMin || '0'} - R$ ${valorMax || '∞'}`, 'transaction');
    }
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

  const clearValuationForm = () => {
    setValLocalizacao("");
    setValArea("");
    setValQuartos("");
    setValVagas("");
    setValSol("");
    setValVista("");
    setValEstado("");
    setValTipologia("");
    setValuationResult(null);
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

  const handleExportValuationPDF = () => {
    if (!valuationResult || !locationResult) {
      toast({
        title: "Sem dados",
        description: "Calcule a avaliação primeiro para exportar.",
        variant: "destructive",
      });
      return;
    }

    exportValuationToPDF(
      valuationResult,
      {
        localizacao: valLocalizacao,
        area: valArea,
        quartos: valQuartos,
        vagas: valVagas,
        sol: valSol,
        vista: valVista,
        estado: valEstado,
        tipologia: valTipologia,
      },
      {
        mediana_m2: locationResult.mediana_m2,
        total_transacoes: locationResult.total_transacoes,
      }
    );

    toast({
      title: "PDF exportado",
      description: "Relatório de avaliação salvo com sucesso.",
    });
  };

  const calculateValuation = () => {
    if (!valArea || !locationResult) return;

    const area = parseFloat(valArea);
    const basePrice = locationResult.mediana_m2;
    
    // Apply multipliers from database weights
    let multiplier = 1.0;
    
    // Vista
    if (valVista === 'frente-mar' && weightsMap['VIEW_FRONT_SEA']) {
      multiplier *= weightsMap['VIEW_FRONT_SEA'];
    } else if (valVista === 'mar' && weightsMap['VIEW_SEA']) {
      multiplier *= weightsMap['VIEW_SEA'];
    } else if (valVista === 'verde' && weightsMap['VIEW_GREEN']) {
      multiplier *= weightsMap['VIEW_GREEN'];
    }
    
    // Sol
    if (valSol === 'manha' && weightsMap['SUN_MORNING']) {
      multiplier *= weightsMap['SUN_MORNING'];
    } else if (valSol === 'tarde' && weightsMap['SUN_AFTERNOON']) {
      multiplier *= weightsMap['SUN_AFTERNOON'];
    }
    
    // Estado
    if ((valEstado === 'novo' || valEstado === 'reformado') && weightsMap['STATE_NEW']) {
      multiplier *= weightsMap['STATE_NEW'];
    } else if (valEstado === 'original' && weightsMap['STATE_ORIGINAL']) {
      multiplier *= weightsMap['STATE_ORIGINAL'];
    } else if (valEstado === 'reformar') {
      multiplier *= 0.85;
    }

    // Tipologia específica (apenas apartamento e casa disponíveis)
    // Não há multiplicadores específicos para apartamento/casa padrão

    // Quartos e vagas (bônus adicionais)
    const quartos = parseInt(valQuartos) || 3;
    if (quartos >= 4) multiplier *= 1.05;

    const vagas = parseInt(valVagas) || 2;
    if (vagas >= 3) multiplier *= 1.05;

    const precoJusto = Math.round(basePrice * multiplier * area);
    const precoMin = Math.round(precoJusto * 0.90);
    const precoMax = Math.round(precoJusto * 1.15);

    const confianca = Math.min(95, 50 + locationResult.total_transacoes * 3);

    const desvioRelativo = locationResult.desvio_padrao / locationResult.media_m2;
    const liquidez = locationResult.total_transacoes;
    
    let mercado: string;
    let mercadoDescricao: string;
    
    if (liquidez > 10 && desvioRelativo < 0.20) {
      mercado = 'Vendedor';
      mercadoDescricao = 'Alta demanda, proprietários têm vantagem na negociação';
    } else if (liquidez < 5 || desvioRelativo > 0.30) {
      mercado = 'Comprador';
      mercadoDescricao = 'Oferta elevada, compradores têm poder de barganha';
    } else {
      mercado = 'Equilibrado';
      mercadoDescricao = 'Mercado estável com condições justas para ambas as partes';
    }

    setValuationResult({
      min: precoMin,
      justo: precoJusto,
      max: precoMax,
      confianca,
      mercado,
      mercadoDescricao,
    });
  };

  const locationHistoryItems = history.filter(h => h.type === 'location');

  return (
    <Card data-tour="search-tools">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Ferramentas de Busca</span>
          {history.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 text-xs">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar Histórico
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="localizacao">
              <Search className="h-4 w-4 mr-2" />
              Localização
            </TabsTrigger>
            <TabsTrigger value="transacoes">
              <DollarSign className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="valuation">
              <Bot className="h-4 w-4 mr-2" />
              IA Valuation
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
                            "flex items-center justify-between gap-2 border-b border-border/50 last:border-0"
                          )}
                          onClick={() => handleSelectSuggestion(s.logradouro)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{s.logradouro}</span>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0 text-xs">
                            {s.total_transacoes}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia">Tipologia</Label>
                <Select value={tipologia} onValueChange={setTipologia}>
                  <SelectTrigger id="tipologia">
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
                <Label htmlFor="finalidade">Finalidade</Label>
                <Select value={finalidade} onValueChange={setFinalidade}>
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
            
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="flex gap-2">
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
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{locationResult.logradouro}</span>
                  <Badge variant="secondary">{locationResult.total_transacoes} transações</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Mediana:</span>
                    <span className="ml-2 font-semibold">R$ {locationResult.mediana_m2.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Média:</span>
                    <span className="ml-2 font-semibold">R$ {locationResult.media_m2.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Desvio:</span>
                    <span className="ml-2 font-semibold">R$ {locationResult.desvio_padrao.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Faixa:</span>
                    <span className="ml-2 font-semibold">
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
              <div className="p-4 border rounded-lg bg-accent/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <GitCompare className="h-4 w-4" />
                    Comparação ({comparisonStreets.length}/3)
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearComparison}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {comparisonStreets.map((street, idx) => (
                    <Badge key={street} variant="secondary" className="flex items-center gap-1">
                      <span className="truncate max-w-[150px]">{street}</span>
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
                        <div key={street.logradouro} className="flex items-center justify-between text-sm p-2 bg-background rounded">
                          <span className="truncate max-w-[180px] font-medium">{street.logradouro}</span>
                          <div className="flex items-center gap-3">
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
                    <StreetComparisonChart data={comparisonData} />
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transacoes" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor-min">Valor Mínimo (R$)</Label>
                <Input 
                  id="valor-min" 
                  type="number" 
                  placeholder="0" 
                  value={valorMin}
                  onChange={(e) => {
                    setValorMin(e.target.value);
                    setSearchTransactions(false);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor-max">Valor Máximo (R$)</Label>
                <Input 
                  id="valor-max" 
                  type="number" 
                  placeholder="10000000" 
                  value={valorMax}
                  onChange={(e) => {
                    setValorMax(e.target.value);
                    setSearchTransactions(false);
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleTransactionSearch} disabled={transactionLoading}>
                {transactionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Buscar Transações
              </Button>
              <Button variant="outline" onClick={clearTransactionFilters} title="Limpar filtros">
                <RotateCcw className="h-4 w-4" />
              </Button>
              {transactionResult && transactionResult.length > 0 && (
                <Button variant="outline" onClick={exportTransactionResults} title="Exportar CSV">
                  <FileDown className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {transactionResult && transactionResult.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Microbairros por liquidez:</p>
                {transactionResult.map((item, idx) => (
                  <div key={item.microbairro} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                    <span className="truncate max-w-[200px]">{idx + 1}. {item.microbairro}</span>
                    <div className="flex gap-4 text-muted-foreground">
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

          <TabsContent value="valuation" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="val-localizacao">Localização</Label>
              <div className="relative">
                <Input 
                  ref={valInputRef}
                  id="val-localizacao" 
                  placeholder="Rua ou condomínio" 
                  value={valLocalizacao}
                  onChange={(e) => {
                    setValLocalizacao(e.target.value);
                    setLocationQuery(e.target.value);
                    setSearchLocation(false);
                    setValuationResult(null);
                    setShowValSuggestions(true);
                  }}
                  onFocus={() => setShowValSuggestions(true)}
                  autoComplete="off"
                />
                {showValSuggestions && valLocalizacao.length >= 2 && (valSuggestions?.length ?? 0) > 0 && (
                  <div 
                    ref={valSuggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
                  >
                    {valSuggestionsLoading ? (
                      <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando...
                      </div>
                    ) : (
                      valSuggestions?.map((s) => (
                        <button
                          key={s.logradouro}
                          type="button"
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                            "flex items-center justify-between gap-2 border-b border-border/50 last:border-0"
                          )}
                          onClick={() => handleSelectValSuggestion(s.logradouro)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{s.logradouro}</span>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0 text-xs">
                            {s.total_transacoes}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {locationResult && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  ✓ Localização validada ({locationResult.total_transacoes} transações)
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-area">Área (m²)</Label>
                <Input 
                  id="val-area" 
                  type="number" 
                  placeholder="150" 
                  value={valArea}
                  onChange={(e) => setValArea(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="val-tipologia">Tipologia</Label>
                <Select value={valTipologia} onValueChange={setValTipologia}>
                  <SelectTrigger id="val-tipologia">
                    <SelectValue placeholder="Padrão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-quartos">Quartos</Label>
                <Input 
                  id="val-quartos" 
                  type="number" 
                  placeholder="3" 
                  value={valQuartos}
                  onChange={(e) => setValQuartos(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="val-vagas">Vagas</Label>
                <Input 
                  id="val-vagas" 
                  type="number" 
                  placeholder="2" 
                  value={valVagas}
                  onChange={(e) => setValVagas(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-sol">Sol</Label>
                <Select value={valSol} onValueChange={setValSol}>
                  <SelectTrigger id="val-sol">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="dia-todo">Dia Todo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="val-vista">Vista</Label>
                <Select value={valVista} onValueChange={setValVista}>
                  <SelectTrigger id="val-vista">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frente-mar">Frente Mar</SelectItem>
                    <SelectItem value="mar">Vista Mar</SelectItem>
                    <SelectItem value="verde">Verde</SelectItem>
                    <SelectItem value="urbana">Urbana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="val-estado">Estado de Conservação</Label>
              <Select value={valEstado} onValueChange={setValEstado}>
                <SelectTrigger id="val-estado">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="reformado">Reformado</SelectItem>
                  <SelectItem value="bom">Bom Estado</SelectItem>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="reformar">A Reformar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={calculateValuation}
                disabled={!locationResult || !valArea}
              >
                <Bot className="h-4 w-4 mr-2" />
                Calcular Valuation
              </Button>
              <Button variant="outline" onClick={clearValuationForm} title="Limpar formulário">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            {valuationResult ? (
              <div className="p-4 border rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Preço Justo de Mercado</p>
                  <p className="text-3xl font-bold text-accent">
                    R$ {valuationResult.justo.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-center">
                  <div className="p-2 bg-card rounded">
                    <p className="text-xs text-muted-foreground">Liquidez (Mín)</p>
                    <p className="font-semibold">R$ {valuationResult.min.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="p-2 bg-card rounded">
                    <p className="text-xs text-muted-foreground">Oportunidade (Máx)</p>
                    <p className="font-semibold">R$ {valuationResult.max.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-card rounded-lg">
                    <p className="text-xs text-muted-foreground">Termômetro</p>
                    <p className="font-semibold text-foreground">Mercado de {valuationResult.mercado}</p>
                    <p className="text-xs text-muted-foreground mt-1">{valuationResult.mercadoDescricao}</p>
                  </div>
                  <div className="p-3 bg-card rounded-lg">
                    <p className="text-xs text-muted-foreground">Confiança</p>
                    <p className="font-semibold text-foreground">{valuationResult.confianca}%</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleExportValuationPDF}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar Relatório PDF
                </Button>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                Valide a localização e insira a área para calcular
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
