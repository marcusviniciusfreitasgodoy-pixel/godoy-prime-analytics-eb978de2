import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle, Cloud } from "lucide-react";
import type { AutoSaveStatus } from "@/hooks/useAutoSaveValuation";

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
}

export function AutoSaveIndicator({ status, lastSavedAt }: AutoSaveIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (status === "idle" && !lastSavedAt) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {status === "saving" && (
        <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 px-2 py-0.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Salvando...</span>
        </Badge>
      )}

      {status === "saved" && (
        <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <Check className="h-3 w-3" />
          <span className="hidden sm:inline">Salvo</span>
        </Badge>
      )}

      {status === "error" && (
        <Badge variant="destructive" className="text-[10px] sm:text-xs gap-1 px-2 py-0.5">
          <AlertCircle className="h-3 w-3" />
          <span className="hidden sm:inline">Erro</span>
        </Badge>
      )}

      {status === "idle" && lastSavedAt && (
        <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 px-2 py-0.5 text-muted-foreground">
          <Cloud className="h-3 w-3" />
          <span className="hidden sm:inline">{formatTime(lastSavedAt)}</span>
        </Badge>
      )}
    </div>
  );
}
