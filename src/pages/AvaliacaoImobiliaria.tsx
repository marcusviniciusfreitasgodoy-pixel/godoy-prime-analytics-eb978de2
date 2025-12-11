import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, ClipboardCheck } from "lucide-react";
import { ValuationEngine } from "@/components/valuation/ValuationEngine";
import { Badge } from "@/components/ui/badge";

export default function AvaliacaoImobiliaria() {
  const location = useLocation();
  const locationState = location.state as { fromVistoria?: boolean; vistoriaData?: any } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Avaliação Imobiliária
            {locationState?.fromVistoria && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <ClipboardCheck className="h-3 w-3 mr-1" />
                Via Vistoria
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Sistema de avaliação baseado em dados ITBI e características do imóvel
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Motor de Avaliação Godoy Prime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ValuationEngine vistoriaData={locationState?.vistoriaData} />
        </CardContent>
      </Card>
    </div>
  );
}
