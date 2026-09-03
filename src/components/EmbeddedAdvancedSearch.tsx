import { useState } from "react";
import { Input } from "./ui/input";
import { CondominioSelector } from "./valuation/CondominioSelector";
import type { CondominioSelecionado } from "@/types/valuation";
import { CurrencyInput } from "./ui/currency-input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Loader2, Search, FileText, X, FileSpreadsheet, MapPin, Building, RotateCcw, Info, Eye, Calendar, TrendingUp, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToPDF, exportToXLSX } from "@/utils/exportUtils";
import { generateFuzzyVariations } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useStreetSuggestions } from "@/hooks/useStreetSuggestions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { getCompactReportYearOptions } from "@/lib/reportYearOptions";
import { getOutlierLimit, DEFAULT_OUTLIER_MAX } from '@/lib/outlierLimits';

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
  // Aggregates calculated from ALL data (not just displayed results)
  avgValueM2All: number;
  totalValueAll: number;
  currentValueM2: number | null; // Last 3 months weighted avg, null if no recent data
  cagrAnual: number | null; // null if < 2 years of data
  valorizacaoTotal: number | null; // null if < 2 years of data
  anosComDados: number;
  confiancaCAGR: 'alta' | 'media' | 'baixa' | null;
}

const TIPOLOGIA_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Apartamento', label: 'Apartamento' },
  { value: 'Comercial', label: 'Comercial (Lojas, Salas)' },
];

const USO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'Residencial', label: 'Residencial' },
  { value: 'Comercial', label: 'Comercial' },
];

const ANO_OPTIONS = getCompactReportYearOptions();

interface EmbeddedAdvancedSearchProps {
  defaultBairro?: string;
}

export function EmbeddedAdvancedSearch({ defaultBairro = "" }: EmbeddedAdvancedSearchProps) {
  const { toast } = useToast();
  
  // Form state
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [uso, setUso] = useState("");
  const [anoInicio, setAnoInicio] = useState("");
  const [anoFim, setAnoFim] = useState("");
  const [bairro, setBairro] = useState(defaultBairro);
  const [logradouro, setLogradouro] = useState("");
  const [nomeCondominio, setNomeCondominio] = useState("");
  const [condominioSelecionado, setCondominioSelecionado] = useState<CondominioSelecionado | null>(null);
  // Autocomplete popover state for logradouro only
  const [logradouroPopoverOpen, setLogradouroPopoverOpen] = useState(false);
  
  // Autocomplete suggestions for street
  const { data: streetSuggestions } = useStreetSuggestions(logradouro, bairro || undefined);

  // Evita duplicidades no dropdown (alguns cenários podem retornar o mesmo logradouro mais de uma vez)
  // Mostra apenas logradouros únicos (condomínios têm campo de busca dedicado abaixo)
  const uniqueStreetSuggestions = (streetSuggestions || []).reduce((acc, s) => {
    if (!acc.find(x => x.logradouro === s.logradouro)) acc.push(s);
    return acc;
  }, [] as typeof streetSuggestions);
  
  // Search trigger
  const [searchParams, setSearchParams] = useState<{
    valorMin?: number;
    valorMax?: number;
    areaMin?: number;
    areaMax?: number;
    tipologia?: string;
    uso?: string;
    anoInicio?: string;
    anoFim?: string;
    bairro?: string;
    logradouro?: string;
    logradouros?: string[];
  } | null>(null);

  // State for transaction details modal
  const [selectedTransaction, setSelectedTransaction] = useState<AdvancedSearchResult | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: searchData, isLoading, isFetching } = useQuery<SearchResultsWithMeta>({
    queryKey: ['embedded-advanced-search', searchParams],
    enabled: !!searchParams,
    queryFn: async () => {
      if (!searchParams) return { results: [], totalRegistros: 0, totalTransacoes: 0, avgValueM2All: 0, totalValueAll: 0, currentValueM2: null, cagrAnual: null, valorizacaoTotal: null, anosComDados: 0, confiancaCAGR: null };
      
      // Build base filter for both queries
      const buildBaseQuery = () => {
        let q = supabase
          .from('itbi_transactions')
          .select('id, logradouro, numero, complemento, bairro, data_transacao, valor_transacao, area_m2, valor_m2, tipologia, total_transacoes, uso')
          .gte('percentual_transferido', 90)
          .not('valor_m2', 'is', null);

        // Filtro de outliers por bairro (consistente com todos os outros módulos)
        const outlierLimit = searchParams.bairro ? getOutlierLimit(searchParams.bairro) : DEFAULT_OUTLIER_MAX;
        q = q.lte('valor_m2', outlierLimit);

        // Apply uso filter - defaults to Residencial if not specified
        if (searchParams.uso && searchParams.uso !== 'all') {
          q = q.eq('uso', searchParams.uso as 'Residencial' | 'Comercial');
        } else {
          q = q.eq('uso', 'Residencial');
        }

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
      
      // When condominium logradouros are provided, use them as OR filter
      if (searchParams.logradouros && searchParams.logradouros.length > 0) {
        const normalizeAccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        orConditions = searchParams.logradouros
          .map(rua => `logradouro.ilike.%${normalizeAccent(rua)}%`)
          .join(',');
      } else if (searchParams.logradouro) {
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
      
      const { data: allData, error: totalError } = await totalQuery.limit(5000);
      if (totalError) throw totalError;

      // Calculate real totals from ALL matching records
      const totalRegistros = allData?.length || 0;
      const totalTransacoes = allData?.reduce((sum, r) => sum + (r.total_transacoes || 1), 0) || 0;

      // === AGGREGATE CALCULATIONS FROM ALL DATA ===
      const records = allData || [];
      
      // 1. Weighted average R$/m² (all data)
      const sumWeightedM2 = records.reduce((sum, r) => sum + ((r.valor_m2 || 0) * (r.total_transacoes || 1)), 0);
      const avgValueM2All = totalTransacoes > 0 ? sumWeightedM2 / totalTransacoes : 0;

      // 2. Total financial volume (all data)
      const totalValueAll = records.reduce((sum, r) => sum + (r.valor_transacao * (r.total_transacoes || 1)), 0);

      // 3. Current R$/m² (last 3 months of dataset)
      let currentValueM2: number | null = null;
      if (records.length > 0) {
        const sortedDates = records.map(r => r.data_transacao).sort();
        const maxDate = new Date(sortedDates[sortedDates.length - 1]);
        const threeMonthsBack = new Date(maxDate);
        threeMonthsBack.setMonth(threeMonthsBack.getMonth() - 3);
        const threeMonthsBackStr = threeMonthsBack.toISOString().split('T')[0];
        
        const recentRecords = records.filter(r => r.data_transacao >= threeMonthsBackStr);
        if (recentRecords.length > 0) {
          const recentWeighted = recentRecords.reduce((sum, r) => sum + ((r.valor_m2 || 0) * (r.total_transacoes || 1)), 0);
          const recentTotal = recentRecords.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
          currentValueM2 = recentTotal > 0 ? recentWeighted / recentTotal : null;
        }
      }

      // 4. CAGR and Total Appreciation - group by year
      let cagrAnual: number | null = null;
      let valorizacaoTotal: number | null = null;
      let anosComDados = 0;
      let confiancaCAGR: 'alta' | 'media' | 'baixa' | null = null;

      if (records.length > 0) {
        const yearGroups: Record<number, { sumWeighted: number; totalTrans: number }> = {};
        records.forEach(r => {
          const year = new Date(r.data_transacao).getFullYear();
          if (!yearGroups[year]) yearGroups[year] = { sumWeighted: 0, totalTrans: 0 };
          yearGroups[year].sumWeighted += (r.valor_m2 || 0) * (r.total_transacoes || 1);
          yearGroups[year].totalTrans += (r.total_transacoes || 1);
        });

        const years = Object.keys(yearGroups).map(Number).sort();
        anosComDados = years.length;

        if (years.length >= 2) {
          const firstYear = years[0];
          const lastYear = years[years.length - 1];
          const avgFirst = yearGroups[firstYear].sumWeighted / yearGroups[firstYear].totalTrans;
          const avgLast = yearGroups[lastYear].sumWeighted / yearGroups[lastYear].totalTrans;
          const nYears = lastYear - firstYear;

          if (avgFirst > 0 && nYears > 0) {
            cagrAnual = (Math.pow(avgLast / avgFirst, 1 / nYears) - 1) * 100;
            valorizacaoTotal = ((avgLast - avgFirst) / avgFirst) * 100;
          }

          // Confidence based on minimum transactions per year
          const minTransPerYear = Math.min(...years.map(y => yearGroups[y].totalTrans));
          if (minTransPerYear >= 10) confiancaCAGR = 'alta';
          else if (minTransPerYear >= 3) confiancaCAGR = 'media';
          else confiancaCAGR = 'baixa';
        }
      }

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
        avgValueM2All,
        totalValueAll,
        currentValueM2,
        cagrAnual,
        valorizacaoTotal,
        anosComDados,
        confiancaCAGR,
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

      // Filtro de outliers por bairro (consistente com todos os outros módulos)
      const historyOutlierLimit = selectedTransaction.bairro ? getOutlierLimit(selectedTransaction.bairro) : DEFAULT_OUTLIER_MAX;
      query = query.lte('valor_m2', historyOutlierLimit);
      
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
      uso: uso || undefined,
      anoInicio: anoInicio || undefined,
      anoFim: anoFim || undefined,
      bairro: bairro || undefined,
      logradouro: condominioSelecionado ? undefined : (logradouro || undefined),
      logradouros: condominioSelecionado?.logradouros_busca ?? condominioSelecionado?.ruas_internas,
    });
  };

  const clearFilters = () => {
    setValorMin("");
    setValorMax("");
    setAreaMin("");
    setAreaMax("");
    setTipologia("");
    setUso("");
    setAnoInicio("");
    setAnoFim("");
    setBairro("");
    setLogradouro("");
    setNomeCondominio("");
    setCondominioSelecionado(null);
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

  // Use aggregates from allData (calculated in queryFn)
  const totalValue = searchData?.totalValueAll || 0;
  const displayedTransacoes = results?.reduce((sum, r) => sum + (r.total_transacoes || 1), 0) || 0;
  const realTotalTransacoes = searchData?.totalTransacoes || 0;
  const realTotalRegistros = searchData?.totalRegistros || 0;
  const avgValueM2 = searchData?.avgValueM2All || 0;
  const currentValueM2 = searchData?.currentValueM2;
  const cagrAnual = searchData?.cagrAnual;
  const valorizacaoTotal = searchData?.valorizacaoTotal;
  const anosComDados = searchData?.anosComDados || 0;
  const confiancaCAGR = searchData?.confiancaCAGR;

  const handleOpenDetails = (transaction: AdvancedSearchResult) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };

  const locationExportFilters: Record<string, string> = {};
  if (searchParams?.valorMin) locationExportFilters['Valor Mínimo'] = formatCurrency(searchParams.valorMin);
  if (searchParams?.valorMax) locationExportFilters['Valor Máximo'] = formatCurrency(searchParams.valorMax);
  if (searchParams?.areaMin) locationExportFilters['Área Mínima'] = `${searchParams.areaMin} m²`;
  if (searchParams?.areaMax) locationExportFilters['Área Máxima'] = `${searchParams.areaMax} m²`;
  locationExportFilters['Finalidade'] = searchParams?.uso || 'Residencial';
  locationExportFilters['Tipologia'] = searchParams?.tipologia || 'Todas';
  if (searchParams?.anoInicio) locationExportFilters['Ano Início'] = searchParams.anoInicio;
  if (searchParams?.anoFim) locationExportFilters['Ano Fim'] = searchParams.anoFim;
  if (searchParams?.bairro) locationExportFilters['Bairro'] = searchParams.bairro;
  if (searchParams?.logradouro) locationExportFilters['Logradouro'] = searchParams.logradouro;
  if (nomeCondominio) locationExportFilters['Condomínio'] = nomeCondominio;
  if (fuzzyCorrection) locationExportFilters['Busca Corrigida'] = `${fuzzyCorrection.original} → ${fuzzyCorrection.corrected}`;

  const locationExportSummary = [
    { label: 'Registros ITBI (agregações mensais)', value: realTotalRegistros.toLocaleString('pt-BR') },
    { label: 'Escrituras Reais (transações)', value: realTotalTransacoes.toLocaleString('pt-BR') },
    { label: 'Registros Exibidos na Tabela', value: `${results?.length.toLocaleString('pt-BR') || '0'} de ${realTotalRegistros.toLocaleString('pt-BR')}` },
    { label: 'Média do Período (R$/m²)', value: formatCurrency(avgValueM2) },
    { label: 'R$/m² Atual (últimos 3 meses)', value: currentValueM2 != null ? formatCurrency(currentValueM2) : 'Sem dados recentes' },
    { label: 'Volume Estimado', value: formatCurrency(totalValue) },
    { label: 'CAGR', value: cagrAnual != null ? `${cagrAnual.toFixed(1)}% a.a.` : 'Dados insuficientes' },
    { label: 'Valorização Total', value: valorizacaoTotal != null ? `${valorizacaoTotal >= 0 ? '+' : ''}${valorizacaoTotal.toFixed(1)}%` : 'Dados insuficientes' },
    { label: 'Confiança da Valorização', value: cagrAnual != null ? (confiancaCAGR ? `${confiancaCAGR} (${anosComDados} anos com dados)` : `${anosComDados} anos com dados`) : 'Dados insuficientes' },
  ];

  const handleExportXLSX = () => {
    if (!results || results.length === 0) {
      toast({ title: "Sem dados", description: "Faça uma busca primeiro.", variant: "destructive" });
      return;
    }

    exportToXLSX({
      filename: 'busca_localizacao_godoy_prime',
      title: 'Busca por Localização - Godoy Prime Analytics',
      subtitle: 'Transações Oficiais',
      filters: locationExportFilters,
      data: results,
      columns: [
        { key: 'logradouro', header: 'Logradouro', width: 35, format: 'text' },
        { key: 'bairro', header: 'Bairro', width: 20, format: 'text' },
        { key: 'tipologia', header: 'Tipologia', width: 15, format: 'text' },
        { key: 'data_transacao', header: 'Data', width: 12, format: 'date' },
        { key: 'valor_transacao', header: 'Valor Médio', width: 18, format: 'currency' },
        { key: 'area_m2', header: 'Área (m²)', width: 12, format: 'number' },
        { key: 'valor_m2', header: 'R$/m²', width: 15, format: 'currency' },
        { key: 'total_transacoes', header: 'Escrituras', width: 12, format: 'number' },
      ],
      summary: locationExportSummary,
    });

    toast({ title: "Exportado", description: `${results.length} registros exportados.` });
  };

  const handleExportPDF = async () => {
    if (!results || results.length === 0) {
      toast({ title: "Sem dados", description: "Faça uma busca primeiro.", variant: "destructive" });
      return;
    }

    await exportToPDF({
      filename: 'busca_localizacao_godoy_prime',
      title: 'Busca por Localização - Godoy Prime Analytics',
      subtitle: 'Transações Oficiais',
      filters: locationExportFilters,
      data: results,
      columns: [
        { key: 'logradouro', header: 'Logradouro', format: 'text' },
        { key: 'bairro', header: 'Bairro', format: 'text' },
        { key: 'tipologia', header: 'Tipologia', format: 'text' },
        { key: 'data_transacao', header: 'Data', format: 'text' },
        { key: 'valor_transacao', header: 'Valor Médio', format: 'currency' },
        { key: 'valor_m2', header: 'R$/m²', format: 'currency' },
        { key: 'total_transacoes', header: 'Escrituras', format: 'number' },
      ],
      summary: locationExportSummary,
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
        {/* Bairro FIRST */}
        <div className="space-y-1">
          <Label className="text-xs">Bairro</Label>
          <Select 
            value={bairro} 
            onValueChange={(value) => setBairro(value === "todos" ? "" : value)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos os bairros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os bairros</SelectItem>
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

        {/* Logradouro SECOND */}
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
            {uniqueStreetSuggestions.length > 0 && (
              <PopoverContent className="p-0 w-[340px]" align="start">
                <ScrollArea className="h-[200px]">
                  {uniqueStreetSuggestions.map((s) => (
                    <button
                      key={`${s.logradouro}__${s.nome_condominio || ''}__${s.bairro_origem || ''}`}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
                      onClick={() => {
                        setLogradouro(s.logradouro);
                        if (s.bairro_origem) {
                          setBairro(s.bairro_origem);
                        }
                        setLogradouroPopoverOpen(false);
                      }}
                    >
                      <span className="truncate">{s.logradouro}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {s.bairro_origem && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                            <MapPin className="h-3 w-3 mr-0.5" />
                            {s.bairro_origem}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{s.total_transacoes}</Badge>
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </PopoverContent>
            )}
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Finalidade</Label>
          <Select value={uso} onValueChange={setUso}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Residencial" />
            </SelectTrigger>
            <SelectContent>
              {USO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value || 'all'}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Condomínio selector */}
      <div className="space-y-1">
        <Label className="text-xs">Condomínio (opcional)</Label>
        <CondominioSelector
          value={nomeCondominio}
          condominioSelecionado={condominioSelecionado}
          bairro={bairro}
          onChange={(nome, cond) => {
            setNomeCondominio(nome);
            setCondominioSelecionado(cond);
            if (cond) {
              // Clear manual logradouro when condominium is selected
              setLogradouro("");
            }
          }}
        />
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
          <>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Baixar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button variant="outline" onClick={handleExportXLSX}>
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Baixar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
          </>
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
          {/* Analysis Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Métricas de Valor/m² */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Métricas de Valor/m²</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Média do Período</span>
                  <span className="font-semibold text-sm">{formatCurrency(avgValueM2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
                          R$/m² Atual <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Média ponderada dos últimos 3 meses do dataset.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-semibold text-sm text-primary">
                    {currentValueM2 != null ? formatCurrency(currentValueM2) : (
                      <span className="text-muted-foreground text-xs font-normal">Sem dados recentes</span>
                    )}
                  </span>
                </div>
                {currentValueM2 != null && avgValueM2 > 0 && (
                  <div className="flex items-center justify-end gap-1">
                    {currentValueM2 >= avgValueM2 ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${currentValueM2 >= avgValueM2 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {(((currentValueM2 - avgValueM2) / avgValueM2) * 100).toFixed(1)}% vs média
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Transações no Período */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Transações no Período</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Escrituras Reais</span>
                  <span className="font-semibold text-sm">{realTotalTransacoes.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Registros ITBI (agregações)</span>
                  <span className="text-sm text-muted-foreground">{realTotalRegistros.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
                          Volume Estimado <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Soma de (valor médio × qtd transações) de cada registro agregado.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-semibold text-sm">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Análise de Valorização */}
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Análise de Valorização</span>
              </div>
              {cagrAnual != null && valorizacaoTotal != null ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
                          CAGR <Info className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-xs text-xs" side="top">
                        <p className="font-medium mb-1">CAGR — Taxa de Crescimento Anual Composta</p>
                        <p>Mostra quanto o valor/m² cresceu, em média, por ano, considerando juros compostos. Compara a média ponderada do primeiro vs último ano ({anosComDados} anos de dados).</p>
                      </PopoverContent>
                    </Popover>
                    <span className="flex items-center gap-1">
                      {cagrAnual >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`font-semibold text-sm ${cagrAnual >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {cagrAnual.toFixed(1)}% a.a.
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valorização Total</span>
                    <span className={`font-semibold text-sm ${valorizacaoTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {valorizacaoTotal >= 0 ? '+' : ''}{valorizacaoTotal.toFixed(1)}%
                    </span>
                  </div>
                  {confiancaCAGR === 'baixa' && (
                    <div className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                      <Info className="h-3 w-3" />
                      Baixa confiança: algum ano com &lt;3 transações
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-2">
                  Dados insuficientes — são necessários pelo menos 2 anos com transações para calcular valorização.
                </div>
              )}
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
                  <TableHead className="text-xs text-center">Escrit.</TableHead>
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

          {/* Legenda explicativa */}
          <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Como interpretar os resultados:</strong> Cada linha representa um registro mensal agregado da Prefeitura, não uma transação individual. O mesmo logradouro pode aparecer múltiplas vezes quando há registros em meses distintos ou com tipologias/áreas diferentes. A coluna "Escrit." indica quantas escrituras reais compõem cada registro.
            </p>
          </div>
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
                  <strong>ℹ️ Como interpretar:</strong> Os dados oficiais são consolidados mensalmente. 
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
