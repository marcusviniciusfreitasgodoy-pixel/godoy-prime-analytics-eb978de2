import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Gauge, Brain, Scale, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentId =
  | "google/gemini-3-flash-preview"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-pro"
  | "openai/gpt-5";

export const AGENTS: Array<{
  id: AgentId;
  name: string;
  description: string;
  speed: string;
  cost: "Baixo" | "Médio" | "Alto" | "Premium";
  icon: typeof Zap;
  recommendedFor: string;
}> = [
  {
    id: "google/gemini-3-flash-preview",
    name: "Análise Rápida",
    description: "Triagem ágil para documentos simples e diretos.",
    speed: "~5s",
    cost: "Baixo",
    icon: Zap,
    recommendedFor: "IPTU, condomínio, declarações simples",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Análise Equilibrada",
    description: "Boa profundidade com tempo de resposta confortável.",
    speed: "~10s",
    cost: "Médio",
    icon: Gauge,
    recommendedFor: "Contratos padrão e documentos do dia a dia",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Análise Profunda",
    description: "Raciocínio jurídico aprofundado, padrão recomendado.",
    speed: "~20-30s",
    cost: "Alto",
    icon: Brain,
    recommendedFor: "Matrículas, escrituras, certidões de ônus reais",
  },
  {
    id: "openai/gpt-5",
    name: "Análise Jurídica Premium",
    description: "Nuances, múltiplas cláusulas e due diligence crítica.",
    speed: "~30-45s",
    cost: "Premium",
    icon: Scale,
    recommendedFor: "Pareceres complexos e casos litigiosos",
  },
];

export const DEFAULT_AGENT: AgentId = "google/gemini-2.5-pro";

export function getAgentById(id: string | null | undefined) {
  return AGENTS.find((a) => a.id === id);
}

const costStyles: Record<string, string> = {
  Baixo: "bg-green-500/10 text-green-700 border-green-500/20",
  Médio: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Alto: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Premium: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

interface AgentSelectorProps {
  value: AgentId;
  onChange: (id: AgentId) => void;
  disabled?: boolean;
}

export function AgentSelector({ value, onChange, disabled }: AgentSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">Escolha o agente de IA</h3>
          <p className="text-xs text-muted-foreground">
            Selecione conforme a complexidade do documento. Você pode trocar a qualquer momento.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const selected = value === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(agent.id)}
              className={cn(
                "text-left transition-all rounded-lg",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <Card
                className={cn(
                  "p-3 h-full border-2 transition-all hover:border-accent/60",
                  selected ? "border-accent bg-accent/5 shadow-sm" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                    selected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-sm leading-tight">{agent.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug min-h-[2.5rem]">
                  {agent.description}
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {agent.speed}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", costStyles[agent.cost])}>
                    Custo: {agent.cost}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight">
                  Ideal para: {agent.recommendedFor}
                </p>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}