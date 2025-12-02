import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">Godoy Prime</h1>
            <p className="text-xs text-muted-foreground">Analytics</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">Rio de Janeiro</Button>
          <div className="w-px h-6 bg-border" />
          <Button variant="ghost" size="sm">Barra da Tijuca</Button>
        </div>
      </div>
    </header>
  );
}
