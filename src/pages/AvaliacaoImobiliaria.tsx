import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import { ValuationEngine } from "@/components/valuation/ValuationEngine";

export default function AvaliacaoImobiliaria() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliação Imobiliária</h1>
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
          <ValuationEngine />
        </CardContent>
      </Card>
    </div>
  );
}
