import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalDisclaimerProps {
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Aviso legal sobre análises de documentos por IA.
 * - "full": banner completo para topo de páginas/componentes
 * - "compact": versão reduzida para rodapés de cards/modais
 */
export function LegalDisclaimer({ variant = "full", className }: LegalDisclaimerProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200",
          className
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <p>
          Análise auxiliar gerada por IA. <strong>Não substitui</strong> avaliação de advogado ou
          especialista em transações imobiliárias.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4",
        className
      )}
    >
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
        <p className="font-semibold">Importante — Aviso Legal</p>
        <p className="leading-relaxed">
          Esta análise é gerada por inteligência artificial e tem caráter{" "}
          <strong>meramente auxiliar e informativo</strong>. Os resultados{" "}
          <strong>não substituem</strong> a avaliação de um <strong>advogado</strong>,{" "}
          <strong>despachante imobiliário</strong> ou <strong>especialista em transações
          imobiliárias</strong>. Sempre consulte um profissional habilitado antes de tomar
          qualquer decisão sobre compra, venda ou regularização de imóveis.
        </p>
      </div>
    </div>
  );
}
