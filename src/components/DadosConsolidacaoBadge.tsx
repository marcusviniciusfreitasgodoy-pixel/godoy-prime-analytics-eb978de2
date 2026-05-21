import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  /** Se fornecido, badge só aparece quando o período analisado intersecta now() - 90 dias */
  periodoFim?: Date | string;
  className?: string;
}

/**
 * Badge "Dados em consolidação" — sinaliza que ITBI dos últimos 90 dias
 * pode sofrer reprocessamento retroativo pela Prefeitura do Rio.
 */
export function DadosConsolidacaoBadge({ periodoFim, className }: Props) {
  if (periodoFim) {
    const fim = typeof periodoFim === "string" ? new Date(periodoFim) : periodoFim;
    const limite = new Date();
    limite.setDate(limite.getDate() - 90);
    if (fim < limite) return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 border-amber-400/60 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-help ${className ?? ""}`}
          >
            <Info className="h-3 w-3" />
            Dados em consolidação
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">
            As transações ITBI dos últimos <strong>90 dias</strong> podem sofrer
            reprocessamento retroativo pela Prefeitura do Rio. Volumes e médias
            tendem a se estabilizar após esse período.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}