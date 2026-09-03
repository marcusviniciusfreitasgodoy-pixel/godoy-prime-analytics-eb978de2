import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { SimpleRadioGroup, SimpleRadioItem } from "@/components/ui/simple-radio";
import { Card, CardContent } from "@/components/ui/card";
import { Ruler, Calculator, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ValuationState } from "@/types/valuation";
import type { CombinedPrices } from "@/utils/valuationCalculations";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
  combined: CombinedPrices | null;
  /** Volta para a etapa de Localização, onde fica o seletor de período da amostra. */
  onEditarPeriodo?: () => void;
}

export function Step2BasicData({ state, updateState, combined, onEditarPeriodo }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Preços a usar (combinados se houver anúncios, senão dados oficiais)
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
    <div className="space-y-4 sm:space-y-6">
      {/* Área */}
      <div className="space-y-2">
        <Label htmlFor="area" className="flex items-center gap-2 text-xs sm:text-sm">
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
          className="text-base sm:text-lg font-medium h-11 sm:h-10"
        />
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Área útil do imóvel (apenas números)
        </p>
      </div>

      {/* Janela da amostra usada nos preços abaixo (o seletor fica na etapa Localização) */}
      {state.itbiData?.meta && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Amostra: últimos{" "}
            <span className="font-medium text-foreground">
              {state.itbiData.meta.janela_meses ?? state.janelaMeses ?? 12} meses
            </span>{" "}
            · {state.itbiData.meta.escrituras_validas} escrituras ·{" "}
            {state.itbiData.meta.linhas_agregadas} registros ITBI
          </p>
          {onEditarPeriodo && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] sm:text-xs" onClick={onEditarPeriodo}>
              <CalendarRange className="mr-1 h-3.5 w-3.5" />
              Alterar período
            </Button>
          )}
        </div>
      )}

      {/* Seleção de base */}
      <div className="space-y-2 sm:space-y-3">
        <Label className="text-xs sm:text-sm">Qual base de preço usar?</Label>
        <SimpleRadioGroup
          value={state.baseSelected}
          onValueChange={(value) => 
            updateState({ baseSelected: value as "min" | "med" | "max" | "custom" })
          }
          className="space-y-2 sm:space-y-3"
        >
          <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <SimpleRadioItem value="min" id="min" className="mt-0.5 sm:mt-1 h-5 w-5 sm:h-4 sm:w-4" />
            <div className="flex-1 min-w-0">
              <Label htmlFor="min" className="cursor-pointer text-xs sm:text-sm">
                <span className="font-medium text-red-600">Preço Mínimo (P10)</span>
                <span className="ml-1 sm:ml-2 text-muted-foreground text-xs sm:text-sm">
                  {formatCurrency(prices.min_m2)}/m²
                </span>
              </Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Pessimista — venda rápida
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
            <SimpleRadioItem value="med" id="med" className="mt-0.5 sm:mt-1 h-5 w-5 sm:h-4 sm:w-4" />
            <div className="flex-1 min-w-0">
              <Label htmlFor="med" className="cursor-pointer text-xs sm:text-sm flex flex-wrap items-center gap-1">
                <span className="font-medium text-primary">Mediana</span>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {formatCurrency(prices.med_m2)}/m²
                </span>
                <span className="text-[10px] sm:text-xs bg-primary/20 text-primary px-1.5 sm:px-2 py-0.5 rounded">
                  RECOMENDADO
                </span>
              </Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Provável — referência principal
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <SimpleRadioItem value="max" id="max" className="mt-0.5 sm:mt-1 h-5 w-5 sm:h-4 sm:w-4" />
            <div className="flex-1 min-w-0">
              <Label htmlFor="max" className="cursor-pointer text-xs sm:text-sm">
                <span className="font-medium text-emerald-600">Preço Máximo (P95)</span>
                <span className="ml-1 sm:ml-2 text-muted-foreground text-xs sm:text-sm">
                  {formatCurrency(prices.max_m2)}/m²
                </span>
              </Label>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Otimista — imóvel premium
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <SimpleRadioItem value="custom" id="custom" className="mt-0.5 sm:mt-1 h-5 w-5 sm:h-4 sm:w-4" />
            <div className="flex-1 min-w-0">
              <Label htmlFor="custom" className="cursor-pointer text-xs sm:text-sm">
                <span className="font-medium">Personalizado</span>
              </Label>
              {state.baseSelected === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <CurrencyInput
                    value={state.customBaseM2?.toString() || ""}
                    onChange={(value) => 
                      updateState({ customBaseM2: value ? Number(value) : null })
                    }
                    placeholder="R$ 15.000"
                    className="w-32 sm:w-40 h-9 sm:h-8"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">/m²</span>
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Outra referência de mercado
              </p>
            </div>
          </div>
        </SimpleRadioGroup>
      </div>

      {/* Valor base calculado */}
      {state.area_m2 > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Preço Base Calculado
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {formatCurrency(baseValue)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {state.area_m2} m² × {formatCurrency(getSelectedPrice())}/m²
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  Valor NEUTRO — sem ajustes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
