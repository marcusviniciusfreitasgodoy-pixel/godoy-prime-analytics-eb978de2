import { useState, useEffect } from "react";
import {
  FileDown,
  Info,
  HelpCircle,
  Monitor,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Search,
  TrendingUp,
  MapPin,
  Database,
  FileImage,
  Video,
  ClipboardCheck,
  Rocket,
  Map,
} from "lucide-react";
import { MarketAssistant } from "@/components/MarketAssistant";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { EvolutionChart } from "@/components/EvolutionChart";
import { MicrobairroEvolutionChart } from "@/components/MicrobairroEvolutionChart";
import { MicrobairroRanking } from "@/components/MicrobairroRanking";
import { GuidedTour } from "@/components/GuidedTour";
import { BairroSelector } from "@/components/BairroSelector";
import { useBairro } from "@/contexts/BairroContext";
import { TransactionMap } from "@/components/maps/TransactionMap";
import { useTransactionMapData } from "@/hooks/useTransactionMapData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { exportDashboardPDF, exportDashboardXLSX } from "@/utils/dashboardExport";
import { exportVideoScriptPdf } from "@/utils/videoScriptPdfExport";
import { exportManualPDF } from "@/utils/manualPdfExport";
import { generateTestChecklistPDF } from "@/utils/testChecklistPdf";
import { exportQuickGuidePDF } from "@/utils/quickGuidePdfExport";
import { useKPIStats } from "@/hooks/useKPIStats";
import { useMicrobairroRanking } from "@/hooks/useITBITransactions";
import { useEvolutionData } from "@/hooks/useEvolutionData";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useFirstVisitTour } from "@/hooks/useFirstVisitTour";

export default function Dashboard() {
  const { shouldRunTour, startTour, endTour } = useFirstVisitTour('dashboard');
  const [isExporting, setIsExporting] = useState(false);
  const { selectedBairro, setSelectedBairro } = useBairro();
  const { toast } = useToast();
  const { trackExport } = useActivityTracking();

  // Hooks para dados do dashboard (usados na exportação completa)
  const { data: kpiStats } = useKPIStats(selectedBairro);
  const { data: rankingData } = useMicrobairroRanking(selectedBairro);
  const { data: evolutionData } = useEvolutionData(selectedBairro, 'semester');
  
  // Hook para dados do mapa
  const { data: mapData, isLoading: isMapLoading } = useTransactionMapData({
    bairro: selectedBairro,
    periodoMeses: 12,
  });

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
          filename: `transacoes_oficiais_${selectedBairro.toLowerCase().replace(/\s+/g, '_')}`,
          title: `Transações Oficiais - ${selectedBairro}`,
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
        trackExport('dashboard_xlsx');
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
        exportToCSV(data, `transacoes_oficiais_${selectedBairro.toLowerCase().replace(/\s+/g, '_')}`);
        trackExport('dashboard_csv');
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
          filename: `backup_completo_transacoes_${new Date().toISOString().split('T')[0]}`,
          title: 'Backup Completo - Base Oficial Prefeitura RJ',
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
      <GuidedTour run={shouldRunTour} onFinish={endTour} />
      
      {/* Mobile Hero Section */}
      <div className="sm:hidden">
        <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-md p-2 border border-border/50">
          <h1 className="text-lg font-bold text-foreground mb-1">
            Inteligência Imobiliária
          </h1>
          <p className="text-xs text-muted-foreground mb-3">
            Análise de mercado baseada em dados reais de transações oficiais do Rio de Janeiro.
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
                onClick={startTour} 
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
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Material de Apoio</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportQuickGuidePDF()} className="gap-2">
                    <Rocket className="h-4 w-4" />
                    Guia Rápido (1 página)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportVideoScriptPdf()} className="gap-2">
                    <Video className="h-4 w-4" />
                    Roteiro de Vídeo + FAQ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportManualPDF()} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Manual Completo (com FAQ)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generateTestChecklistPDF()} className="gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Checklist de Testes (PDF)
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
            <Button variant="outline" size="sm" onClick={startTour}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Tour Guiado
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting} data-tour="export-button">
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
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Material de Apoio</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportQuickGuidePDF()} className="gap-2">
                  <Rocket className="h-4 w-4" />
                  Guia Rápido (1 página)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportVideoScriptPdf()} className="gap-2">
                  <Video className="h-4 w-4" />
                  Roteiro de Vídeo + FAQ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportManualPDF()} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Manual Completo (com FAQ)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => generateTestChecklistPDF()} className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Checklist de Testes (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Avisos - visíveis apenas em desktop */}
      <Alert className="hidden sm:flex">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">
          <strong>Disclaimer Jurídico:</strong> Esta ferramenta fornece análises estatísticas 
          baseadas em dados públicos de transações oficiais. As informações não substituem laudos oficiais 
          (PTAM) e devem ser utilizadas apenas como referência de mercado.
        </AlertDescription>
      </Alert>

      <div data-tour="kpis">
        <DashboardKPIs bairro={selectedBairro} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div data-tour="evolution-chart">
          <EvolutionChart bairro={selectedBairro} />
        </div>
        <div data-tour="microbairro-ranking">
          <MicrobairroRanking bairro={selectedBairro} />
        </div>
      </div>

      <div data-tour="microbairro-chart">
        <MicrobairroEvolutionChart bairro={selectedBairro} />
      </div>

      {/* Mapa de Transações */}
      <Card data-tour="transaction-map">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Map className="h-5 w-5 text-primary" />
            Mapa de Transações
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualização geográfica das transações nos últimos 12 meses
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[400px] lg:h-[500px]">
            <TransactionMap 
              data={mapData || []} 
              bairro={selectedBairro} 
              isLoading={isMapLoading} 
            />
          </div>
        </CardContent>
      </Card>


      {/* Avisos - visíveis apenas em mobile, no final da página */}
      <div className="sm:hidden space-y-3">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Disclaimer Jurídico:</strong> Esta ferramenta fornece análises estatísticas 
            baseadas em dados públicos de transações oficiais. As informações não substituem laudos oficiais 
            (PTAM) e devem ser utilizadas apenas como referência de mercado.
          </AlertDescription>
        </Alert>
        <Alert className="bg-muted/50 border-muted">
          <Monitor className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Dica:</strong> Para melhor experiência com gráficos e análises detalhadas, 
            recomendamos usar um computador ou tablet.
          </AlertDescription>
        </Alert>
      </div>

      {/* Assistente de Mercado IA */}
      <div data-tour="sofia-assistant">
        <MarketAssistant />
      </div>
    </div>
  );
}
