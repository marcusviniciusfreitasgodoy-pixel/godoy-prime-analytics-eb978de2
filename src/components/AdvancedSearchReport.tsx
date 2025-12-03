import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Loader2, FileDown, Search, FileText, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

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
        .select('id, logradouro, numero, complemento, bairro, data_transacao, valor_transacao, area_m2, valor_m2, tipologia')
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

  const handleExport = () => {
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
      Valor_Total: r.valor_transacao,
      Area_m2: r.area_m2,
      Valor_m2: r.valor_m2 || '',
    }));

    exportToCSV(exportData, `relatorio_avancado_${new Date().toISOString().split('T')[0]}`);
    toast({
      title: "Exportado com sucesso",
      description: `${results.length} registros exportados para CSV.`,
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
            <Button onClick={handleExport} size="sm" variant="outline" className="gap-1">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor Mínimo (R$)</Label>
            <Input
              type="number"
              placeholder="Ex: 15000000"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor Máximo (R$)</Label>
            <Input
              type="number"
              placeholder="Ex: 50000000"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
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
            <Input
              placeholder="Ex: Barra"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <Label className="text-xs">Logradouro</Label>
            <Input
              placeholder="Ex: Lucio Costa"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className="h-9 text-sm"
            />
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
          <div className="flex flex-wrap gap-2 py-2 border-y border-border">
            <Badge variant="secondary" className="text-xs">
              {results.length} {results.length >= 100 ? '+ ' : ''}registros encontrados
            </Badge>
            <Badge variant="outline" className="text-xs">
              Total: {formatCurrency(totalValue)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Média R$/m²: {formatCurrency(avgValueM2)}
            </Badge>
          </div>
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
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Área</TableHead>
                  <TableHead className="text-right">R$/m²</TableHead>
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
