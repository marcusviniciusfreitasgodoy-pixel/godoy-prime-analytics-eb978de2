import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Ruler, Calculator } from "lucide-react";
import type { ValuationState } from "@/types/valuation";
import type { CombinedPrices } from "@/utils/valuationCalculations";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
  combined: CombinedPrices | null;
}

export function Step2BasicData({ state, updateState, combined }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Preços a usar (combinados se houver anúncios, senão ITBI)
  const prices = combined || {
    min_m2: state.itbiData?.min_m2 || 0,
    med_m2: state.itbiData?.med_m2 || 0,
    max_m2: state.itbiData?.max_m2 || 0,
  };

  // Calcula valor base
  const getSelectedPrice = () => {
    switch (state.baseSelected) {
      case "min":
        return prices.min_m2;
      case "max":
        return prices.max_m2;
      case "custom":
        return state.customBaseM2 || 0;
      default:
        return prices.med_m2;
    }
  };

  const baseValue = state.area_m2 * getSelectedPrice();

  return (
    <div className="space-y-6">
      {/* Área */}
      <div className="space-y-2">
        <Label htmlFor="area" className="flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Metragem Útil (m²)
        </Label>
        <Input
          id="area"
          type="number"
          min={1}
          max={10000}
          value={state.area_m2 || ""}
          onChange={(e) => updateState({ area_m2: Number(e.target.value) || 0 })}
          placeholder="Ex: 95"
          className="text-lg font-medium"
        />
        <p className="text-xs text-muted-foreground">
          Área útil do imóvel (apenas números)
        </p>
      </div>

      {/* Seleção de base */}
      <div className="space-y-3">
        <Label>Qual base de preço usar?</Label>
        <RadioGroup
          value={state.baseSelected}
          onValueChange={(value) => 
            updateState({ baseSelected: value as "min" | "med" | "max" | "custom" })
          }
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="min" id="min" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="min" className="cursor-pointer">
                <span className="font-medium text-red-600">Preço Mínimo</span>
                <span className="ml-2 text-muted-foreground">
                  {formatCurrency(prices.min_m2)}/m²
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Pessimista — imóvel pior da zona. Use se vender rápido é prioridade.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
            <RadioGroupItem value="med" id="med" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="med" className="cursor-pointer">
                <span className="font-medium text-primary">Preço Médio</span>
                <span className="ml-2 text-muted-foreground">
                  {formatCurrency(prices.med_m2)}/m²
                </span>
                <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  RECOMENDADO
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Provável — referência principal. Use na maioria dos casos.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="max" id="max" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="max" className="cursor-pointer">
                <span className="font-medium text-emerald-600">Preço Máximo</span>
                <span className="ml-2 text-muted-foreground">
                  {formatCurrency(prices.max_m2)}/m²
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Otimista — imóvel melhor da zona. Use se imóvel é realmente premium.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="custom" className="cursor-pointer">
                <span className="font-medium">Personalizado</span>
              </Label>
              {state.baseSelected === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm">R$</span>
                  <Input
                    type="number"
                    value={state.customBaseM2 || ""}
                    onChange={(e) => 
                      updateState({ customBaseM2: Number(e.target.value) || null })
                    }
                    placeholder="Ex: 15000"
                    className="w-32"
                  />
                  <span className="text-sm">/m²</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Se você tem outra referência de mercado
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Valor base calculado */}
      {state.area_m2 > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Preço Base Calculado
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(baseValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {state.area_m2} m² × {formatCurrency(getSelectedPrice())}/m²
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Este é seu valor NEUTRO — sem ajustes de características
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
