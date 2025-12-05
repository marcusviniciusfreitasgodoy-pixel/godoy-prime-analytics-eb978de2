import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { CurrencyInput } from "./ui/currency-input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Loader2, FileDown, Search, FileText, X, FileSpreadsheet, MapPin, Building, FileType, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToXLSX, exportToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useBairroSuggestions } from "@/hooks/useBairroSuggestions";
import { useStreetSuggestions } from "@/hooks/useStreetSuggestions";
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

const TIPOLOGIA_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Apartamento', label: 'Apartamento' },
];

const ANO_OPTIONS = [
  { value: '', label: 'Todos os anos' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
];

export function AdvancedSearchReport() {
  const { toast } = useToast();
  
  // Form state
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [anoInicio, setAnoInicio] = useState("");
  const [anoFim, setAnoFim] = useState("");
  const [bairro, setBairro] = useState("");
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

  const { data: results, isLoading, isFetching } = useQuery<AdvancedSearchResult[]>({
    queryKey: ['advanced-search', searchParams],
    enabled: !!searchParams,
    queryFn: async () => {
      if (!searchParams) return [];
      
      let query = supabase
        .from('itbi_transactions')
        .select('id, logradouro, numero, complemento, bairro, data_transacao, valor_transacao, area_m2, valor_m2, tipologia, total_transacoes')
        .eq('uso', 'Residencial')
        .gte('percentual_transferido', 90)
        .not('valor_m2', 'is', null)
        .order('valor_transacao', { ascending: false })
        .limit(100);

      if (searchParams.valorMin) {
        query = query.gte('valor_transacao', searchParams.valorMin);
      }
      if (searchParams.valorMax) {
        query = query.lte('valor_transacao', searchParams.valorMax);
      }
      if (searchParams.areaMin) {
        query = query.gte('area_m2', searchParams.areaMin);
      }
      if (searchParams.areaMax) {
        query = query.lte('area_m2', searchParams.areaMax);
      }
      if (searchParams.tipologia) {
        query = query.ilike('tipologia', `%${searchParams.tipologia}%`);
      }
      if (searchParams.anoInicio) {
        query = query.gte('data_transacao', `${searchParams.anoInicio}-01-01`);
      }
      if (searchParams.anoFim) {
        query = query.lte('data_transacao', `${searchParams.anoFim}-12-31`);
      }
      if (searchParams.bairro) {
        query = query.ilike('bairro', `%${searchParams.bairro}%`);
      }
      if (searchParams.logradouro) {
        query = query.ilike('logradouro', `%${searchParams.logradouro}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

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
    setBairro("");
    setLogradouro("");
    setSearchParams(null);
  };

  const handleExportXLSX = () => {
    if (!results || results.length === 0) {
      toast({
        title: "Sem dados",
        description: "Faça uma busca primeiro para exportar.",
        variant: "destructive",
      });
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
      filename: 'relatorio_avancado_godoy_prime',
      title: 'Relatório Avançado - Godoy Prime Analytics',
      subtitle: 'Análise de Transações Imobiliárias',
      filters: appliedFilters,
      data: results,
      columns: [
        { key: 'logradouro', header: 'Logradouro', width: 35, format: 'text' },
        { key: 'numero', header: 'Número', width: 10, format: 'text' },
        { key: 'bairro', header: 'Bairro', width: 20, format: 'text' },
        { key: 'tipologia', header: 'Tipologia', width: 15, format: 'text' },
        { key: 'data_transacao', header: 'Data', width: 12, format: 'date' },
        { key: 'valor_transacao', header: 'Valor Médio', width: 18, format: 'currency' },
        { key: 'area_m2', header: 'Área (m²)', width: 12, format: 'number' },
        { key: 'valor_m2', header: 'R$/m²', width: 15, format: 'currency' },
        { key: 'total_transacoes', header: 'Transações', width: 12, format: 'number' },
      ],
      summary: [
        { label: 'Total de Registros (Agregações)', value: results.length },
        { label: 'Total de Transações Reais', value: totalTransacoes },
        { label: 'Valor Médio Total', value: totalValue },
        { label: 'Média R$/m²', value: avgValueM2 },
      ],
    });

    toast({
      title: "Exportado com sucesso",
      description: `${results.length} registros exportados para Excel.`,
    });
  };

  const handleExportCSV = () => {
    if (!results || results.length === 0) {
      toast({
        title: "Sem dados",
        description: "Faça uma busca primeiro para exportar.",
        variant: "destructive",
      });
      return;
    }

    const exportData = results.map((r, idx) => ({
      '#': idx + 1,
      Logradouro: r.logradouro,
      Numero: r.numero || '',
      Complemento: r.complemento || '',
      Bairro: r.bairro || '',
      Tipologia: r.tipologia || '',
      Data: new Date(r.data_transacao).toLocaleDateString('pt-BR'),
      Valor_Medio: r.valor_transacao,
      Area_m2: r.area_m2,
      Valor_m2: r.valor_m2 || '',
      Total_Transacoes: r.total_transacoes || 1,
    }));

    exportToCSV(exportData, 'relatorio_avancado_godoy_prime');
    toast({
      title: "Exportado com sucesso",
      description: `${results.length} registros exportados para CSV.`,
    });
  };

  const handleExportPDF = async () => {
    if (!results || results.length === 0) {
      toast({
        title: "Sem dados",
        description: "Faça uma busca primeiro para exportar.",
        variant: "destructive",
      });
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

    await exportToPDF({
      filename: 'relatorio_avancado_godoy_prime',
      title: 'Relatório Avançado - Godoy Prime Analytics',
      subtitle: 'Análise de Transações Imobiliárias',
      filters: appliedFilters,
      data: results,
      columns: [
        { key: 'logradouro', header: 'Logradouro', format: 'text' },
        { key: 'bairro', header: 'Bairro', format: 'text' },
        { key: 'tipologia', header: 'Tipo', format: 'text' },
        { key: 'data_transacao', header: 'Data', format: 'text' },
        { key: 'valor_transacao', header: 'Valor', format: 'currency' },
        { key: 'valor_m2', header: 'R$/m²', format: 'currency' },
        { key: 'total_transacoes', header: 'Trans.', format: 'number' },
      ],
      summary: [
        { label: 'Total de Registros (Agregações)', value: results.length, format: 'number' },
        { label: 'Total de Transações Reais', value: totalTransacoes, format: 'number' },
        { label: 'Valor Médio Total', value: totalValue, format: 'currency' },
        { label: 'Média R$/m²', value: avgValueM2, format: 'currency' },
      ],
    });

    toast({
      title: "PDF exportado",
      description: `Relatório com ${results.length} registros gerado.`,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalValue = results?.reduce((sum, r) => sum + r.valor_transacao, 0) || 0;
  const totalTransacoes = results?.reduce((sum, r) => sum + (r.total_transacoes || 1), 0) || 0;
  const avgValueM2 = results?.length 
    ? results.reduce((sum, r) => sum + (r.valor_m2 || 0), 0) / results.length 
    : 0;

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-5 w-5" />
              Relatório Avançado
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Busca personalizada com filtros customizados e exportação detalhada
            </CardDescription>
          </div>
          {results && results.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <FileType className="h-4 w-4 text-red-500" />
                  <span>PDF (.pdf)</span>
                </DropdownMenuItem>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor Mínimo</Label>
            <CurrencyInput
              placeholder="R$ 15.000.000"
              value={valorMin}
              onChange={setValorMin}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor Máximo</Label>
            <CurrencyInput
              placeholder="R$ 50.000.000"
              value={valorMax}
              onChange={setValorMax}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Área Mínima (m²)</Label>
            <Input
              type="number"
              placeholder="Ex: 100"
              value={areaMin}
              onChange={(e) => setAreaMin(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Área Máxima (m²)</Label>
            <Input
              type="number"
              placeholder="Ex: 500"
              value={areaMax}
              onChange={(e) => setAreaMax(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipologia</Label>
            <Select value={tipologia} onValueChange={setTipologia}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOLOGIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || 'all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ano Início</Label>
            <Select value={anoInicio} onValueChange={setAnoInicio}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="De" />
              </SelectTrigger>
              <SelectContent>
                {ANO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || 'all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ano Fim</Label>
            <Select value={anoFim} onValueChange={setAnoFim}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Até" />
              </SelectTrigger>
              <SelectContent>
                {ANO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value || 'all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bairro</Label>
            <Popover open={bairroPopoverOpen} onOpenChange={setBairroPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o bairro..."
                    value={bairro}
                    onChange={(e) => {
                      setBairro(e.target.value);
                      if (e.target.value.length >= 2) {
                        setBairroPopoverOpen(true);
                      }
                    }}
                    className="h-9 text-sm pl-8"
                  />
                </div>
              </PopoverTrigger>
              {bairroSuggestions && bairroSuggestions.length > 0 && (
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="max-h-[200px] overflow-y-auto">
                    {bairroSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.bairro}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                        onClick={() => {
                          setBairro(suggestion.bairro);
                          setBairroPopoverOpen(false);
                        }}
                      >
                        <span className="truncate">{suggestion.bairro}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {suggestion.total_transacoes.toLocaleString("pt-BR")}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">Logradouro</Label>
            <Popover open={logradouroPopoverOpen} onOpenChange={setLogradouroPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Building className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rua ou condomínio..."
                    value={logradouro}
                    onChange={(e) => {
                      setLogradouro(e.target.value);
                      if (e.target.value.length >= 2) {
                        setLogradouroPopoverOpen(true);
                      }
                    }}
                    className="h-9 text-sm pl-8"
                  />
                </div>
              </PopoverTrigger>
              {streetSuggestions && streetSuggestions.length > 0 && (
                <PopoverContent className="w-[320px] p-0" align="start">
                  <div className="max-h-[250px] overflow-y-auto">
                    {streetSuggestions.map((suggestion, idx) => (
                      <button
                        key={`${suggestion.logradouro}-${idx}`}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent border-b border-border/50 last:border-0"
                        onClick={() => {
                          setLogradouro(suggestion.logradouro);
                          setLogradouroPopoverOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {suggestion.nome_condominio || suggestion.logradouro}
                          </span>
                          <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                            {suggestion.total_transacoes.toLocaleString("pt-BR")}
                          </Badge>
                        </div>
                        {suggestion.nome_condominio && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {suggestion.logradouro}
                          </span>
                        )}
                        {(suggestion.microbairro || suggestion.padrao_construtivo) && (
                          <div className="flex gap-1 mt-1">
                            {suggestion.microbairro && (
                              <Badge variant="outline" className="text-xs">
                                {suggestion.microbairro}
                              </Badge>
                            )}
                            {suggestion.padrao_construtivo && (
                              <Badge variant="outline" className="text-xs">
                                {suggestion.padrao_construtivo}
                              </Badge>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={isLoading || isFetching} className="gap-1">
            {(isLoading || isFetching) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>
          <Button onClick={clearFilters} variant="outline" className="gap-1">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        </div>

        {/* Summary Stats */}
        {results && results.length > 0 && (
          <TooltipProvider>
            <div className="flex flex-wrap gap-2 py-2 border-y border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-help gap-1">
                    <Info className="h-3 w-3" />
                    {results.length} registros (agregações)
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="font-medium mb-1">Dados Agregados</p>
                  <p className="text-xs">Cada registro representa dados agregados por logradouro/mês da Prefeitura, não transações individuais.</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="default" className="text-xs cursor-help gap-1">
                    <Info className="h-3 w-3" />
                    {totalTransacoes.toLocaleString('pt-BR')} transações reais
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="font-medium mb-1">Transações Reais</p>
                  <p className="text-xs">Soma de todas as transações individuais que compõem os registros agregados. Este é o número real de vendas/transferências.</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-help">
                    Valor Médio Total: {formatCurrency(totalValue)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs">Soma dos valores médios de transação por agregação.</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-help">
                    Média R$/m²: {formatCurrency(avgValueM2)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs">Média aritmética do valor por metro quadrado entre todos os registros.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        {/* Results Table */}
        {results && results.length > 0 && (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Médio</TableHead>
                  <TableHead className="text-right">Área</TableHead>
                  <TableHead className="text-right">R$/m²</TableHead>
                  <TableHead className="text-right">Trans.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {r.logradouro}
                      {r.numero && `, ${r.numero}`}
                      {r.complemento && ` - ${r.complemento}`}
                    </TableCell>
                    <TableCell className="text-xs">{r.bairro}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {r.tipologia || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.data_transacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.valor_transacao)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.area_m2.toFixed(0)} m²
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.valor_m2 ? formatCurrency(r.valor_m2) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {r.total_transacoes || 1}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {searchParams && !isLoading && (!results || results.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum resultado encontrado com os filtros selecionados.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
