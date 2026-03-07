import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { SimpleRadioGroup, SimpleRadioItem } from "@/components/ui/simple-radio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye, Sun, Wrench, Sofa, Shield, LayoutGrid, FileText, Info, RotateCcw, Home, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import type { ValuationState } from "@/types/valuation";
import type { ValuationCharacteristic, DocumentationFactor } from "@/hooks/useValuationCharacteristics";
import { groupCharacteristicsByCategory, isCasaType, calculateTerrainBonus } from "@/hooks/useValuationCharacteristics";
import type { ValuationResult, CharacteristicResponse } from "@/utils/valuationCalculations";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
  characteristics: ValuationCharacteristic[];
  docFactors: DocumentationFactor[];
  preview: ValuationResult | null;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  A: Eye,
  B: Wrench,
  C: Sofa,
  D: Shield,
  E: LayoutGrid,
};

const CATEGORY_COLORS: Record<string, string> = {
  A: "text-blue-600",
  B: "text-orange-600",
  C: "text-purple-600",
  D: "text-green-600",
  E: "text-pink-600",
};

export function Step3Questionnaire({ 
  state, 
  updateState, 
  characteristics, 
  docFactors,
  preview 
}: Props) {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("doc");
  
  const groupedChars = useMemo(() => 
    groupCharacteristicsByCategory(characteristics),
    [characteristics]
  );

  // Grupos mutuamente exclusivos (se seleciona um, desmarca os outros do grupo)
  const MUTUALLY_EXCLUSIVE_GROUPS: Record<string, string[]> = {
    conservacao: ['totalmente_reformado', 'estado_otimo', 'conservacao_regular'],
  };

  const handleResponseChange = (charId: string, charCode: string, value: "sim" | "nao" | "nao_aplica", weight: number) => {
    let updatedResponses = state.responses.filter((r) => r.char_id !== charId);
    
    // Se marcando "sim", verificar se pertence a um grupo mutuamente exclusivo
    if (value === "sim") {
      for (const [, groupCodes] of Object.entries(MUTUALLY_EXCLUSIVE_GROUPS)) {
        if (groupCodes.includes(charCode)) {
          // Desmarcar outros itens do mesmo grupo
          const otherCharIds = characteristics
            .filter(c => groupCodes.includes(c.char_code) && c.char_code !== charCode)
            .map(c => c.id);
          updatedResponses = updatedResponses.filter(r => !otherCharIds.includes(r.char_id));
          break;
        }
      }
    }
    
    const newResponse: CharacteristicResponse = {
      char_id: charId,
      char_code: charCode,
      response: value,
      weight_applied: value === "sim" ? weight : 0,
    };
    updateState({ responses: [...updatedResponses, newResponse] });
  };

  const getResponse = (charId: string): "sim" | "nao" | "nao_aplica" => {
    const response = state.responses.find((r) => r.char_id === charId);
    return response?.response || "nao";
  };

  // Calcula ajuste por categoria
  const getCategoryAdjustment = (category: string) => {
    const categoryChars = characteristics.filter((c) => c.category === category);
    let total = 0;
    categoryChars.forEach((char) => {
      const response = getResponse(char.id);
      if (response === "sim") {
        total += char.weight_value;
      }
    });
    return total;
  };

  // Calcula progresso de respostas por categoria
  const getCategoryProgress = (category: string) => {
    const categoryChars = characteristics.filter((c) => c.category === category);
    const answered = categoryChars.filter((char) => 
      state.responses.some((r) => r.char_id === char.id)
    ).length;
    return { answered, total: categoryChars.length };
  };

  // Progresso total
  const totalProgress = useMemo(() => {
    const answered = state.responses.length;
    const total = characteristics.length;
    return { answered, total, percentage: total > 0 ? Math.round((answered / total) * 100) : 0 };
  }, [state.responses.length, characteristics.length]);

  // Determina caps baseado no tipo de imóvel
  const isCasa = isCasaType(state.tipoImovel);
  const globalCap = isCasa ? 35 : 30;
  const terrainInfo = isCasa && state.area_m2 > 0 && state.area_terreno_m2 > 0 
    ? calculateTerrainBonus(state.area_m2, state.area_terreno_m2)
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const pct = value * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  };
  
  const getBonusColor = (bonus: number) => {
    if (bonus > 0) return "bg-green-500/20 text-green-700 border-green-500/30";
    if (bonus < 0) return "bg-red-500/20 text-red-700 border-red-500/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Info do tipo de imóvel e cap global */}
      <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg">
        <Badge variant="outline" className="text-xs">
          {isCasa ? "🏠 Casa" : "🏢 Apartamento"}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Cap Global: ±{globalCap}%
        </Badge>
        {terrainInfo && terrainInfo.proporcao > 0 && (
          <Badge className={`text-xs ${getBonusColor(terrainInfo.bonus)}`}>
            <Home className="h-3 w-3 mr-1" />
            Terreno {terrainInfo.proporcao.toFixed(1)}:1 ({terrainInfo.bonus > 0 ? '+' : ''}{(terrainInfo.bonus * 100).toFixed(0)}%)
          </Badge>
        )}
        <div className="flex-1" />
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {characteristics.length} características
        </span>
      </div>
      
      {/* Barra de progresso geral */}
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-medium">Progresso</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-xs">Itens não respondidos são automaticamente considerados como "Não".</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-[10px] sm:text-sm text-muted-foreground">
              {totalProgress.answered}/{totalProgress.total}
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                totalProgress.percentage === 100 ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${totalProgress.percentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {totalProgress.percentage === 100 ? (
            <Badge className="bg-emerald-500 text-[10px] sm:text-xs px-1.5 sm:px-2">✓</Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-600 text-[10px] sm:text-xs px-1.5 sm:px-2">
              {totalProgress.total - totalProgress.answered}
            </Badge>
          )}
          {state.responses.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-7 sm:w-7"
                    onClick={() => updateState({ responses: [] })}
                  >
                    <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Limpar todas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Navegação sequencial + TabsList no topo para melhor UX */}
        <div className="flex items-stretch gap-2 mb-3 sm:mb-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-auto min-h-[44px] sm:min-h-[48px] w-10"
            onClick={() => {
              const keys = ["doc", ...Object.keys(groupedChars)];
              const idx = keys.indexOf(activeTab);
              if (idx > 0) setActiveTab(keys[idx - 1]);
            }}
            disabled={(() => {
              const keys = ["doc", ...Object.keys(groupedChars)];
              return keys.indexOf(activeTab) <= 0;
            })()}
            aria-label="Categoria anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <TabsList className="grid grid-cols-6 w-full h-auto p-1 sm:p-2 gap-0.5 sm:gap-1">
            <TabsTrigger
              value="doc"
              className="flex flex-col items-center gap-0 sm:gap-0.5 py-1.5 sm:py-2 px-1 sm:px-3 text-xs"
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-[9px] sm:text-xs font-medium">Doc</span>
              {isAdmin && state.docFactor < 1 && (
                <Badge variant="destructive" className="text-[7px] sm:text-[10px] px-0.5 sm:px-1 py-0 h-3 sm:h-4 hidden sm:flex">
                  {formatPercent(state.docFactor - 1)}
                </Badge>
              )}
            </TabsTrigger>
            {Object.entries(groupedChars).map(([key]) => {
              const Icon = CATEGORY_ICONS[key] || Eye;
              const adjustment = getCategoryAdjustment(key);
              const progress = getCategoryProgress(key);
              const isComplete = progress.answered === progress.total;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex flex-col items-center gap-0 sm:gap-0.5 py-1.5 sm:py-2 px-1 sm:px-3 text-xs relative"
                >
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${CATEGORY_COLORS[key]}`} />
                  <span className="text-[9px] sm:text-xs font-medium">{key}</span>
                  {isAdmin && adjustment !== 0 && (
                    <Badge
                      variant={adjustment > 0 ? "default" : "destructive"}
                      className="text-[7px] sm:text-[10px] px-0.5 sm:px-1 py-0 h-3 sm:h-4 hidden sm:flex"
                    >
                      {formatPercent(adjustment)}
                    </Badge>
                  )}
                  {isComplete && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] text-white">✓</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-auto min-h-[44px] sm:min-h-[48px] w-10"
            onClick={() => {
              const keys = [...Object.keys(groupedChars), "doc"];
              const idx = keys.indexOf(activeTab);
              if (idx >= 0 && idx < keys.length - 1) setActiveTab(keys[idx + 1]);
            }}
            disabled={(() => {
              const keys = [...Object.keys(groupedChars), "doc"];
              const idx = keys.indexOf(activeTab);
              return idx < 0 || idx >= keys.length - 1;
            })()}
            aria-label="Próxima categoria"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {Object.entries(groupedChars).map(([key, category]) => (
          <TabsContent key={key} value={key} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm sm:text-base truncate">{category.name}</h4>
                {isAdmin && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Cap: {formatPercent(category.cap_max)} / {formatPercent(category.cap_min)}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                  {formatPercent(getCategoryAdjustment(key))}
                </Badge>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3">
              {category.items.map((char, index) => (
                <Card key={char.id} className="bg-muted/20">
                  <CardContent className="py-2.5 sm:py-3 px-3 sm:px-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-medium">
                            {index + 1}. {char.char_name}
                          </span>
                          {isAdmin && (
                            <Badge
                              variant={char.char_type === "positive" ? "default" : "destructive"}
                              className="text-[10px] sm:text-xs px-1.5"
                            >
                              {formatPercent(char.weight_value)}
                            </Badge>
                          )}
                        </div>
                        {char.char_description && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                            {char.char_description}
                          </p>
                        )}
                      </div>
                      <SimpleRadioGroup
                        value={getResponse(char.id)}
                        onValueChange={(value) =>
                          handleResponseChange(
                            char.id,
                            char.char_code,
                            value as "sim" | "nao" | "nao_aplica",
                            char.weight_value
                          )
                        }
                        className="flex gap-4 sm:gap-3 shrink-0"
                      >
                        <div className="flex items-center space-x-1.5 sm:space-x-1">
                          <SimpleRadioItem value="nao" id={`${char.id}-nao`} className="h-5 w-5 sm:h-4 sm:w-4" />
                          <Label htmlFor={`${char.id}-nao`} className="text-xs cursor-pointer">
                            Não
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5 sm:space-x-1">
                          <SimpleRadioItem value="sim" id={`${char.id}-sim`} className="h-5 w-5 sm:h-4 sm:w-4" />
                          <Label htmlFor={`${char.id}-sim`} className="text-xs cursor-pointer">
                            Sim
                          </Label>
                        </div>
                      </SimpleRadioGroup>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}

        {/* Tab de Documentação */}
        <TabsContent value="doc" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div>
            <h4 className="font-semibold text-sm sm:text-base">Status da Documentação</h4>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Afeta diretamente o valor final
            </p>
          </div>

          <Select
            value={state.docStatus}
            onValueChange={(value) => {
              const factor = docFactors.find((f) => f.status_code === value);
              updateState({
                docStatus: value,
                docFactor: factor?.factor || 1.0,
              });
            }}
          >
            <SelectTrigger className="h-10 sm:h-9">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {docFactors.map((factor) => (
                <SelectItem key={factor.status_code} value={factor.status_code}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        factor.severity === "green"
                          ? "bg-emerald-500"
                          : factor.severity === "yellow"
                          ? "bg-yellow-500"
                          : factor.severity === "yellow_high"
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="text-xs sm:text-sm">{factor.status_name}</span>
                    {isAdmin && factor.factor !== null && factor.factor < 1 && (
                      <span className="text-[10px] sm:text-xs text-red-600">
                        ({((1 - factor.factor) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Observações</Label>
            <Textarea
              value={state.docNotes}
              onChange={(e) => updateState({ docNotes: e.target.value })}
              placeholder="Detalhes sobre pendências..."
              rows={3}
              className="text-sm"
            />
          </div>
        </TabsContent>

      </Tabs>

      {/* Preview em tempo real */}
      {preview && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
              📊 Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
              <div className="p-1.5 sm:p-2 bg-background rounded">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pess.</p>
                <p className="font-semibold text-red-600 text-[11px] sm:text-sm">
                  {formatCurrency(preview.pessimista)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded border border-primary/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Prov.</p>
                <p className="font-bold text-primary text-xs sm:text-base">
                  {formatCurrency(preview.provavel)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-background rounded">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Otim.</p>
                <p className="font-semibold text-emerald-600 text-[11px] sm:text-sm">
                  {formatCurrency(preview.otimista)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] sm:text-xs gap-2 flex-wrap">
              {isAdmin ? (
                <span className="flex items-center gap-1 flex-wrap">
                  Ajuste: {formatPercent(preview.total_adjustment)}
                  {preview.auto_capped && (
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1">
                      CAP
                    </Badge>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {state.responses.filter(r => r.response === "sim").length} aplicadas
                </span>
              )}
              <Badge
                variant={
                  preview.confidence_level === "green"
                    ? "default"
                    : preview.confidence_level === "red"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px] sm:text-xs"
              >
                {isAdmin ? `${preview.confidence_score}%` : 
                  preview.confidence_level === "green" ? "Alta" : 
                  preview.confidence_level === "red" ? "Baixa" : "Média"
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
