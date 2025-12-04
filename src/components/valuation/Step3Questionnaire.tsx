import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { SimpleRadioGroup, SimpleRadioItem } from "@/components/ui/simple-radio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye, Sun, Wrench, Sofa, Shield, LayoutGrid, FileText } from "lucide-react";
import type { ValuationState } from "@/types/valuation";
import type { ValuationCharacteristic, DocumentationFactor } from "@/hooks/useValuationCharacteristics";
import { groupCharacteristicsByCategory } from "@/hooks/useValuationCharacteristics";
import type { ValuationResult, CharacteristicResponse } from "@/utils/valuationCalculations";

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          {Object.entries(groupedChars).map(([key, category]) => {
            const Icon = CATEGORY_ICONS[key] || Eye;
            const adjustment = getCategoryAdjustment(key);
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex flex-col gap-1 py-2 text-xs"
              >
                <Icon className={`h-4 w-4 ${CATEGORY_COLORS[key]}`} />
                <span className="hidden sm:inline">{key}</span>
                {adjustment !== 0 && (
                  <Badge 
                    variant={adjustment > 0 ? "default" : "destructive"} 
                    className="text-[10px] px-1"
                  >
                    {formatPercent(adjustment)}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="doc" className="flex flex-col gap-1 py-2 text-xs">
            <FileText className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Doc</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedChars).map(([key, category]) => (
          <TabsContent key={key} value={key} className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{category.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Cap: {formatPercent(category.cap_max)} / {formatPercent(category.cap_min)}
                </p>
              </div>
              <Badge variant="outline">
                Ajuste: {formatPercent(getCategoryAdjustment(key))}
              </Badge>
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
                          <Badge
                            variant={char.char_type === "positive" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {formatPercent(char.weight_value)}
                          </Badge>
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
                    {factor.factor !== null && factor.factor < 1 && (
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
              <span>
                Ajuste Total: {formatPercent(preview.total_adjustment)}
                {preview.auto_capped && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    CAP aplicado
                  </Badge>
                )}
              </span>
              <Badge
                variant={
                  preview.confidence_level === "green"
                    ? "default"
                    : preview.confidence_level === "red"
                    ? "destructive"
                    : "secondary"
                }
              >
                Confiança: {preview.confidence_score}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
