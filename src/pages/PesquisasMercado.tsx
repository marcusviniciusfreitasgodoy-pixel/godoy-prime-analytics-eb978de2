import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, Loader2, FileDown, RotateCcw, Trash2, FileSpreadsheet, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactionSearch } from "@/hooks/useTransactionSearch";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmbeddedAdvancedSearch } from "@/components/EmbeddedAdvancedSearch";
import { useBairro } from "@/contexts/BairroContext";

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

export default function PesquisasMercado() {
  const { toast } = useToast();
  const { history, addToHistory, clearHistory } = useSearchHistory();
  const queryClient = useQueryClient();
  const { selectedBairro } = useBairro();

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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pesquisas de Mercado</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Busque transações por localização ou faixa de valor
        </p>
      </div>

      <Card>
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
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="localizacao" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Localização</span>
              </TabsTrigger>
              <TabsTrigger value="transacoes" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                <DollarSign className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Transações</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Localização */}
            <TabsContent value="localizacao" className="space-y-4 mt-4">
              <EmbeddedAdvancedSearch defaultBairro={selectedBairro} />
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
              
              {/* Results */}
              {transactionResult && transactionResult.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground text-sm">
                      Ranking de Liquidez por Logradouro
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {transactionResult.length} logradouros encontrados
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {transactionResult.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-accent w-6 text-center">{index + 1}º</span>
                          <div>
                            <p className="font-medium text-foreground text-sm">{item.microbairro}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.total_transacoes} transações
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            R$ {item.preco_medio_m2?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m²
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {transactionResult && transactionResult.length === 0 && searchTransactions && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma transação encontrada com os filtros selecionados.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Search History */}
          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Buscas recentes:</p>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 5).map((item, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {item.type === 'transaction' ? <DollarSign className="h-3 w-3 mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                    {item.query}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
