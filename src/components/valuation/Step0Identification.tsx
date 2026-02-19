import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar, MapPin, Home, TrendingUp, TrendingDown, Minus, Search, Loader2, CheckCircle2, Database, AlertCircle } from "lucide-react";
import type { ValuationState } from "@/types/valuation";
import { isCasaType, calculateTerrainBonus } from "@/hooks/useValuationCharacteristics";
import { useEffect, useState, useRef } from "react";
import { useOfficialStreetSuggestions, type OfficialStreetSuggestion } from "@/hooks/useOfficialStreetSuggestions";
import { BairroSelector } from "@/components/BairroSelector";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
  showValidation?: boolean;
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

export function Step0Identification({ state, updateState, showValidation = false }: Props) {
  const showTerrainField = isCasaType(state.tipoImovel);
  
  // Street autocomplete states
  const [searchTerm, setSearchTerm] = useState(state.logradouro || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Track touched fields for validation
  const [touched, setTouched] = useState({
    bairro: false,
    logradouro: false,
    tipoImovel: false,
    area_m2: false,
  });
  
  // Validation errors
  const errors = {
    bairro: !state.bairro,
    logradouro: !state.logradouro?.trim(),
    tipoImovel: !state.tipoImovel,
    area_m2: !state.area_m2 || state.area_m2 <= 0,
  };
  
  // Show error if touched or showValidation is true (from parent attempting to proceed)
  const shouldShowError = (field: keyof typeof errors) => {
    return (touched[field] || showValidation) && errors[field];
  };
  
  // Hook unificado para sugestões (API oficial + ITBI)
  const { data: suggestions, isLoading: loadingSuggestions } = useOfficialStreetSuggestions(
    searchTerm,
    state.bairro || "BARRA DA TIJUCA"
  );
  
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

  const handleSelectSuggestion = (suggestion: OfficialStreetSuggestion) => {
    // Usa logradouro_itbi para compatibilidade com base ITBI
    const streetName = suggestion.logradouro_itbi || suggestion.logradouro;
    setSearchTerm(streetName);
    const updates: Partial<ValuationState> = { 
      logradouro: streetName,
      nomeCondominio: suggestion.nome_condominio || state.nomeCondominio
    };
    // Se é cross-bairro, atualizar o bairro automaticamente
    if (suggestion.bairro_origem) {
      updates.bairro = suggestion.bairro_origem;
    }
    updateState(updates);
    setShowSuggestions(false);
  };

  const getFonteBadge = (fonte: OfficialStreetSuggestion['fonte']) => {
    switch (fonte) {
      case 'combinado':
        return (
          <Badge variant="default" className="text-[10px] shrink-0 bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'oficial':
        return (
          <Badge variant="outline" className="text-[10px] shrink-0 text-blue-600 border-blue-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Oficial
          </Badge>
        );
      case 'itbi':
        return (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            <Database className="h-3 w-3 mr-1" />
            ITBI
          </Badge>
        );
    }
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
              <Label className={`text-xs sm:text-sm ${shouldShowError('bairro') ? 'text-destructive' : ''}`}>
                Bairro *
              </Label>
              <div className="mt-1">
                <BairroSelector 
                  value={state.bairro}
                  onChange={(value) => {
                    updateState({ bairro: value });
                    setTouched(prev => ({ ...prev, bairro: true }));
                    // Limpar logradouro ao mudar bairro para forçar nova busca
                    setSearchTerm("");
                    updateState({ logradouro: "" });
                  }}
                  className={shouldShowError('bairro') ? 'border-destructive ring-destructive/20' : ''}
                />
              </div>
              {shouldShowError('bairro') && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Selecione um bairro
                </p>
              )}
            </div>

            {/* Logradouro with autocomplete - SEGUNDO CAMPO */}
            <div className="relative">
              <Label htmlFor="logradouro" className={`text-xs sm:text-sm ${shouldShowError('logradouro') ? 'text-destructive' : ''}`}>
                Logradouro *
              </Label>
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
                  onBlur={() => setTouched(prev => ({ ...prev, logradouro: true }))}
                  placeholder={state.bairro ? "Digite o nome da rua ou condomínio..." : "Selecione o bairro primeiro"}
                  disabled={!state.bairro}
                  className={`h-10 sm:h-9 pl-9 ${shouldShowError('logradouro') ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                />
                {loadingSuggestions && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {shouldShowError('logradouro') && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Informe o logradouro
                </p>
              )}
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-start justify-between gap-2 border-b last:border-b-0"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {suggestion.nome_condominio || suggestion.logradouro}
                        </div>
                        {suggestion.nome_condominio && (
                          <div className="text-xs text-muted-foreground truncate">
                            {suggestion.logradouro}
                          </div>
                        )}
                        {suggestion.hierarquia && (
                          <div className="text-[10px] text-muted-foreground">
                            Via {suggestion.hierarquia}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {suggestion.bairro_origem ? (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                            <MapPin className="h-3 w-3 mr-0.5" />
                            {suggestion.bairro_origem}
                          </Badge>
                        ) : (
                          getFonteBadge(suggestion.fonte)
                        )}
                        {suggestion.transaction_count && suggestion.transaction_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {suggestion.transaction_count} transações
                          </span>
                        )}
                      </div>
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
                  placeholder="0"
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
              <Label htmlFor="tipoImovel" className={`text-xs sm:text-sm ${shouldShowError('tipoImovel') ? 'text-destructive' : ''}`}>
                Tipo de Imóvel *
              </Label>
              <Select
                value={state.tipoImovel}
                onValueChange={(value) => {
                  updateState({ tipoImovel: value });
                  setTouched(prev => ({ ...prev, tipoImovel: true }));
                }}
              >
                <SelectTrigger className={`h-10 sm:h-9 ${shouldShowError('tipoImovel') ? 'border-destructive focus:ring-destructive/20' : ''}`}>
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
              {shouldShowError('tipoImovel') && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Selecione o tipo de imóvel
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="area_m2" className={`text-xs sm:text-sm ${shouldShowError('area_m2') ? 'text-destructive' : ''}`}>
                {showTerrainField ? "Área Construída (m²) *" : "Área (m²) *"}
              </Label>
              <Input
                id="area_m2"
                type="number"
                value={state.area_m2 || ""}
                onChange={(e) => updateState({ area_m2: Number(e.target.value) || 0 })}
                onBlur={() => setTouched(prev => ({ ...prev, area_m2: true }))}
                placeholder="0"
                className={`h-10 sm:h-9 ${shouldShowError('area_m2') ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
              />
              {shouldShowError('area_m2') && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Informe a área em m²
                </p>
              )}
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
                  placeholder="0"
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
                  placeholder="0"
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
                  placeholder="0"
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
                placeholder="0"
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
                placeholder="0"
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
                placeholder="0"
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
                placeholder="0"
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
