import { useState } from "react";
import { FileDown, Info, HelpCircle, Monitor, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { EvolutionChart } from "@/components/EvolutionChart";
import { MicrobairroRanking } from "@/components/MicrobairroRanking";
import { SearchTools } from "@/components/SearchTools";
import { AdvancedSearchReport } from "@/components/AdvancedSearchReport";
import { GuidedTour } from "@/components/GuidedTour";
import { BairroSelector } from "@/components/BairroSelector";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, exportToXLSX } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const [runTour, setRunTour] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBairro, setSelectedBairro] = useState("BARRA DA TIJUCA");
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <GuidedTour run={runTour} onFinish={() => setRunTour(false)} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Inteligência de Mercado Imobiliário
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <BairroSelector value={selectedBairro} onChange={setSelectedBairro} />
          <div className="flex gap-2">
            {/* Desktop: botões com texto */}
            <Button variant="outline" size="sm" onClick={() => setRunTour(true)} className="hidden sm:flex">
              <HelpCircle className="h-4 w-4 mr-2" />
              Tour Guiado
            </Button>
            
            {/* Mobile: botões maiores com labels */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setRunTour(true)} 
              className="sm:hidden flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[60px]"
            >
              <HelpCircle className="h-5 w-5 text-accent" />
              <span className="text-[10px] font-medium">Tour</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Desktop */}
                <Button variant="outline" size="sm" disabled={isExporting} className="hidden sm:flex">
                  <FileDown className="h-4 w-4 mr-2" />
                  {isExporting ? "Exportando..." : "Exportar"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportXLSX} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                  <FileText className="h-4 w-4" />
                  CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Mobile: botão de exportar com label */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isExporting} 
                  className="sm:hidden flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[60px]"
                >
                  <FileSpreadsheet className="h-5 w-5 text-accent" />
                  <span className="text-[10px] font-medium">Excel</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportXLSX} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                  <FileText className="h-4 w-4" />
                  CSV (.csv)
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
          baseadas em dados públicos de ITBI. As informações não substituem laudos oficiais 
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

      <div data-tour="search-tools">
        <SearchTools bairro={selectedBairro} />
      </div>

      <AdvancedSearchReport />

      {/* Avisos - visíveis apenas em mobile, no final da página */}
      <div className="sm:hidden space-y-3">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Disclaimer Jurídico:</strong> Esta ferramenta fornece análises estatísticas 
            baseadas em dados públicos de ITBI. As informações não substituem laudos oficiais 
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
    </div>
  );
}
