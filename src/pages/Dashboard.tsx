import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { FileDown, Info, HelpCircle, Monitor, FileSpreadsheet, FileText, BarChart3, Search, TrendingUp, MapPin, Database, FileImage, ClipboardCheck } from "lucide-react";
import { generateTestChecklistPDF } from "@/utils/testChecklistPdf";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { EvolutionChart } from "@/components/EvolutionChart";
import { MicrobairroEvolutionChart } from "@/components/MicrobairroEvolutionChart";
import { MicrobairroRanking } from "@/components/MicrobairroRanking";
import { SearchTools } from "@/components/SearchTools";
import { AdvancedSearchReport } from "@/components/AdvancedSearchReport";
import { GuidedTour } from "@/components/GuidedTour";
import { BairroSelector } from "@/components/BairroSelector";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { exportDashboardPDF, exportDashboardXLSX } from "@/utils/dashboardExport";
import { useKPIStats } from "@/hooks/useKPIStats";
import { useMicrobairroRanking } from "@/hooks/useITBITransactions";
import { useEvolutionData } from "@/hooks/useEvolutionData";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

const STORAGE_KEY = 'godoy-selected-bairro';
const DEFAULT_BAIRRO = 'BARRA DA TIJUCA';

export default function Dashboard() {
  const [runTour, setRunTour] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const location = useLocation();

  // Get bairro from URL params or localStorage
  const getBairroFromStorage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_BAIRRO;
    } catch {
      return DEFAULT_BAIRRO;
    }
  };

  const urlBairro = searchParams.get('bairro');
  const [selectedBairro, setSelectedBairroState] = useState(urlBairro || getBairroFromStorage());

  // Update URL and localStorage when bairro changes
  const setSelectedBairro = (bairro: string) => {
    setSelectedBairroState(bairro);
    setSearchParams({ bairro });
    try {
      localStorage.setItem(STORAGE_KEY, bairro);
    } catch {
      // localStorage not available
    }
  };

  // Sync with URL params on mount
  useEffect(() => {
    if (urlBairro && urlBairro !== selectedBairro) {
      setSelectedBairroState(urlBairro);
    }
  }, [urlBairro]);

  // Check for vistoria data from navigation
  const vistoriaData = (location.state as { vistoriaData?: any })?.vistoriaData;

  // Clear location state after reading it
  useEffect(() => {
    if (vistoriaData) {
      window.history.replaceState({}, document.title);
    }
  }, [vistoriaData]);

  // Hooks para dados do dashboard (usados na exportação completa)
  const { data: kpiStats } = useKPIStats(selectedBairro);
  const { data: rankingData } = useMicrobairroRanking(selectedBairro);
  const { data: evolutionData } = useEvolutionData(selectedBairro, 'semester');

  const fetchExportData = async () => {
    const { data, error } = await supabase
      .from("itbi_transactions")
      .select("*")
      .eq("bairro", selectedBairro)
      .eq("uso", "Residencial")
      .gte("percentual_transferido", 90)
      .not("valor_m2", "is", null)
      .order("data_transacao", { ascending: false });

    if (error) throw error;
    return data;
  };

  const handleExportXLSX = async () => {
    setIsExporting(true);
    try {
      const data = await fetchExportData();

      if (data && data.length > 0) {
        const totalValue = data.reduce((sum, r) => sum + r.valor_transacao, 0);
        const avgValueM2 = data.reduce((sum, r) => sum + (r.valor_m2 || 0), 0) / data.length;

        exportToXLSX({
          filename: `itbi_transacoes_${selectedBairro.toLowerCase().replace(/\s+/g, '_')}`,
          title: `Transações ITBI - ${selectedBairro}`,
          subtitle: 'Godoy Prime Analytics - Inteligência Imobiliária',
          filters: {
            'Bairro': selectedBairro,
            'Uso': 'Residencial',
            'Percentual Transferido': '≥ 90%',
          },
          data,
          columns: [
            { key: 'logradouro', header: 'Logradouro', width: 35, format: 'text' },
            { key: 'numero', header: 'Número', width: 10, format: 'text' },
            { key: 'complemento', header: 'Complemento', width: 15, format: 'text' },
            { key: 'bairro', header: 'Bairro', width: 20, format: 'text' },
            { key: 'tipologia', header: 'Tipologia', width: 15, format: 'text' },
            { key: 'data_transacao', header: 'Data', width: 12, format: 'date' },
            { key: 'valor_transacao', header: 'Valor Total', width: 18, format: 'currency' },
            { key: 'area_m2', header: 'Área (m²)', width: 12, format: 'number' },
            { key: 'valor_m2', header: 'R$/m²', width: 15, format: 'currency' },
          ],
          summary: [
            { label: 'Total de Registros', value: data.length },
            { label: 'Valor Total', value: totalValue },
            { label: 'Média R$/m²', value: avgValueM2 },
          ],
        });
        toast({
          title: "Exportação concluída",
          description: `${data.length} transações exportadas para Excel.`,
        });
      } else {
        toast({
          title: "Sem dados",
          description: "Não há transações para exportar.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const data = await fetchExportData();

      if (data && data.length > 0) {
        exportToCSV(data, `itbi_transacoes_${selectedBairro.toLowerCase().replace(/\s+/g, '_')}`);
        toast({
          title: "Exportação concluída",
          description: `${data.length} transações exportadas para CSV.`,
        });
      } else {
        toast({
          title: "Sem dados",
          description: "Não há transações para exportar.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupCompleto = async () => {
    setIsExporting(true);
    try {
      // Fetch ALL data from all neighborhoods
      const { data, error } = await supabase
        .from("itbi_transactions")
        .select("*")
        .order("bairro", { ascending: true })
        .order("data_transacao", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const totalTransacoes = data.reduce((sum, r) => sum + r.total_transacoes, 0);
        const bairrosUnicos = [...new Set(data.map(r => r.bairro))].length;
        
        exportToXLSX({
          filename: `backup_completo_itbi_${new Date().toISOString().split('T')[0]}`,
          title: 'Backup Completo - Base ITBI Prefeitura RJ',
          subtitle: `Godoy Prime Analytics - Exportado em ${new Date().toLocaleDateString('pt-BR')}`,
          filters: {
            'Total de Registros': data.length.toLocaleString('pt-BR'),
            'Total de Transações': totalTransacoes.toLocaleString('pt-BR'),
            'Bairros': bairrosUnicos.toLocaleString('pt-BR'),
            'Período': `${data[data.length - 1]?.data_transacao || 'N/A'} a ${data[0]?.data_transacao || 'N/A'}`,
          },
          data,
          columns: [
            { key: 'bairro', header: 'Bairro', width: 25, format: 'text' },
            { key: 'logradouro', header: 'Logradouro', width: 35, format: 'text' },
            { key: 'numero', header: 'Número', width: 10, format: 'text' },
            { key: 'complemento', header: 'Complemento', width: 15, format: 'text' },
            { key: 'tipologia', header: 'Tipologia', width: 15, format: 'text' },
            { key: 'uso', header: 'Uso', width: 12, format: 'text' },
            { key: 'data_transacao', header: 'Data', width: 12, format: 'date' },
            { key: 'valor_transacao', header: 'Valor Total', width: 18, format: 'currency' },
            { key: 'area_m2', header: 'Área (m²)', width: 12, format: 'number' },
            { key: 'valor_m2', header: 'R$/m²', width: 15, format: 'currency' },
            { key: 'total_transacoes', header: 'Qtd Trans.', width: 10, format: 'number' },
            { key: 'percentual_transferido', header: '% Transf.', width: 10, format: 'number' },
          ],
          summary: [
            { label: 'Total de Registros Agregados', value: data.length },
            { label: 'Total de Transações Reais', value: totalTransacoes },
            { label: 'Total de Bairros', value: bairrosUnicos },
          ],
        });
        toast({
          title: "Backup concluído",
          description: `${data.length.toLocaleString('pt-BR')} registros (${totalTransacoes.toLocaleString('pt-BR')} transações) exportados.`,
        });
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: "Erro no backup",
        description: "Não foi possível exportar o backup completo.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Exportação completa do Dashboard (PDF)
  const handleExportDashboardPDF = () => {
    setIsExporting(true);
    try {
      exportDashboardPDF({
        bairro: selectedBairro,
        kpis: kpiStats || null,
        ranking: (rankingData || []).map(r => ({
          microbairro: r.microbairro || '',
          preco_medio_m2: r.preco_medio_m2 || 0,
          total_transacoes: r.total_transacoes || 0,
        })),
        evolution: evolutionData || [],
        granularity: 'semester',
      });
      toast({
        title: "PDF gerado",
        description: "Relatório completo do Dashboard exportado em PDF.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Exportação completa do Dashboard (Excel)
  const handleExportDashboardXLSX = () => {
    setIsExporting(true);
    try {
      exportDashboardXLSX({
        bairro: selectedBairro,
        kpis: kpiStats || null,
        ranking: (rankingData || []).map(r => ({
          microbairro: r.microbairro || '',
          preco_medio_m2: r.preco_medio_m2 || 0,
          total_transacoes: r.total_transacoes || 0,
        })),
        evolution: evolutionData || [],
        granularity: 'semester',
      });
      toast({
        title: "Excel gerado",
        description: "Relatório completo do Dashboard exportado em Excel.",
      });
    } catch (error) {
      console.error('XLSX export error:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <GuidedTour run={runTour} onFinish={() => setRunTour(false)} />
      
      {/* Mobile Hero Section */}
      <div className="sm:hidden">
        <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-md p-2 border border-border/50">
          <h1 className="text-lg font-bold text-foreground mb-1">
            Inteligência Imobiliária
          </h1>
          <p className="text-xs text-muted-foreground mb-3">
            Análise de mercado baseada em dados reais de transações ITBI do Rio de Janeiro.
          </p>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-accent/10">
                <BarChart3 className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-[11px] text-foreground/80">Preços por região</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-accent/10">
                <Search className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-[11px] text-foreground/80">Busca por endereço</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-accent/10">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-[11px] text-foreground/80">Evolução histórica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-accent/10">
                <MapPin className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-[11px] text-foreground/80">Ranking microbairros</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            <BairroSelector value={selectedBairro} onChange={setSelectedBairro} />
            <div className="flex gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setRunTour(true)} 
                className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 min-w-[46px] bg-background/80"
              >
                <HelpCircle className="h-4 w-4 text-accent" />
                <span className="text-[10px] font-medium">Tour</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isExporting} 
                    className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 min-w-[46px] bg-background/80"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-accent" />
                    <span className="text-[10px] font-medium">Excel</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Relatório Completo</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExportDashboardPDF} className="gap-2">
                    <FileImage className="h-4 w-4" />
                    PDF (KPIs + Ranking)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportDashboardXLSX} className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Excel (Completo)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Transações</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleExportXLSX} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBackupCompleto} className="gap-2">
                    <Database className="h-4 w-4" />
                    Backup Completo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Inteligência de Mercado Imobiliário
          </p>
        </div>
        <div className="flex flex-row items-center gap-4">
          <BairroSelector value={selectedBairro} onChange={setSelectedBairro} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRunTour(true)}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Tour Guiado
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {isExporting ? "Exportando..." : "Exportar"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Relatório Completo</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportDashboardPDF} className="gap-2">
                  <FileImage className="h-4 w-4" />
                  PDF (KPIs + Ranking + Evolução)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDashboardXLSX} className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Excel (Completo)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Transações</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportXLSX} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                  <FileText className="h-4 w-4" />
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBackupCompleto} className="gap-2">
                  <Database className="h-4 w-4" />
                  Backup Completo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* KPIs Section */}
      <section id="kpis" className="step-kpis">
        <DashboardKPIs bairro={selectedBairro} />
      </section>

      {/* Charts Section - Desktop Only */}
      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section id="evolution" className="step-evolution">
          <EvolutionChart bairro={selectedBairro} />
        </section>
        <section id="ranking" className="step-ranking">
          <MicrobairroRanking bairro={selectedBairro} />
        </section>
      </div>

      {/* Mobile Charts Message */}
      <div className="sm:hidden">
        <Alert>
          <Monitor className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Para melhor experiência com gráficos e análises detalhadas, recomendamos usar um computador ou tablet.
          </AlertDescription>
        </Alert>
      </div>

      {/* Microbairro Evolution Chart - Desktop Only */}
      <div className="hidden sm:block">
        <MicrobairroEvolutionChart bairro={selectedBairro} />
      </div>

      {/* Search Tools Section */}
      <section id="search" className="step-search">
        <SearchTools bairro={selectedBairro} />
      </section>

      {/* Advanced Search Report - Desktop Only */}
      <div className="hidden sm:block">
        <AdvancedSearchReport />
      </div>

      {/* Legal Disclaimer - Desktop */}
      <div className="hidden sm:block">
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            <strong>Aviso Legal:</strong> Os dados apresentados são de natureza estatística, baseados em transações ITBI oficiais, 
            e não substituem laudos técnicos de avaliação (PTAM) conforme NBR 14653.
          </AlertDescription>
        </Alert>
      </div>

      {/* Mobile Tips */}
      <div className="sm:hidden space-y-2 mt-4">
        <p className="text-[11px] text-muted-foreground text-center">
          Deslize para ver mais opções • Clique nos cards para detalhes
        </p>
      </div>

      {/* Floating Test Button */}
      <Button
        onClick={() => generateTestChecklistPDF()}
        className="fixed bottom-6 right-6 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg z-50"
        size="sm"
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        Gerar Checklist PDF
      </Button>
    </div>
  );
}
