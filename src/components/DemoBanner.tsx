import { Eye, LogIn, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function DemoBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-accent/90 text-accent-foreground px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 text-sm sticky top-0 z-50 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-medium">Modo Demonstração</span>
        <span className="hidden sm:inline text-accent-foreground/80">
          — Dados fictícios para exploração. Funcionalidades de edição desabilitadas.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-7 text-xs text-accent-foreground/80 hover:text-accent-foreground"
          onClick={() => navigate("/apresentacao")}
        >
          <Presentation className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Apresentação</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 h-7 text-xs"
          onClick={() => navigate("/auth")}
        >
          <LogIn className="h-3.5 w-3.5" />
          Criar Conta
        </Button>
      </div>
    </div>
  );
}
