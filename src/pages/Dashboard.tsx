import { FileDown, Info, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardKPIs } from "@/components/DashboardKPIs";
import { EvolutionChart } from "@/components/EvolutionChart";
import { MicrobairroRanking } from "@/components/MicrobairroRanking";
import { SearchTools } from "@/components/SearchTools";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Inteligência de Mercado Imobiliário - Barra da Tijuca
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Tour Guiado
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Disclaimer Jurídico:</strong> Esta ferramenta fornece análises estatísticas 
          baseadas em dados públicos de ITBI. As informações não substituem laudos oficiais 
          (PTAM) e devem ser utilizadas apenas como referência de mercado.
        </AlertDescription>
      </Alert>

      <DashboardKPIs />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvolutionChart />
        <MicrobairroRanking />
      </div>

      <SearchTools />
    </div>
  );
}
