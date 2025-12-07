import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, MapPin, Maximize2, Home, Calculator, ArrowRight, AlertCircle } from "lucide-react";

interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
  itbiData: {
    min_m2: number;
    med_m2: number;
    max_m2: number;
    transaction_count: number;
  } | null;
  estimativa: {
    min: number;
    med: number;
    max: number;
  } | null;
}

interface QuickValuationResultProps {
  data: QuickValuationData;
  onProceedToComplete: () => void;
  onNewValuation: () => void;
}

export function QuickValuationResult({ 
  data, 
  onProceedToComplete, 
  onNewValuation 
}: QuickValuationResultProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasData = data.itbiData && data.estimativa;

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
          <Calculator className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Resultado da Avaliação</CardTitle>
        <CardDescription>
          Estimativa baseada em transações reais do mercado
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Property Summary */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {data.bairro}
          </Badge>
          {data.logradouro && (
            <Badge variant="outline" className="flex items-center gap-1">
              {data.logradouro}
            </Badge>
          )}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Maximize2 className="h-3 w-3" />
            {data.area_m2} m²
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            {data.tipologia}
          </Badge>
        </div>

        <Separator />

        {hasData ? (
          <>
            {/* Value Estimation */}
            <div className="space-y-4">
              <h3 className="text-center font-medium text-muted-foreground">
                Faixa de Valor Estimada
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <TrendingDown className="h-5 w-5 mx-auto mb-2 text-yellow-600" />
                  <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                  <p className="font-bold text-lg">{formatCurrency(data.estimativa!.min)}</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Calculator className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="text-xs text-muted-foreground mb-1">Médio</p>
                  <p className="font-bold text-xl text-primary">{formatCurrency(data.estimativa!.med)}</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-600" />
                  <p className="text-xs text-muted-foreground mb-1">Máximo</p>
                  <p className="font-bold text-lg">{formatCurrency(data.estimativa!.max)}</p>
                </div>
              </div>

              {/* Market Reference */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium">Referência de Mercado (R$/m²)</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Mín</p>
                    <p className="font-medium">{formatCurrency(data.itbiData!.min_m2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Méd</p>
                    <p className="font-medium">{formatCurrency(data.itbiData!.med_m2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Máx</p>
                    <p className="font-medium">{formatCurrency(data.itbiData!.max_m2)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Baseado em {data.itbiData!.transaction_count} transações dos últimos 12 meses
                </p>
              </div>
            </div>

            <Separator />

            {/* CTA for Complete Valuation */}
            <div className="space-y-3">
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <h4 className="font-medium text-center mb-2">
                  Deseja uma avaliação mais precisa?
                </h4>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Nossa ferramenta completa analisa 26 características do imóvel para uma estimativa mais detalhada com recomendações personalizadas.
                </p>
                <Button onClick={onProceedToComplete} className="w-full" size="lg">
                  Fazer Avaliação Completa
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              
              <Button variant="outline" onClick={onNewValuation} className="w-full">
                Nova Avaliação Rápida
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Dados Insuficientes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não encontramos transações suficientes para esta localização específica. 
                Tente expandir a busca removendo o endereço ou alterando o bairro.
              </p>
            </div>
            <Button onClick={onNewValuation} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
