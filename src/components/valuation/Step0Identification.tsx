import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar, MapPin, Home, TrendingUp, TrendingDown, Minus, Search, Loader2 } from "lucide-react";
import type { ValuationState } from "@/types/valuation";
import { isCasaType, calculateTerrainBonus } from "@/hooks/useValuationCharacteristics";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStreetSearchTerm, normalizeAccents } from "@/lib/utils";
import { BairroSelector } from "@/components/BairroSelector";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
}

interface StreetSuggestion {
  logradouro: string;
  transactionCount: number;
  nomeCondominio?: string;
}

const TIPOS_IMOVEL = [
  "Apartamento",
  "Casa",
  "Cobertura",
  "Cobertura Duplex",
  "Cobertura Linear",
  "Casa em Condomínio",
  "Loja",
  "Sala Comercial",
];

export function Step0Identification({ state, updateState }: Props) {
  const showTerrainField = isCasaType(state.tipoImovel);
  
  // Street autocomplete states
  const [searchTerm, setSearchTerm] = useState(state.logradouro || "");
  const [suggestions, setSuggestions] = useState<StreetSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Calcular bônus de terreno automaticamente quando área construída ou terreno mudam
  useEffect(() => {
    if (showTerrainField && state.area_m2 > 0 && state.area_terreno_m2 > 0) {
      const { proporcao, bonus } = calculateTerrainBonus(state.area_m2, state.area_terreno_m2);
      updateState({ 
        proporcao_terreno: proporcao, 
        bonus_terreno: bonus 
      });
    } else if (!showTerrainField) {
      // Limpar campos de terreno se não for casa
      updateState({ 
        area_terreno_m2: 0,
        proporcao_terreno: 0, 
        bonus_terreno: 0 
      });
    }
  }, [state.area_m2, state.area_terreno_m2, showTerrainField]);

  // Fetch street suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        const normalizedTerm = normalizeStreetSearchTerm(searchTerm);
        const bairro = state.bairro?.toUpperCase() || "BARRA DA TIJUCA";

        // Fetch from ITBI transactions
        const { data, error } = await supabase
          .from("itbi_transactions")
          .select("logradouro, total_transacoes")
          .eq("bairro", bairro)
          .gte("percentual_transferido", 90)
          .not("valor_m2", "is", null)
          .ilike("logradouro", `%${normalizedTerm}%`)
          .order("total_transacoes", { ascending: false })
          .limit(100);

        if (error) throw error;

        // Also check with accent-normalized version
        const normalizedNoAccents = normalizeAccents(normalizedTerm);
        const { data: dataNoAccents } = await supabase
          .from("itbi_transactions")
          .select("logradouro, total_transacoes")
          .eq("bairro", bairro)
          .gte("percentual_transferido", 90)
          .not("valor_m2", "is", null)
          .ilike("logradouro", `%${normalizedNoAccents}%`)
          .order("total_transacoes", { ascending: false })
          .limit(100);

        // Combine and deduplicate
        const allData = [...(data || []), ...(dataNoAccents || [])];
        
        // Group by logradouro and sum transactions
        const grouped = new Map<string, number>();
        allData.forEach((item) => {
          const key = item.logradouro;
          grouped.set(key, (grouped.get(key) || 0) + (item.total_transacoes || 1));
        });

        // Fetch condominium mappings
        const { data: condominios } = await supabase
          .from("condominios_mapeamento")
          .select("logradouro_padrao, nome_condominio")
          .or(`logradouro_padrao.ilike.%${normalizedTerm}%,nome_condominio.ilike.%${normalizedTerm}%`);

        const condominioMap = new Map<string, string>();
        condominios?.forEach((c) => {
          condominioMap.set(c.logradouro_padrao, c.nome_condominio);
        });

        // Build suggestions with condominium names
        const suggestionsList: StreetSuggestion[] = Array.from(grouped.entries())
          .map(([logradouro, count]) => ({
            logradouro,
            transactionCount: count,
            nomeCondominio: condominioMap.get(logradouro),
          }))
          .sort((a, b) => b.transactionCount - a.transactionCount)
          .slice(0, 10);

        setSuggestions(suggestionsList);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, state.bairro]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: StreetSuggestion) => {
    setSearchTerm(suggestion.logradouro);
    updateState({ 
      logradouro: suggestion.logradouro,
      nomeCondominio: suggestion.nomeCondominio || state.nomeCondominio
    });
    setShowSuggestions(false);
  };

  const terrainInfo = calculateTerrainBonus(state.area_m2, state.area_terreno_m2);
  
  const getBonusColor = (bonus: number) => {
    if (bonus > 0) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (bonus < 0) return "bg-red-500/20 text-red-700 border-red-500/30";
    return "bg-muted text-muted-foreground";
  };
  
  const getBonusIcon = (bonus: number) => {
    if (bonus > 0) return <TrendingUp className="h-3 w-3" />;
    if (bonus < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dados do Imóvel */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" />
            Dados do Imóvel
          </h4>
          
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {/* BAIRRO - PRIMEIRO CAMPO */}
            <div>
              <Label className="text-xs sm:text-sm">Bairro *</Label>
              <div className="mt-1">
                <BairroSelector 
                  value={state.bairro}
                  onChange={(value) => {
                    updateState({ bairro: value });
                    // Limpar logradouro ao mudar bairro para forçar nova busca
                    setSearchTerm("");
                    updateState({ logradouro: "" });
                  }}
                />
              </div>
            </div>

            {/* Logradouro with autocomplete - SEGUNDO CAMPO */}
            <div className="relative">
              <Label htmlFor="logradouro" className="text-xs sm:text-sm">Logradouro *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  id="logradouro"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    updateState({ logradouro: e.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={state.bairro ? "Digite o nome da rua ou condomínio..." : "Selecione o bairro primeiro"}
                  disabled={!state.bairro}
                  className="h-10 sm:h-9 pl-9"
                />
                {loadingSuggestions && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between gap-2 border-b last:border-b-0"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {suggestion.nomeCondominio || suggestion.logradouro}
                        </div>
                        {suggestion.nomeCondominio && (
                          <div className="text-xs text-muted-foreground truncate">
                            {suggestion.logradouro}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {suggestion.transactionCount} transações
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <Label htmlFor="numero" className="text-xs sm:text-sm">Número</Label>
                <Input
                  id="numero"
                  value={state.numero}
                  onChange={(e) => updateState({ numero: e.target.value })}
                  placeholder="1000"
                  className="h-10 sm:h-9"
                />
              </div>
              <div>
                <Label htmlFor="complemento" className="text-xs sm:text-sm">Complemento</Label>
                <Input
                  id="complemento"
                  value={state.complemento}
                  onChange={(e) => updateState({ complemento: e.target.value })}
                  placeholder="Bloco A, Apt 101"
                  className="h-10 sm:h-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="nomeCondominio" className="text-xs sm:text-sm">Nome do Condomínio (opcional)</Label>
              <Input
                id="nomeCondominio"
                value={state.nomeCondominio}
                onChange={(e) => updateState({ nomeCondominio: e.target.value })}
                placeholder="Ex: Riserva Golf"
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Características Físicas */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            Características Físicas
          </h4>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="col-span-2">
              <Label htmlFor="tipoImovel" className="text-xs sm:text-sm">Tipo de Imóvel *</Label>
              <Select
                value={state.tipoImovel}
                onValueChange={(value) => updateState({ tipoImovel: value })}
              >
                <SelectTrigger className="h-10 sm:h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_IMOVEL.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="area_m2" className="text-xs sm:text-sm">
                {showTerrainField ? "Área Construída (m²) *" : "Área (m²) *"}
              </Label>
              <Input
                id="area_m2"
                type="number"
                value={state.area_m2 || ""}
                onChange={(e) => updateState({ area_m2: Number(e.target.value) || 0 })}
                placeholder="120"
                className="h-10 sm:h-9"
              />
            </div>
            
            {/* Campo de Área do Terreno - só para Casas */}
            {showTerrainField ? (
              <div>
                <Label htmlFor="area_terreno_m2" className="text-xs sm:text-sm">
                  Área do Terreno (m²)
                </Label>
                <Input
                  id="area_terreno_m2"
                  type="number"
                  value={state.area_terreno_m2 || ""}
                  onChange={(e) => updateState({ area_terreno_m2: Number(e.target.value) || 0 })}
                  placeholder="400"
                  className="h-10 sm:h-9"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="andar" className="text-xs sm:text-sm">Andar</Label>
                <Input
                  id="andar"
                  value={state.andar}
                  onChange={(e) => updateState({ andar: e.target.value })}
                  placeholder="15º"
                  className="h-10 sm:h-9"
                />
              </div>
            )}
            
            {/* Indicador de Proporção e Bônus - só para Casas com dados preenchidos */}
            {showTerrainField && state.area_m2 > 0 && state.area_terreno_m2 > 0 && (
              <div className="col-span-2 p-3 rounded-lg bg-background border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Proporção Terreno/Construção:</span>
                    <Badge variant="outline" className="font-mono">
                      {terrainInfo.proporcao.toFixed(1)}:1
                    </Badge>
                  </div>
                  <Badge className={`${getBonusColor(terrainInfo.bonus)} flex items-center gap-1`}>
                    {getBonusIcon(terrainInfo.bonus)}
                    {terrainInfo.bonus > 0 ? '+' : ''}{(terrainInfo.bonus * 100).toFixed(0)}% {terrainInfo.label}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Andar - só mostrar separado se for Casa */}
            {showTerrainField && (
              <div>
                <Label htmlFor="andar" className="text-xs sm:text-sm">Pavimentos</Label>
                <Input
                  id="andar"
                  value={state.andar}
                  onChange={(e) => updateState({ andar: e.target.value })}
                  placeholder="2"
                  className="h-10 sm:h-9"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="quartos" className="text-xs sm:text-sm">Quartos</Label>
              <Input
                id="quartos"
                type="number"
                min="0"
                value={state.quartos || ""}
                onChange={(e) => updateState({ quartos: Number(e.target.value) || 0 })}
                placeholder="3"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="suites" className="text-xs sm:text-sm">Suítes</Label>
              <Input
                id="suites"
                type="number"
                min="0"
                value={state.suites || ""}
                onChange={(e) => updateState({ suites: Number(e.target.value) || 0 })}
                placeholder="1"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="banheiros" className="text-xs sm:text-sm">Banheiros</Label>
              <Input
                id="banheiros"
                type="number"
                min="0"
                value={state.banheiros || ""}
                onChange={(e) => updateState({ banheiros: Number(e.target.value) || 0 })}
                placeholder="2"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="vagas" className="text-xs sm:text-sm">Vagas</Label>
              <Input
                id="vagas"
                type="number"
                min="0"
                value={state.vagas || ""}
                onChange={(e) => updateState({ vagas: Number(e.target.value) || 0 })}
                placeholder="2"
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Proprietário */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            Dados do Proprietário (opcional)
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="proprietario" className="text-xs sm:text-sm">Nome do Proprietário</Label>
              <Input
                id="proprietario"
                value={state.proprietario}
                onChange={(e) => updateState({ proprietario: e.target.value })}
                placeholder="Nome completo"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="telefone" className="text-xs sm:text-sm">Telefone</Label>
              <Input
                id="telefone"
                value={state.telefone}
                onChange={(e) => updateState({ telefone: e.target.value })}
                placeholder="(21) 99999-9999"
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Avaliação */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            Dados da Avaliação
          </h4>
          
          <div>
            <Label htmlFor="dataAvaliacao" className="text-xs sm:text-sm">Data da Avaliação</Label>
            <Input
              id="dataAvaliacao"
              type="date"
              value={state.dataAvaliacao}
              onChange={(e) => updateState({ dataAvaliacao: e.target.value })}
              className="h-10 sm:h-9 w-full sm:w-auto"
            />
          </div>
          
          <div>
            <Label htmlFor="observacoesImovel" className="text-xs sm:text-sm">Observações</Label>
            <Textarea
              id="observacoesImovel"
              value={state.observacoesImovel}
              onChange={(e) => updateState({ observacoesImovel: e.target.value })}
              placeholder="Anotações sobre o imóvel..."
              rows={3}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
