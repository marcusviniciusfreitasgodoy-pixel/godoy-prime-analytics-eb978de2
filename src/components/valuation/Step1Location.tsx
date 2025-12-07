import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, TrendingDown, Minus, Search, Building2, Plus, X, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ValuationState } from "@/types/valuation";
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

interface AnuncioEntry {
  id: string;
  valor_total: number;
  area_m2: number;
}

export function Step1Location({ state, updateState, combined }: Props) {
  const [searchTerm, setSearchTerm] = useState(state.logradouro);
  const [suggestions, setSuggestions] = useState<StreetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Estado para anúncios de referência
  const [anuncios, setAnuncios] = useState<AnuncioEntry[]>([
    { id: "1", valor_total: 0, area_m2: 0 }
  ]);

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

        // Constante para filtro de outliers
        const OUTLIER_MAX_M2 = 40000;

        const { data, error } = await supabase
          .from("itbi_transactions")
          .select("logradouro, valor_m2")
          .eq("bairro", state.bairro)
          .eq("uso", "Residencial")
          .gte("percentual_transferido", 90)
          .not("valor_m2", "is", null)
          .lte("valor_m2", OUTLIER_MAX_M2) // Filtro de outliers
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

  // Calcula R$/m² dos anúncios quando mudam
  useEffect(() => {
    const validAnuncios = anuncios.filter(a => a.valor_total > 0 && a.area_m2 > 0);
    
    if (validAnuncios.length === 0) {
      updateState({ anuncioData: null });
      return;
    }

    // Calcula R$/m² para cada anúncio
    const valoresM2 = validAnuncios.map(a => a.valor_total / a.area_m2).sort((a, b) => a - b);
    
    const min_m2 = valoresM2[0];
    const max_m2 = valoresM2[valoresM2.length - 1];
    const mid = Math.floor(valoresM2.length / 2);
    const med_m2 = valoresM2.length % 2 ? valoresM2[mid] : (valoresM2[mid - 1] + valoresM2[mid]) / 2;

    updateState({
      anuncioData: {
        min_m2: Math.round(min_m2),
        med_m2: Math.round(med_m2),
        max_m2: Math.round(max_m2),
      }
    });
  }, [anuncios]);

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

  const addAnuncio = () => {
    if (anuncios.length < 5) {
      setAnuncios([...anuncios, { id: Date.now().toString(), valor_total: 0, area_m2: 0 }]);
    }
  };

  const removeAnuncio = (id: string) => {
    if (anuncios.length > 1) {
      setAnuncios(anuncios.filter(a => a.id !== id));
    }
  };

  const updateAnuncio = (id: string, field: 'valor_total' | 'area_m2', value: number) => {
    setAnuncios(anuncios.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
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

  // Calcula R$/m² para cada anúncio (para exibição)
  const getAnuncioM2 = (anuncio: AnuncioEntry) => {
    if (anuncio.valor_total > 0 && anuncio.area_m2 > 0) {
      return anuncio.valor_total / anuncio.area_m2;
    }
    return null;
  };

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

            {/* Anúncios de Referência */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm">
                  Anúncios de Referência (opcional - 30% do cálculo)
                </Label>
                {anuncios.length < 5 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addAnuncio}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mb-3">
                Informe imóveis similares anunciados para comparar com dados ITBI
              </p>

              <div className="space-y-3">
                {anuncios.map((anuncio, index) => {
                  const m2Calculado = getAnuncioM2(anuncio);
                  return (
                    <div key={anuncio.id} className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                      <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                      
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1 block">Valor Anunciado</Label>
                          <CurrencyInput
                            placeholder="R$ 1.500.000"
                            value={anuncio.valor_total?.toString() || ""}
                            onChange={(value) => updateAnuncio(anuncio.id, 'valor_total', Number(value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Área (m²)</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={anuncio.area_m2 || ""}
                            onChange={(e) => updateAnuncio(anuncio.id, 'area_m2', Number(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* R$/m² calculado */}
                      {m2Calculado && (
                        <div className="text-center px-2 min-w-[80px]">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calculator className="h-3 w-3" />
                            <span>R$/m²</span>
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(m2Calculado)}
                          </p>
                        </div>
                      )}

                      {anuncios.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeAnuncio(anuncio.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resumo dos anúncios calculados */}
              {state.anuncioData && state.anuncioData.med_m2 > 0 && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                    📊 Valores calculados dos anúncios:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Mín</p>
                      <p className="text-sm font-semibold">{formatCurrency(state.anuncioData.min_m2)}/m²</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Méd</p>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(state.anuncioData.med_m2)}/m²</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Máx</p>
                      <p className="text-sm font-semibold">{formatCurrency(state.anuncioData.max_m2)}/m²</p>
                    </div>
                  </div>
                </div>
              )}

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
