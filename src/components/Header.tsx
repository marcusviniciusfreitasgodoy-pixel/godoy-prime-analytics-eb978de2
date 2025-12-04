import { MapPin, LogOut, Menu, Home, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoSymbol from "@/assets/godoy-logo-symbol.png";
import { useAuth } from "@/hooks/useAuth";
import { SyncDataButton } from "./SyncDataButton";
import { SyncITBIButton } from "./SyncITBIButton";
import { ImportCSVButton } from "./ImportCSVButton";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { NavLink } from "./NavLink";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Microbairros", url: "/microbairros", icon: MapPin },
  { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck },
  { title: "Documentação", url: "/documentacao", icon: FileText },
];

export function Header() {
  const { signOut } = useAuth();

  return (
    <header className="h-16 sm:h-20 border-b border-border bg-primary sticky top-0 z-50 shadow-lg">
      <div className="h-full px-4 sm:px-8 flex items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center gap-2 sm:gap-4">
          <img 
            src={logoSymbol} 
            alt="Godoy Prime Realty" 
            className="h-10 sm:h-14 w-auto object-contain"
          />
          <div className="border-l border-accent/30 pl-2 sm:pl-4">
            <h1 className="font-bold text-sm sm:text-lg text-primary-foreground tracking-wider">GODOY PRIME</h1>
            <p className="text-[10px] sm:text-xs text-accent font-semibold tracking-wide">ANALYTICS DASHBOARD</p>
          </div>
        </div>
        
        {/* Desktop navigation */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary-foreground/90 text-sm">
            <MapPin className="h-4 w-4 text-accent" />
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

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-primary border-border">
            <div className="flex flex-col gap-4 mt-8">
              <div className="flex items-center gap-2 text-primary-foreground/90 text-sm pb-4 border-b border-border">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="font-semibold">Rio de Janeiro</span>
              </div>
              
              {/* Navigation links */}
              <nav className="flex flex-col gap-1 pb-4 border-b border-border">
                {navItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end
                    className="flex items-center gap-3 px-3 py-2 text-primary-foreground/80 hover:bg-accent/10 rounded-md transition-colors"
                    activeClassName="bg-accent/20 text-accent font-medium"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </nav>
              
              <div className="flex flex-col gap-2">
                <ImportCSVButton />
                <SyncITBIButton />
                <SyncDataButton />
              </div>
              <Button
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="gap-2 border-accent bg-accent/20 text-accent hover:bg-accent/30 hover:text-accent font-semibold mt-4"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
