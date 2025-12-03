import { MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoSymbol from "@/assets/godoy-logo-symbol.png";
import { useAuth } from "@/hooks/useAuth";
import { SyncDataButton } from "./SyncDataButton";
import { SyncITBIButton } from "./SyncITBIButton";
import { ImportCSVButton } from "./ImportCSVButton";

export function Header() {
  const { signOut } = useAuth();

  return (
    <header className="h-20 border-b border-border bg-primary sticky top-0 z-50 shadow-lg">
      <div className="h-full px-8 flex items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <img 
            src={logoSymbol} 
            alt="Godoy Prime Realty" 
            className="h-14 w-auto object-contain"
          />
          <div className="border-l border-accent/30 pl-4">
            <h1 className="font-bold text-lg text-primary-foreground tracking-wider">GODOY PRIME</h1>
            <p className="text-xs text-accent font-semibold tracking-wide">ANALYTICS DASHBOARD</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary-foreground/90 text-sm">
            <MapPin className="h-4 w-4 text-accent" />
            <span className="font-semibold">Barra da Tijuca</span>
            <span className="text-primary-foreground/60">•</span>
            <span className="font-semibold">Rio de Janeiro</span>
          </div>
          <ImportCSVButton />
          <SyncITBIButton />
          <SyncDataButton />
          <Button
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="gap-2 border-accent bg-accent/20 text-accent hover:bg-accent/30 hover:text-accent font-semibold"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
