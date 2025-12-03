import { useState } from "react";
import { FileDown, Info, HelpCircle, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { EvolutionChart } from "@/components/EvolutionChart";
import { MicrobairroRanking } from "@/components/MicrobairroRanking";
import { SearchTools } from "@/components/SearchTools";
import { GuidedTour } from "@/components/GuidedTour";
import { BairroSelector } from "@/components/BairroSelector";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [runTour, setRunTour] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBairro, setSelectedBairro] = useState("BARRA DA TIJUCA");
  const { toast } = useToast();

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("itbi_transactions")
        .select("*")
        .order("data_transacao", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        exportToCSV(data, "itbi_transacoes_barra");
        toast({
          title: "Exportação concluída",
          description: `${data.length} transações exportadas com sucesso.`,
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
            <Button variant="outline" size="sm" onClick={() => setRunTour(true)} className="hidden sm:flex">
              <HelpCircle className="h-4 w-4 mr-2" />
              Tour Guiado
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRunTour(true)} className="sm:hidden">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <FileDown className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isExporting ? "Exportando..." : "Exportar CSV"}</span>
            </Button>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">
          <strong>Disclaimer Jurídico:</strong> Esta ferramenta fornece análises estatísticas 
          baseadas em dados públicos de ITBI. As informações não substituem laudos oficiais 
          (PTAM) e devem ser utilizadas apenas como referência de mercado.
        </AlertDescription>
      </Alert>

      {/* Aviso mobile */}
      <Alert className="sm:hidden bg-muted/50 border-muted">
        <Monitor className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Dica:</strong> Para melhor experiência com gráficos e análises detalhadas, 
          recomendamos usar um computador ou tablet.
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
    </div>
  );
}
