import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, TrendingUp, TrendingDown, Minus, Search, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ValuationState } from "./ValuationEngine";
import type { CombinedPrices, ITBIData, AnuncioData } from "@/utils/valuationCalculations";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
  combined: CombinedPrices | null;
}

interface StreetSuggestion {
  logradouro: string;
  count: number;
  min_m2: number;
  med_m2: number;
  max_m2: number;
}

export function Step1Location({ state, updateState, combined }: Props) {
  const [searchTerm, setSearchTerm] = useState(state.logradouro);
  const [suggestions, setSuggestions] = useState<StreetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Buscar sugestões de ruas
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        // Normaliza o termo de busca
        const normalizedTerm = searchTerm
          .toUpperCase()
          .replace(/^(AVENIDA|AVN|AV|RUA|R)\s*/i, "")
          .trim();

        const { data, error } = await supabase
          .from("itbi_transactions")
          .select("logradouro, valor_m2")
          .eq("bairro", state.bairro)
          .eq("uso", "Residencial")
          .gte("percentual_transferido", 90)
          .not("valor_m2", "is", null)
          .ilike("logradouro", `%${normalizedTerm}%`)
          .limit(500);

        if (error) throw error;

        // Agrupa por logradouro e calcula estatísticas
        const grouped = data.reduce((acc, item) => {
          const key = item.logradouro;
          if (!acc[key]) {
            acc[key] = { values: [], count: 0 };
          }
          acc[key].values.push(Number(item.valor_m2));
          acc[key].count++;
          return acc;
        }, {} as Record<string, { values: number[]; count: number }>);

        // Calcula min, med, max para cada logradouro
        const results: StreetSuggestion[] = Object.entries(grouped)
          .filter(([_, data]) => data.count >= 3) // Mínimo 3 transações
          .map(([logradouro, data]) => {
            const sorted = data.values.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return {
              logradouro,
              count: data.count,
              min_m2: sorted[0],
              med_m2: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
              max_m2: sorted[sorted.length - 1],
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setSuggestions(results);
      } catch (error) {
        console.error("Erro ao buscar sugestões:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, state.bairro]);

  const handleSelectStreet = (suggestion: StreetSuggestion) => {
    const itbiData: ITBIData = {
      min_m2: Math.round(suggestion.min_m2),
      med_m2: Math.round(suggestion.med_m2),
      max_m2: Math.round(suggestion.max_m2),
      transaction_count: suggestion.count,
    };

    updateState({
      logradouro: suggestion.logradouro,
      itbiData,
    });
    setSearchTerm(suggestion.logradouro);
    setShowSuggestions(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const TrendIcon = combined?.trend_direction === "UP" 
    ? TrendingUp 
    : combined?.trend_direction === "DOWN" 
    ? TrendingDown 
    : Minus;

  const trendColor = combined?.trend_direction === "UP"
    ? "text-emerald-600"
    : combined?.trend_direction === "DOWN"
    ? "text-red-600"
    : "text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="space-y-2">
        <Label htmlFor="street-search" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Buscar Logradouro ou Condomínio
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="street-search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Digite o nome da rua, avenida ou condomínio..."
            className="pl-10"
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute z-50 w-full mt-1 shadow-lg">
              <CardContent className="p-0">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.logradouro}
                    onClick={() => handleSelectStreet(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 border-b last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{suggestion.logradouro}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.count} transações
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Mediana: {formatCurrency(suggestion.med_m2)}/m²
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {state.bairro} • Mínimo 3 transações para exibir
        </p>
      </div>

      {/* Selected location data */}
      {state.itbiData && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {state.logradouro}
              </h4>
              <Badge>{state.itbiData.transaction_count} transações</Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                <p className="font-semibold text-red-600">
                  {formatCurrency(state.itbiData.min_m2)}/m²
                </p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                <p className="text-xs text-muted-foreground mb-1">Mediana</p>
                <p className="font-bold text-primary">
                  {formatCurrency(state.itbiData.med_m2)}/m²
                </p>
                <p className="text-xs text-muted-foreground">RECOMENDADO</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Máximo</p>
                <p className="font-semibold text-emerald-600">
                  {formatCurrency(state.itbiData.max_m2)}/m²
                </p>
              </div>
            </div>

            {/* Anúncios (opcional) */}
            <div className="pt-4 border-t">
              <Label className="text-sm mb-2 block">
                Dados de Anúncios (opcional - 30% do cálculo)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Mín R$/m²</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 11000"
                    value={state.anuncioData?.min_m2 || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      updateState({
                        anuncioData: {
                          ...state.anuncioData,
                          min_m2: value,
                          med_m2: state.anuncioData?.med_m2 || 0,
                          max_m2: state.anuncioData?.max_m2 || 0,
                        },
                      });
                    }}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Méd R$/m²</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 14500"
                    value={state.anuncioData?.med_m2 || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      updateState({
                        anuncioData: {
                          ...state.anuncioData,
                          min_m2: state.anuncioData?.min_m2 || 0,
                          med_m2: value,
                          max_m2: state.anuncioData?.max_m2 || 0,
                        },
                      });
                    }}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Máx R$/m²</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 17500"
                    value={state.anuncioData?.max_m2 || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      updateState({
                        anuncioData: {
                          ...state.anuncioData,
                          min_m2: state.anuncioData?.min_m2 || 0,
                          med_m2: state.anuncioData?.med_m2 || 0,
                          max_m2: value,
                        },
                      });
                    }}
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Se preenchido, o sistema combinará 70% ITBI + 30% Anúncios
              </p>
            </div>

            {/* Trend indicator */}
            {combined && combined.trend_percentage !== 0 && (
              <div className={`flex items-center gap-2 p-3 rounded-lg bg-background ${trendColor}`}>
                <TrendIcon className="h-5 w-5" />
                <span className="font-medium">
                  TREND: {combined.trend_percentage > 0 ? "+" : ""}
                  {combined.trend_percentage.toFixed(1)}%
                </span>
                <span className="text-sm">
                  (Mercado em {combined.trend_direction === "UP" ? "ALTA" : combined.trend_direction === "DOWN" ? "BAIXA" : "ESTÁVEL"})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
