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
import { Eye, Sun, Wrench, Sofa, Shield, LayoutGrid, FileText, Info, RotateCcw } from "lucide-react";
import type { ValuationState } from "@/types/valuation";
import type { ValuationCharacteristic, DocumentationFactor } from "@/hooks/useValuationCharacteristics";
import { groupCharacteristicsByCategory } from "@/hooks/useValuationCharacteristics";
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
  const [activeTab, setActiveTab] = useState("A");
  
  const groupedChars = useMemo(() => 
    groupCharacteristicsByCategory(characteristics),
    [characteristics]
  );

  const handleResponseChange = (charId: string, charCode: string, value: "sim" | "nao" | "nao_aplica", weight: number) => {
    const existing = state.responses.filter((r) => r.char_id !== charId);
    const newResponse: CharacteristicResponse = {
      char_id: charId,
      char_code: charCode,
      response: value,
      weight_applied: value === "sim" ? weight : 0,
    };
    updateState({ responses: [...existing, newResponse] });
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

  return (
    <div className="space-y-6">
      {/* Barra de progresso geral */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">Progresso das Respostas</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-xs">Itens não respondidos são automaticamente considerados como "Não" no cálculo da avaliação.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalProgress.answered}/{totalProgress.total} respondidas
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                totalProgress.percentage === 100 ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${totalProgress.percentage}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalProgress.percentage === 100 ? (
            <Badge className="bg-emerald-500">✓ Completo</Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              {totalProgress.total - totalProgress.answered} pendentes
            </Badge>
          )}
          {state.responses.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateState({ responses: [] })}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Limpar todas as respostas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {Object.entries(groupedChars).map(([key, category]) => (
          <TabsContent key={key} value={key} className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{category.name}</h4>
                {isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Cap: {formatPercent(category.cap_max)} / {formatPercent(category.cap_min)}
                  </p>
                )}
              </div>
              {isAdmin && (
                <Badge variant="outline">
                  Ajuste: {formatPercent(getCategoryAdjustment(key))}
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {category.items.map((char, index) => (
                <Card key={char.id} className="bg-muted/20">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {index + 1}. {char.char_name}
                          </span>
                          {isAdmin && (
                            <Badge
                              variant={char.char_type === "positive" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {formatPercent(char.weight_value)}
                            </Badge>
                          )}
                        </div>
                        {char.char_description && (
                          <p className="text-xs text-muted-foreground mt-1">
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
                        className="flex gap-3"
                      >
                        <div className="flex items-center space-x-1">
                          <SimpleRadioItem value="nao" id={`${char.id}-nao`} />
                          <Label htmlFor={`${char.id}-nao`} className="text-xs cursor-pointer">
                            Não
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <SimpleRadioItem value="sim" id={`${char.id}-sim`} />
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
        <TabsContent value="doc" className="space-y-4 mt-4">
          <div>
            <h4 className="font-semibold">Status da Documentação</h4>
            <p className="text-xs text-muted-foreground">
              Afeta diretamente o valor final (multiplicador)
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
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {docFactors.map((factor) => (
                <SelectItem key={factor.status_code} value={factor.status_code}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        factor.severity === "green"
                          ? "bg-emerald-500"
                          : factor.severity === "yellow"
                          ? "bg-yellow-500"
                          : factor.severity === "yellow_high"
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span>{factor.status_name}</span>
                    {isAdmin && factor.factor !== null && factor.factor < 1 && (
                      <span className="text-xs text-red-600">
                        ({((1 - factor.factor) * 100).toFixed(0)}% desconto)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <Label>Observações sobre documentação</Label>
            <Textarea
              value={state.docNotes}
              onChange={(e) => updateState({ docNotes: e.target.value })}
              placeholder="Descreva detalhes sobre pendências, se houver..."
              rows={3}
            />
          </div>
        </TabsContent>

        {/* TabsList movida para baixo - responsiva */}
        <TabsList className="flex flex-wrap justify-center gap-1 sm:grid sm:grid-cols-6 w-full mt-4 h-auto p-2">
          {Object.entries(groupedChars).map(([key, category]) => {
            const Icon = CATEGORY_ICONS[key] || Eye;
            const adjustment = getCategoryAdjustment(key);
            const progress = getCategoryProgress(key);
            const isComplete = progress.answered === progress.total;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex flex-col items-center gap-0.5 py-1.5 px-2 sm:px-3 text-xs min-w-[45px] sm:min-w-0 relative"
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${CATEGORY_COLORS[key]}`} />
                <span className="text-[10px] sm:text-xs font-medium">{key}</span>
                {isAdmin && adjustment !== 0 && (
                  <Badge 
                    variant={adjustment > 0 ? "default" : "destructive"} 
                    className="text-[8px] sm:text-[10px] px-1 py-0 h-4"
                  >
                    {formatPercent(adjustment)}
                  </Badge>
                )}
                {/* Indicador de completude */}
                {isComplete && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white">✓</span>
                )}
              </TabsTrigger>
            );
          })}
          <TabsTrigger 
            value="doc" 
            className="flex flex-col items-center gap-0.5 py-1.5 px-2 sm:px-3 text-xs min-w-[45px] sm:min-w-0"
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            <span className="text-[10px] sm:text-xs font-medium">Doc</span>
            {isAdmin && state.docFactor < 1 && (
              <Badge variant="destructive" className="text-[8px] sm:text-[10px] px-1 py-0 h-4">
                {formatPercent(state.docFactor - 1)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Preview em tempo real */}
      {preview && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📊 Preview em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-background rounded">
                <p className="text-xs text-muted-foreground">Pessimista</p>
                <p className="font-semibold text-red-600 text-sm">
                  {formatCurrency(preview.pessimista)}
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded border border-primary/30">
                <p className="text-xs text-muted-foreground">Provável</p>
                <p className="font-bold text-primary">
                  {formatCurrency(preview.provavel)}
                </p>
              </div>
              <div className="p-2 bg-background rounded">
                <p className="text-xs text-muted-foreground">Otimista</p>
                <p className="font-semibold text-emerald-600 text-sm">
                  {formatCurrency(preview.otimista)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              {isAdmin ? (
                <span>
                  Ajuste Total: {formatPercent(preview.total_adjustment)}
                  {preview.auto_capped && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      CAP aplicado
                    </Badge>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {state.responses.filter(r => r.response === "sim").length} características aplicadas
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
              >
                {isAdmin ? `Confiança: ${preview.confidence_score}%` : 
                  preview.confidence_level === "green" ? "Alta Confiança" : 
                  preview.confidence_level === "red" ? "Baixa Confiança" : "Média Confiança"
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
