import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, DollarSign, Percent, CheckCircle2 } from "lucide-react";
import { formatCurrencyBRL, formatPercentage } from "@/utils/pricingCalculations";
import { StrategyType, StrategyCalculation } from "@/types/pricingStrategy";

// Suporta ambos os formatos: snake_case (do DB) e camelCase (do Step5Recommendation)
interface PricingStrategyData {
  // snake_case format (from DB/HistoricoVistorias)
  estrategia_recomendada?: StrategyType;
  estrategia_selecionada?: StrategyType | null;
  valor_itbi?: number;
  // camelCase format (from Step5Recommendation)
  estrategiaRecomendada?: StrategyType;
  estrategiaSelecionada?: StrategyType | null;
  valorItbi?: number;
  // calculos object (works with both formats)
  calculos?: {
    atracao: StrategyCalculation;
    mercado: StrategyCalculation;
    premium: StrategyCalculation;
  } | null;
  // Flat structure fallback (from DB)
  p_atracao?: number;
  p_mercado?: number;
  p_premium?: number;
  preco_anuncio_atracao?: number;
  preco_anuncio_mercado?: number;
  preco_anuncio_premium?: number;
  liquido_atracao?: number;
  liquido_mercado?: number;
  liquido_premium?: number;
  corretagem_atracao?: number;
  corretagem_mercado?: number;
  corretagem_premium?: number;
}

interface PricingStrategyPreviewProps {
  pricingStrategy: PricingStrategyData | null;
}

const strategyConfig: Record<StrategyType, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  atracao: { 
    label: 'Atração', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    icon: <Target className="h-4 w-4" />
  },
  mercado: { 
    label: 'Mercado', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    icon: <TrendingUp className="h-4 w-4" />
  },
  premium: { 
    label: 'Premium', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    icon: <DollarSign className="h-4 w-4" />
  },
};

export function PricingStrategyPreview({ pricingStrategy }: PricingStrategyPreviewProps) {
  if (!pricingStrategy) return null;

  // Normalize data - support both snake_case and camelCase
  const estrategiaRecomendada = pricingStrategy.estrategia_recomendada || pricingStrategy.estrategiaRecomendada;
  const estrategiaSelecionada = pricingStrategy.estrategia_selecionada ?? pricingStrategy.estrategiaSelecionada;
  const valorItbi = pricingStrategy.valor_itbi || pricingStrategy.valorItbi || 0;

  // If no strategy data, don't render
  if (!estrategiaRecomendada) return null;

  const selectedStrategy = estrategiaSelecionada || estrategiaRecomendada;
  const config = strategyConfig[selectedStrategy];

  // Extract values - support both calculos object and flat structure
  const getStrategyValues = (strategy: StrategyType) => {
    if (pricingStrategy.calculos) {
      const calc = pricingStrategy.calculos[strategy];
      return {
        percentual: calc.percentual,
        precoAnuncio: calc.preco_anuncio,
        liquido: calc.liquido,
        corretagem: calc.corretagem,
      };
    }
    
    // Fallback to flat structure (from DB)
    const pKey = `p_${strategy}` as keyof PricingStrategyData;
    const precoKey = `preco_anuncio_${strategy}` as keyof PricingStrategyData;
    const liquidoKey = `liquido_${strategy}` as keyof PricingStrategyData;
    const corretagemKey = `corretagem_${strategy}` as keyof PricingStrategyData;
    
    return {
      percentual: (pricingStrategy[pKey] as number) || 0,
      precoAnuncio: (pricingStrategy[precoKey] as number) || 0,
      liquido: (pricingStrategy[liquidoKey] as number) || 0,
      corretagem: (pricingStrategy[corretagemKey] as number) || 0,
    };
  };

  const selectedValues = getStrategyValues(selectedStrategy);
  const isSelected = estrategiaSelecionada !== null && estrategiaSelecionada !== undefined;

  return (
    <Card className={`${config.bgColor} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className={`h-4 w-4 ${config.color}`} />
            <span>Estratégia de Precificação</span>
          </div>
          <Badge 
            variant="outline" 
            className={`${config.color} border-current flex items-center gap-1`}
          >
            {config.icon}
            {config.label}
            {isSelected && <CheckCircle2 className="h-3 w-3 ml-1" />}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Valor ITBI de referência */}
        <div className="text-center p-2 bg-background/80 rounded">
          <p className="text-xs text-muted-foreground">Valor ITBI (Base)</p>
          <p className="font-semibold text-sm">{formatCurrencyBRL(valorItbi)}</p>
        </div>

        {/* Cards das 3 estratégias */}
        <div className="grid grid-cols-3 gap-2">
          {(['atracao', 'mercado', 'premium'] as StrategyType[]).map((strategy) => {
            const values = getStrategyValues(strategy);
            const sConfig = strategyConfig[strategy];
            const isActive = selectedStrategy === strategy;
            
            return (
              <div 
                key={strategy}
                className={`p-2 rounded text-center transition-all ${
                  isActive 
                    ? 'bg-background border-2 border-primary shadow-sm' 
                    : 'bg-background/60 border border-transparent opacity-70'
                }`}
              >
                <p className={`text-[10px] font-medium ${isActive ? sConfig.color : 'text-muted-foreground'}`}>
                  {sConfig.label.toUpperCase()}
                </p>
                <p className={`text-[10px] ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {formatPercentage(values.percentual, true)}
                </p>
                <p className={`font-bold text-xs ${isActive ? sConfig.color : 'text-muted-foreground'}`}>
                  {formatCurrencyBRL(values.precoAnuncio)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detalhes da estratégia selecionada */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 bg-background/80 rounded text-center">
            <p className="text-[10px] text-muted-foreground">Preço Anúncio</p>
            <p className={`font-bold ${config.color}`}>{formatCurrencyBRL(selectedValues.precoAnuncio)}</p>
          </div>
          <div className="p-2 bg-background/80 rounded text-center">
            <p className="text-[10px] text-muted-foreground">Líquido Estimado</p>
            <p className="font-bold text-emerald-600">{formatCurrencyBRL(selectedValues.liquido)}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          ✅ Estratégia {isSelected ? 'confirmada' : 'recomendada'} será incluída no relatório
        </p>
      </CardContent>
    </Card>
  );
}
