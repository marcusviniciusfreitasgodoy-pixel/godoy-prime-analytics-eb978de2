import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { FileSignature, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GerarAutorizacaoDrawer } from "./GerarAutorizacaoDrawer";
import type { ValuationState } from "@/types/valuation";
import type { Autorizacao } from "@/types/autorizacao";

interface Props {
  state: ValuationState;
  valuationId: string | null | undefined;
  defaultValorAvaliacao?: number;
  /** Se a avaliação já tem autorização vinculada, mostra "Ver Autorização" */
  existingAutorizacao?: Autorizacao | null;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

/**
 * Botão padronizado para gerar Autorização de Captação.
 * Usa o mesmo Drawer em todos os pontos de entrada (Step5, Diálogo final, Histórico, Página de Autorizações).
 */
export function GerarAutorizacaoButton({
  state,
  valuationId,
  defaultValorAvaliacao,
  existingAutorizacao,
  variant,
  size = "default",
  className,
  label,
  fullWidth,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Se já existe autorização vinculada, vira link "Ver Autorização"
  if (existingAutorizacao) {
    return (
      <Button
        variant={variant ?? "outline"}
        size={size}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          navigate("/autorizacoes-captacao");
        }}
      >
        <Eye className="h-4 w-4 mr-2" />
        Ver Autorização
      </Button>
    );
  }

  // Pré-condições
  const missing: string[] = [];
  if (!valuationId) missing.push("Salve a avaliação primeiro");
  if (!state.proprietario?.trim()) missing.push("Preencha o nome do proprietário (Passo 0)");
  if (!defaultValorAvaliacao || defaultValorAvaliacao <= 0) missing.push("É necessário um valor de avaliação");

  const disabled = missing.length > 0;

  const button = (
    <Button
      variant={variant ?? "default"}
      size={size}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      className={`${className || ""} ${variant === "default" || !variant ? "bg-[#0C2340] hover:bg-[#0C2340]/90 text-white" : ""}`}
      style={fullWidth ? { width: "100%" } : undefined}
    >
      <FileSignature className="h-4 w-4 mr-2" />
      {label || "Gerar Autorização de Captação"}
    </Button>
  );

  return (
    <>
      {disabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><span style={fullWidth ? { display: "block" } : undefined}>{button}</span></TooltipTrigger>
            <TooltipContent>
              <ul className="text-xs space-y-1">
                {missing.map((m) => <li key={m}>• {m}</li>)}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : button}

      {valuationId && (
        <GerarAutorizacaoDrawer
          open={open}
          onOpenChange={setOpen}
          state={state}
          valuationId={valuationId}
          defaultValorAvaliacao={defaultValorAvaliacao}
        />
      )}
    </>
  );
}
