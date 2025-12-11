import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, TrendingDown, Minus, Search, Building2, Plus, X, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStreetSearchTerm } from "@/lib/utils";
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
  // Usa logradouro do Step 0 se disponível, senão permite busca
  const [searchTerm, setSearchTerm] = useState(state.logradouro || "");
  const [suggestions, setSuggestions] = useState<StreetSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useCustomSearch, setUseCustomSearch] = useState(!state.logradouro);
  
  // Estado para anúncios de referência
  const [anuncios, setAnuncios] = useState<AnuncioEntry[]>([
    { id: "1", valor_total: 0, area_m2: 0 }
  ]);

  // Sincroniza searchTerm quando logradouro muda
  useEffect(() => {
    if (state.logradouro && !useCustomSearch) {
      setSearchTerm(state.logradouro);
    }
  }, [state.logradouro, useCustomSearch]);

  // Buscar sugestões de ruas
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        // Normaliza o termo de busca (remove acentos, prefixos e aplica correções)
        const normalizedTerm = normalizeStreetSearchTerm(searchTerm);

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
    <div className="space-y-4 sm:space-y-6">
      {/* Info quando logradouro veio do Step 0 */}
      {state.logradouro && !useCustomSearch && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3">
          <p className="text-xs sm:text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Buscando dados para: <strong className="break-words">{state.logradouro}</strong></span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Endereço informado na identificação
          </p>
        </div>
      )}

      {/* Search input */}
      <div className="space-y-2">
        <Label htmlFor="street-search" className="flex items-center gap-2 text-xs sm:text-sm">
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
              setUseCustomSearch(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Digite o nome da rua..."
            className="pl-10 h-10 sm:h-9"
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-[60vh] overflow-y-auto">
              <CardContent className="p-0">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.logradouro}
                    onClick={() => handleSelectStreet(suggestion)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-muted/50 border-b last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-xs sm:text-sm truncate">{suggestion.logradouro}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                        {suggestion.count}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                      Mediana: {formatCurrency(suggestion.med_m2)}/m²
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {state.bairro} • Mínimo 3 transações
        </p>
      </div>

      {/* Selected location data */}
      {state.itbiData && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
              <h4 className="font-semibold flex items-center gap-2 text-sm min-w-0">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{state.logradouro}</span>
              </h4>
              <Badge className="text-[10px] sm:text-xs shrink-0">{state.itbiData.transaction_count} transações</Badge>
            </div>

            {/* Grid de preços - responsivo */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
              <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Mín</p>
                <p className="font-semibold text-red-600 text-xs sm:text-sm">
                  {formatCurrency(state.itbiData.min_m2)}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">/m²</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Méd</p>
                <p className="font-bold text-primary text-xs sm:text-base">
                  {formatCurrency(state.itbiData.med_m2)}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">RECOMENDADO</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Máx</p>
                <p className="font-semibold text-emerald-600 text-xs sm:text-sm">
                  {formatCurrency(state.itbiData.max_m2)}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">/m²</p>
              </div>
            </div>

            {/* Anúncios de Referência */}
            <div className="pt-3 sm:pt-4 border-t">
              <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                <Label className="text-xs sm:text-sm">
                  Anúncios de Referência <span className="hidden sm:inline">(opcional - 30%)</span>
                </Label>
                {anuncios.length < 5 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addAnuncio}
                    className="h-8 sm:h-7 text-xs px-2 sm:px-3"
                  >
                    <Plus className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                )}
              </div>
              
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                Informe imóveis similares anunciados
              </p>

              <div className="space-y-2 sm:space-y-3">
                {anuncios.map((anuncio, index) => {
                  const m2Calculado = getAnuncioM2(anuncio);
                  return (
                    <div key={anuncio.id} className="p-2 sm:p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">#{index + 1}</span>
                        {m2Calculado && (
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary ml-auto">
                            <Calculator className="h-3 w-3" />
                            <span className="font-semibold">{formatCurrency(m2Calculado)}/m²</span>
                          </div>
                        )}
                        {anuncios.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive ml-auto sm:ml-0"
                            onClick={() => removeAnuncio(anuncio.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] sm:text-xs mb-1 block">Valor</Label>
                          <CurrencyInput
                            placeholder="R$ 1.500.000"
                            value={anuncio.valor_total?.toString() || ""}
                            onChange={(value) => updateAnuncio(anuncio.id, 'valor_total', Number(value) || 0)}
                            className="h-9 sm:h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] sm:text-xs mb-1 block">Área (m²)</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={anuncio.area_m2 || ""}
                            onChange={(e) => updateAnuncio(anuncio.id, 'area_m2', Number(e.target.value) || 0)}
                            className="h-9 sm:h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo dos anúncios calculados */}
              {state.anuncioData && state.anuncioData.med_m2 > 0 && (
                <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] sm:text-xs font-medium text-amber-800 dark:text-amber-200 mb-1.5 sm:mb-2">
                    📊 Valores calculados:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Mín</p>
                      <p className="text-xs sm:text-sm font-semibold">{formatCurrency(state.anuncioData.min_m2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Méd</p>
                      <p className="text-xs sm:text-sm font-semibold text-primary">{formatCurrency(state.anuncioData.med_m2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Máx</p>
                      <p className="text-xs sm:text-sm font-semibold">{formatCurrency(state.anuncioData.max_m2)}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                70% ITBI + 30% Anúncios
              </p>
            </div>

            {/* Trend indicator */}
            {combined && combined.trend_percentage !== 0 && (
              <div className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-background ${trendColor}`}>
                <TrendIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium text-xs sm:text-sm">
                    TREND: {combined.trend_percentage > 0 ? "+" : ""}
                    {combined.trend_percentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] sm:text-sm ml-1 sm:ml-2">
                    ({combined.trend_direction === "UP" ? "ALTA" : combined.trend_direction === "DOWN" ? "BAIXA" : "ESTÁVEL"})
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
