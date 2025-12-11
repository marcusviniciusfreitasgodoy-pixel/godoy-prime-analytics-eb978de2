import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, ClipboardCheck } from "lucide-react";
import { ValuationEngine } from "@/components/valuation/ValuationEngine";
import { Badge } from "@/components/ui/badge";

export default function AvaliacaoImobiliaria() {
  const location = useLocation();
  const locationState = location.state as { fromVistoria?: boolean; vistoriaData?: any } | null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start gap-2 sm:gap-3 flex-wrap">
        <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
            Avaliação Imobiliária
            {locationState?.fromVistoria && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                <ClipboardCheck className="h-3 w-3 mr-1" />
                Via Vistoria
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sistema de avaliação baseado em dados ITBI
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
            Motor de Avaliação Godoy Prime
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
          <ValuationEngine vistoriaData={locationState?.vistoriaData} />
        </CardContent>
      </Card>
    </div>
  );
}
