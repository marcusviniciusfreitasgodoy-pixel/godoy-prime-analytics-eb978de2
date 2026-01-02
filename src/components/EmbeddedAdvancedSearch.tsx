import { useState } from "react";
import { Input } from "./ui/input";
import { CurrencyInput } from "./ui/currency-input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Loader2, FileDown, Search, FileText, X, FileSpreadsheet, MapPin, Building, RotateCcw, Info, Eye, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { generateFuzzyVariations } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useBairroSuggestions } from "@/hooks/useBairroSuggestions";
import { useStreetSuggestions } from "@/hooks/useStreetSuggestions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface AdvancedSearchResult {
  id: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  data_transacao: string;
  valor_transacao: number;
  area_m2: number;
  valor_m2: number | null;
  tipologia: string | null;
  total_transacoes: number;
}

interface SearchResultsWithMeta {
  results: AdvancedSearchResult[];
  totalRegistros: number;
  totalTransacoes: number;
  fuzzyCorrection?: {
    original: string;
    corrected: string;
  };
}

const TIPOLOGIA_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Apartamento', label: 'Apartamento' },
];

const ANO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
];

interface EmbeddedAdvancedSearchProps {
  defaultBairro?: string;
}

export function EmbeddedAdvancedSearch({ defaultBairro = "BARRA DA TIJUCA" }: EmbeddedAdvancedSearchProps) {
  const { toast } = useToast();
  
  // Form state
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [anoInicio, setAnoInicio] = useState("");
  const [anoFim, setAnoFim] = useState("");
  const [bairro, setBairro] = useState(defaultBairro);
  const [logradouro, setLogradouro] = useState("");
  
  // Autocomplete popover states
  const [bairroPopoverOpen, setBairroPopoverOpen] = useState(false);
  const [logradouroPopoverOpen, setLogradouroPopoverOpen] = useState(false);
  
  // Autocomplete suggestions
  const { data: bairroSuggestions } = useBairroSuggestions(bairro);
  const { data: streetSuggestions } = useStreetSuggestions(logradouro, bairro || "BARRA DA TIJUCA");
  
  // Search trigger
  const [searchParams, setSearchParams] = useState<{
    valorMin?: number;
    valorMax?: number;
    areaMin?: number;
    areaMax?: number;
    tipologia?: string;
    anoInicio?: string;
    anoFim?: string;
    bairro?: string;
    logradouro?: string;
  } | null>(null);

  // State for transaction details modal
  const [selectedTransaction, setSelectedTransaction] = useState<AdvancedSearchResult | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: searchData, isLoading, isFetching } = useQuery<SearchResultsWithMeta>({
    queryKey: ['embedded-advanced-search', searchParams],
    enabled: !!searchParams,
    queryFn: async () => {
      if (!searchParams) return { results: [], totalRegistros: 0, totalTransacoes: 0 };
      
      // Build base filter for both queries
      const buildBaseQuery = () => {
        let q = supabase
          .from('itbi_transactions')
          .select('id, logradouro, numero, complemento, bairro, data_transacao, valor_transacao, area_m2, valor_m2, tipologia, total_transacoes')
          .eq('uso', 'Residencial')
          .gte('percentual_transferido', 90)
          .not('valor_m2', 'is', null);

        if (searchParams.valorMin) q = q.gte('valor_transacao', searchParams.valorMin);
        if (searchParams.valorMax) q = q.lte('valor_transacao', searchParams.valorMax);
        if (searchParams.areaMin) q = q.gte('area_m2', searchParams.areaMin);
        if (searchParams.areaMax) q = q.lte('area_m2', searchParams.areaMax);
        if (searchParams.tipologia && searchParams.tipologia !== 'all') q = q.ilike('tipologia', `%${searchParams.tipologia}%`);
        if (searchParams.anoInicio && searchParams.anoInicio !== 'all') q = q.gte('data_transacao', `${searchParams.anoInicio}-01-01`);
        if (searchParams.anoFim && searchParams.anoFim !== 'all') q = q.lte('data_transacao', `${searchParams.anoFim}-12-31`);
        if (searchParams.bairro) q = q.ilike('bairro', `%${searchParams.bairro}%`);
        
        return q;
      };

      let fuzzyCorrection: { original: string; corrected: string } | undefined;
      let orConditions = '';
      
      if (searchParams.logradouro) {
        const variations = generateFuzzyVariations(searchParams.logradouro);
        orConditions = variations.map(v => `logradouro.ilike.%${v}%`).join(',');
        
        if (variations.length > 1) {
          const upperOriginal = searchParams.logradouro.toUpperCase();
          const correctedVariation = variations.find(v => v !== upperOriginal && v !== searchParams.logradouro);
          if (correctedVariation) {
            fuzzyCorrection = { original: searchParams.logradouro, corrected: correctedVariation };
          }
        }
      }

      // Query 1: Get all records (no limit) to calculate correct totals
      let totalQuery = buildBaseQuery();
      if (orConditions) totalQuery = totalQuery.or(orConditions);
      
      const { data: allData, error: totalError } = await totalQuery;
      if (totalError) throw totalError;

      // Calculate real totals from ALL matching records
      const totalRegistros = allData?.length || 0;
      const totalTransacoes = allData?.reduce((sum, r) => sum + (r.total_transacoes || 1), 0) || 0;

      // Query 2: Get limited results for display (ordered by value)
      let displayQuery = buildBaseQuery();
      if (orConditions) displayQuery = displayQuery.or(orConditions);
      displayQuery = displayQuery.order('valor_transacao', { ascending: false }).limit(500);

      const { data, error } = await displayQuery;
      if (error) throw error;
      
      return { 
        results: data || [],
        totalRegistros,
        totalTransacoes,
        fuzzyCorrection: (data && data.length > 0) ? fuzzyCorrection : undefined,
      };
    },
  });

  // Query for ALL aggregated transactions of this street/typology to show historical comparison
  const { data: transactionHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['transaction-history-detail', selectedTransaction?.logradouro, selectedTransaction?.tipologia, searchParams?.anoInicio, searchParams?.anoFim],
    enabled: !!selectedTransaction && detailsDialogOpen,
    queryFn: async () => {
      if (!selectedTransaction) return [];
      
      // Buscar TODOS os registros agregados deste logradouro/tipologia no período selecionado
      // IMPORTANTE: Cada registro no banco já é uma agregação (total_transacoes = quantidade de transações que compõem a média)
      let query = supabase
        .from('itbi_transactions')
        .select('id, logradouro, numero, complemento, bairro, data_transacao, valor_transacao, area_m2, valor_m2, tipologia, total_transacoes')
        .eq('uso', 'Residencial')
        .ilike('logradouro', selectedTransaction.logradouro)
        .ilike('bairro', selectedTransaction.bairro || '')
        .gte('percentual_transferido', 90)
        .not('valor_m2', 'is', null);
      
      // Filtrar pelo período de anos selecionado
      if (searchParams?.anoInicio) {
        query = query.gte('data_transacao', `${searchParams.anoInicio}-01-01`);
      }
      if (searchParams?.anoFim) {
        query = query.lte('data_transacao', `${searchParams.anoFim}-12-31`);
      }
      
      // Filtrar por tipologia se selecionada
      if (selectedTransaction.tipologia) {
        query = query.ilike('tipologia', `%${selectedTransaction.tipologia}%`);
      }
      
      const { data, error } = await query
        .order('data_transacao', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });

  const results = searchData?.results;
  const fuzzyCorrection = searchData?.fuzzyCorrection;

  const handleSearch = () => {
    setSearchParams({
      valorMin: valorMin ? parseFloat(valorMin) : undefined,
      valorMax: valorMax ? parseFloat(valorMax) : undefined,
      areaMin: areaMin ? parseFloat(areaMin) : undefined,
      areaMax: areaMax ? parseFloat(areaMax) : undefined,
      tipologia: tipologia || undefined,
      anoInicio: anoInicio || undefined,
      anoFim: anoFim || undefined,
      bairro: bairro || undefined,
      logradouro: logradouro || undefined,
    });
  };

  const clearFilters = () => {
    setValorMin("");
    setValorMax("");
    setAreaMin("");
    setAreaMax("");
    setTipologia("");
    setAnoInicio("");
    setAnoFim("");
    setBairro(defaultBairro);
    setLogradouro("");
    setSearchParams(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Volume financeiro real: valor_transacao × total_transacoes para cada registro
  const totalValue = results?.reduce((sum, r) => sum + (r.valor_transacao * (r.total_transacoes || 1)), 0) || 0;
  // Use the real total from the query (calculated from all records, not just displayed ones)
  const displayedTransacoes = results?.reduce((sum, r) => sum + (r.total_transacoes || 1), 0) || 0;
  const realTotalTransacoes = searchData?.totalTransacoes || 0;
  const realTotalRegistros = searchData?.totalRegistros || 0;
  // Média ponderada de R$/m² pelo número de transações
  const avgValueM2 = realTotalTransacoes > 0
    ? results?.reduce((sum, r) => sum + ((r.valor_m2 || 0) * (r.total_transacoes || 1)), 0) / realTotalTransacoes
    : 0;

  const handleOpenDetails = (transaction: AdvancedSearchResult) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };

  const handleExportXLSX = () => {
    if (!results || results.length === 0) {
      toast({ title: "Sem dados", description: "Faça uma busca primeiro.", variant: "destructive" });
      return;
    }

    const appliedFilters: Record<string, string> = {};
    if (searchParams?.valorMin) appliedFilters['Valor Mínimo'] = formatCurrency(searchParams.valorMin);
    if (searchParams?.valorMax) appliedFilters['Valor Máximo'] = formatCurrency(searchParams.valorMax);
    if (searchParams?.areaMin) appliedFilters['Área Mínima'] = `${searchParams.areaMin} m²`;
    if (searchParams?.areaMax) appliedFilters['Área Máxima'] = `${searchParams.areaMax} m²`;
    if (searchParams?.tipologia) appliedFilters['Tipologia'] = searchParams.tipologia;
    if (searchParams?.anoInicio) appliedFilters['Ano Início'] = searchParams.anoInicio;
    if (searchParams?.anoFim) appliedFilters['Ano Fim'] = searchParams.anoFim;
    if (searchParams?.bairro) appliedFilters['Bairro'] = searchParams.bairro;
    if (searchParams?.logradouro) appliedFilters['Logradouro'] = searchParams.logradouro;

    exportToXLSX({
      filename: 'busca_localizacao_godoy_prime',
      title: 'Busca por Localização - Godoy Prime Analytics',
      subtitle: 'Transações ITBI',
      filters: appliedFilters,
      data: results,
      columns: [
        { key: 'logradouro', header: 'Logradouro', width: 35, format: 'text' },
        { key: 'bairro', header: 'Bairro', width: 20, format: 'text' },
        { key: 'tipologia', header: 'Tipologia', width: 15, format: 'text' },
        { key: 'data_transacao', header: 'Data', width: 12, format: 'date' },
        { key: 'valor_transacao', header: 'Valor Médio', width: 18, format: 'currency' },
        { key: 'area_m2', header: 'Área (m²)', width: 12, format: 'number' },
        { key: 'valor_m2', header: 'R$/m²', width: 15, format: 'currency' },
        { key: 'total_transacoes', header: 'Transações', width: 12, format: 'number' },
      ],
      summary: [
        { label: 'Total de Registros', value: realTotalRegistros },
        { label: 'Total de Transações Reais', value: realTotalTransacoes },
        { label: 'Média R$/m²', value: avgValueM2 },
      ],
    });

    toast({ title: "Exportado", description: `${results.length} registros exportados.` });
  };

  const handleExportCSV = () => {
    if (!results || results.length === 0) {
      toast({ title: "Sem dados", description: "Faça uma busca primeiro.", variant: "destructive" });
      return;
    }

    const exportData = results.map((r, idx) => ({
      '#': idx + 1,
      Logradouro: r.logradouro,
      Bairro: r.bairro || '',
      Tipologia: r.tipologia || '',
      Data: new Date(r.data_transacao).toLocaleDateString('pt-BR'),
      Valor_Medio: r.valor_transacao,
      Area_m2: r.area_m2,
      Valor_m2: r.valor_m2 || '',
      Total_Transacoes: r.total_transacoes || 1,
    }));

    exportToCSV(exportData, 'busca_localizacao_godoy_prime');
    toast({ title: "Exportado", description: `${results.length} registros exportados.` });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Logradouro</Label>
          <Popover open={logradouroPopoverOpen} onOpenChange={setLogradouroPopoverOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Building className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rua, avenida..."
                  value={logradouro}
                  onChange={(e) => {
                    setLogradouro(e.target.value);
                    if (e.target.value.length >= 2) setLogradouroPopoverOpen(true);
                  }}
                  onFocus={() => {
                    if (logradouro.length >= 2) setLogradouroPopoverOpen(true);
                  }}
                  className="h-9 text-sm pl-8"
                />
                {logradouro && (
                  <button
                    onClick={() => { setLogradouro(""); setLogradouroPopoverOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            {streetSuggestions && streetSuggestions.length > 0 && (
              <PopoverContent className="p-0 w-[300px]" align="start">
                <ScrollArea className="h-[200px]">
                  {streetSuggestions.map((s) => (
                    <button
                      key={s.logradouro}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                      onClick={() => {
                        setLogradouro(s.logradouro);
                        setLogradouroPopoverOpen(false);
                      }}
                    >
                      <span className="truncate">{s.nome_condominio || s.logradouro}</span>
                      <Badge variant="secondary" className="text-xs ml-2">{s.total_transacoes}</Badge>
                    </button>
                  ))}
                </ScrollArea>
              </PopoverContent>
            )}
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Bairro</Label>
          <Popover open={bairroPopoverOpen} onOpenChange={setBairroPopoverOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Bairro..."
                  value={bairro}
                  onChange={(e) => {
                    setBairro(e.target.value);
                    if (e.target.value.length >= 2) setBairroPopoverOpen(true);
                  }}
                  onFocus={() => {
                    if (bairro.length >= 2) setBairroPopoverOpen(true);
                  }}
                  className="h-9 text-sm pl-8"
                />
                {bairro && bairro !== defaultBairro && (
                  <button
                    onClick={() => { setBairro(defaultBairro); setBairroPopoverOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            {bairroSuggestions && bairroSuggestions.length > 0 && (
              <PopoverContent className="p-0 w-[250px]" align="start">
                <ScrollArea className="h-[200px]">
                  {bairroSuggestions.map((b) => (
                    <button
                      key={b.bairro}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                      onClick={() => {
                        setBairro(b.bairro);
                        setBairroPopoverOpen(false);
                      }}
                    >
                      <span className="truncate">{b.bairro}</span>
                      <Badge variant="secondary" className="text-xs ml-2">{b.total_transacoes}</Badge>
                    </button>
                  ))}
                </ScrollArea>
              </PopoverContent>
            )}
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tipologia</Label>
          <Select value={tipologia} onValueChange={setTipologia}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              {TIPOLOGIA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value || 'all'}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Área Mín (m²)</Label>
          <Input
            type="number"
            placeholder="0"
            value={areaMin}
            onChange={(e) => setAreaMin(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Área Máx (m²)</Label>
          <Input
            type="number"
            placeholder="1000"
            value={areaMax}
            onChange={(e) => setAreaMax(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Valor Mínimo</Label>
          <CurrencyInput
            placeholder="R$ 500.000"
            value={valorMin}
            onChange={setValorMin}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor Máximo</Label>
          <CurrencyInput
            placeholder="R$ 10.000.000"
            value={valorMax}
            onChange={setValorMax}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Ano</Label>
          <div className="flex gap-1">
            <Select value={anoInicio} onValueChange={setAnoInicio}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="De" />
              </SelectTrigger>
              <SelectContent>
                {ANO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || 'all'}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anoFim} onValueChange={setAnoFim}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Até" />
              </SelectTrigger>
              <SelectContent>
                {ANO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || 'all'}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSearch} disabled={isLoading || isFetching} className="flex-1">
          {isLoading || isFetching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Buscar
        </Button>
        <Button variant="outline" onClick={clearFilters} title="Limpar filtros">
          <RotateCcw className="h-4 w-4" />
        </Button>
        {results && results.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                <FileDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportXLSX} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>Excel (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>CSV (.csv)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Results */}
      {isLoading || isFetching ? (
        <div className="p-6 border rounded-lg bg-muted/30 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Buscando transações...</span>
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-3">
          {/* Fuzzy correction notice */}
          {fuzzyCorrection && (
            <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-400">
                Correção automática: "<span className="line-through opacity-70">{fuzzyCorrection.original}</span>" → "<span className="font-semibold">{fuzzyCorrection.corrected}</span>"
              </span>
            </div>
          )}
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Registros</div>
              <div className="font-semibold">
                {results.length < realTotalRegistros ? (
                  <span title={`Exibindo ${results.length} de ${realTotalRegistros}`}>
                    {results.length} <span className="text-muted-foreground">/ {realTotalRegistros}</span>
                  </span>
                ) : (
                  realTotalRegistros
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Transações</div>
              <div className="font-semibold">
                {displayedTransacoes < realTotalTransacoes ? (
                  <span title={`Exibindo ${displayedTransacoes} de ${realTotalTransacoes}`}>
                    {displayedTransacoes.toLocaleString('pt-BR')} <span className="text-muted-foreground">/ {realTotalTransacoes.toLocaleString('pt-BR')}</span>
                  </span>
                ) : (
                  realTotalTransacoes.toLocaleString('pt-BR')
                )}
              </div>
            </div>
            <div className="text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        Valor Total
                        <Info className="h-3 w-3" />
                      </div>
                      <div className="font-semibold text-sm">{formatCurrency(totalValue)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Volume financeiro estimado: soma de (valor médio × quantidade de transações) de cada registro agregado no período.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Média R$/m²</div>
              <div className="font-semibold">{formatCurrency(avgValueM2)}</div>
            </div>
          </div>

          {results.length < realTotalRegistros && (
            <div className="text-xs text-muted-foreground text-center p-1 bg-muted/20 rounded">
              Exibindo os {results.length} registros de maior valor. Total: {realTotalRegistros} registros ({realTotalTransacoes} transações)
            </div>
          )}

          {/* Table */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="text-xs">Logradouro</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Bairro</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="text-xs">Valor Médio</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Área</TableHead>
                  <TableHead className="text-xs">R$/m²</TableHead>
                  <TableHead className="text-xs text-center">Trans.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="text-xs font-medium max-w-[150px] truncate" title={r.logradouro}>
                      {r.logradouro}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell">{r.bairro}</TableCell>
                    <TableCell className="text-xs hidden md:table-cell">
                      {r.tipologia && <Badge variant="outline" className="text-[10px]">{r.tipologia}</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{formatCurrency(r.valor_transacao)}</TableCell>
                    <TableCell className="text-xs hidden sm:table-cell">{r.area_m2.toFixed(0)} m²</TableCell>
                    <TableCell className="text-xs font-semibold text-primary">
                      {r.valor_m2 ? formatCurrency(r.valor_m2) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      <button
                        onClick={() => handleOpenDetails(r)}
                        className="inline-flex items-center gap-1 hover:bg-primary/10 rounded px-1 py-0.5 transition-colors cursor-pointer"
                        title="Ver histórico de transações deste logradouro"
                      >
                        <Badge variant="secondary" className="text-[10px] hover:bg-primary/20">
                          {r.total_transacoes}
                        </Badge>
                        <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : searchParams ? (
        <div className="p-6 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado para os filtros selecionados
        </div>
      ) : (
        <div className="p-6 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
          Configure os filtros e clique em Buscar para ver as transações
        </div>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Histórico de Transações no Logradouro
            </DialogTitle>
            <DialogDescription className="flex flex-col gap-1">
              <span className="font-medium">{selectedTransaction?.logradouro} - {selectedTransaction?.bairro}</span>
              <span className="text-xs">
                {selectedTransaction?.tipologia && `Tipologia: ${selectedTransaction.tipologia}`}
                {searchParams?.anoInicio && searchParams?.anoFim && (
                  <span> • Período: {searchParams.anoInicio} a {searchParams.anoFim}</span>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Explanation about data structure */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>ℹ️ Como interpretar:</strong> Os dados do ITBI são consolidados mensalmente. 
                  O campo "<strong>Qtd Trans.</strong>" indica quantas escrituras compõem cada registro agregado. 
                  Os valores de R$/m², Área e Valor são <strong>médias ponderadas</strong> das transações daquele período.
                </div>
              </div>

              {/* Selected Transaction Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Registro Selecionado</div>
                  <div className="font-semibold text-sm">
                    {selectedTransaction.data_transacao && new Date(selectedTransaction.data_transacao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Qtd. Transações</div>
                  <div className="font-semibold text-sm text-blue-600">{selectedTransaction.total_transacoes}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">R$/m² Médio</div>
                  <div className="font-semibold text-sm text-primary">
                    {selectedTransaction.valor_m2 ? formatCurrency(selectedTransaction.valor_m2) : 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Área Média</div>
                  <div className="font-semibold text-sm">{selectedTransaction.area_m2.toFixed(0)} m²</div>
                </div>
              </div>

              {/* Historical Records List */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Todos os registros mensais deste logradouro
                  </span>
                  {transactionHistory && (
                    <Badge variant="secondary" className="text-xs">
                      {transactionHistory.length} períodos • {transactionHistory.reduce((sum, t) => sum + (t.total_transacoes || 1), 0)} transações totais
                    </Badge>
                  )}
                </div>

                {isLoadingHistory ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando histórico...</span>
                  </div>
                ) : transactionHistory && transactionHistory.length > 0 ? (
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs text-center">Qtd Trans.</TableHead>
                          <TableHead className="text-xs">Valor Médio</TableHead>
                          <TableHead className="text-xs">Área Média</TableHead>
                          <TableHead className="text-xs">R$/m²</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionHistory.map((t, index) => (
                          <TableRow 
                            key={t.id || index}
                            className={t.id === selectedTransaction.id ? 'bg-primary/10' : ''}
                          >
                            <TableCell className="text-xs">
                              {new Date(t.data_transacao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {t.total_transacoes}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{formatCurrency(t.valor_transacao)}</TableCell>
                            <TableCell className="text-xs">{t.area_m2.toFixed(0)} m²</TableCell>
                            <TableCell className="text-xs font-semibold text-primary">
                              {t.valor_m2 ? formatCurrency(t.valor_m2) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                    Nenhum registro encontrado no período selecionado
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              {transactionHistory && transactionHistory.length > 0 && (
                <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded-lg text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Total de Escrituras</div>
                    <div className="font-semibold text-blue-600">
                      {transactionHistory.reduce((sum, t) => sum + (t.total_transacoes || 1), 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Média R$/m² Geral</div>
                    <div className="font-semibold text-primary">
                      {formatCurrency(
                        transactionHistory.reduce((sum, t) => sum + ((t.valor_m2 || 0) * (t.total_transacoes || 1)), 0) / 
                        transactionHistory.reduce((sum, t) => sum + (t.total_transacoes || 1), 0)
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Períodos Analisados</div>
                    <div className="font-semibold">
                      {transactionHistory.length} meses
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
