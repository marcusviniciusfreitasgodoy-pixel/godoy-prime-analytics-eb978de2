import { RefreshCw, Clock, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { useLastSync } from "@/hooks/useLastSync";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LastSyncIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function LastSyncIndicator({ className, compact = false }: LastSyncIndicatorProps) {
  const { data: syncInfo, isLoading } = useLastSync();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Verificando...</span>
      </div>
    );
  }

  if (!syncInfo?.lastTransaction) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-destructive", className)}>
        <AlertCircle className="h-3 w-3" />
        <span>Dados não sincronizados</span>
      </div>
    );
  }

  const StatusIcon = syncInfo.isRecent ? CheckCircle2 : Clock;
  const statusColor = syncInfo.isRecent ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 text-xs cursor-help", statusColor, className)}>
              <StatusIcon className="h-3 w-3" />
              <span>{syncInfo.formattedDate}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">Última sincronização ITBI</p>
              <p>{syncInfo.formattedDate} às {syncInfo.formattedTime}</p>
              <p className="text-muted-foreground">{syncInfo.totalRecords.toLocaleString('pt-BR')} registros</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-card/50 cursor-help transition-colors hover:bg-card",
            className
          )}>
            <div className={cn("flex items-center gap-1", statusColor)}>
              <StatusIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground leading-tight">Última atualização</span>
              <span className="text-xs font-medium leading-tight">
                {syncInfo.formattedDate} {syncInfo.formattedTime}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground ml-1">
              <Database className="h-3 w-3" />
              <span className="text-[10px]">{syncInfo.totalRecords.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {syncInfo.isRecent 
              ? "Dados atualizados nas últimas 24h" 
              : "Dados podem estar desatualizados - sincronize novamente"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
