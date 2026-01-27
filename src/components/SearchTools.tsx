import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, DollarSign, Calculator, Loader2, FileDown, RotateCcw, Trash2, FileSpreadsheet, FileText } from "lucide-react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useTransactionSearch } from "@/hooks/useTransactionSearch";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { Badge } from "./ui/badge";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { ValuationEngine } from "./valuation/ValuationEngine";
import { EmbeddedAdvancedSearch } from "./EmbeddedAdvancedSearch";

interface SearchToolsProps {
  bairro?: string;
  vistoriaData?: {
    logradouro?: string;
    bairro?: string;
    area_m2?: number;
    tipoImovel?: string;
    nomeCondominio?: string;
    checklistSummary?: {
      criticalCount: number;
      attentionCount: number;
      progress: number;
      eletrica?: boolean;
      hidraulica?: boolean;
      acabamentos?: boolean;
      climatizacao?: boolean;
      seguranca?: boolean;
      lazer?: boolean;
      automacao?: boolean;
    };
  };
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

export function SearchTools({ bairro = "BARRA DA TIJUCA", vistoriaData }: SearchToolsProps) {
  const { toast } = useToast();
  const { history, addToHistory, clearHistory } = useSearchHistory();
  const queryClient = useQueryClient();

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

  const handleTransactionSearch = () => {
    setSearchTransactions(true);
    const minLabel = VALOR_OPTIONS.find(o => o.value === valorMin)?.label || 'Sem limite';
    const maxLabel = VALOR_OPTIONS.find(o => o.value === valorMax)?.label || 'Sem limite';
    addToHistory(`${minLabel} - ${maxLabel}`, 'transaction');
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
    queryClient.removeQueries({ queryKey: ['transaction-search'] });
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

          {/* Aba Localização - Usando busca avançada */}
          <TabsContent value="localizacao" className="space-y-4 mt-4">
            <EmbeddedAdvancedSearch />
          </TabsContent>

          {/* Aba Transações */}
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
                    <SelectItem value="Comercial">Comercial (Lojas, Salas)</SelectItem>
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
            
            {transactionLoading ? (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Buscando transações...</span>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between p-2 rounded bg-muted/30">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : transactionResult && transactionResult.length > 0 ? (
              <div className="space-y-2">
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

          {/* Aba Valuation */}
          <TabsContent value="valuation" className="mt-4">
            <ValuationEngine bairro={bairro} vistoriaData={vistoriaData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
