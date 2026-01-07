import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MethodologyDisclaimer() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-help px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors">
            <Info className="h-3.5 w-3.5" />
            <span>Metodologia</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-semibold">Fonte e Metodologia</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>Fonte:</strong> Transações Oficiais - Prefeitura do Rio de Janeiro
              </li>
              <li>
                <strong>Filtro:</strong> Apenas transações com ≥90% de transferência
              </li>
              <li>
                <strong>Uso:</strong> Imóveis residenciais e comerciais
              </li>
              <li>
                <strong>KPIs:</strong> Calculados apenas para uso residencial
              </li>
              <li>
                <strong>Região:</strong> Conforme bairro selecionado
              </li>
              <li>
                <strong>Atualização:</strong> Diária automática às 02:00
              </li>
            </ul>
            <p className="text-muted-foreground italic pt-1 border-t border-border">
              Aviso: Esta é uma ferramenta estatística e não substitui laudo
              PTAM.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
