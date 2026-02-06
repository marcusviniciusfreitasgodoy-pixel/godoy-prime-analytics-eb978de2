import { Eye, LogIn, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function DemoBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-accent/90 text-accent-foreground px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-xs sm:text-sm z-[60] flex-shrink-0 h-9 relative">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-medium truncate">DEMONSTRAÇÃO</span>
        <span className="hidden md:inline text-accent-foreground/80 truncate">
          — Dados fictícios · Funcionalidades de edição desabilitadas
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-7 text-xs text-accent-foreground/80 hover:text-accent-foreground px-2"
          onClick={() => navigate("/apresentacao")}
        >
          <Presentation className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Apresentação</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 h-7 text-xs px-2.5"
          onClick={() => navigate("/auth")}
        >
          <LogIn className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Criar Conta</span>
        </Button>
      </div>
    </div>
  );
}
