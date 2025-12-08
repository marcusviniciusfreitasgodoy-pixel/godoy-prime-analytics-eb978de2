import { MapPin, Menu, Home, ClipboardCheck, FileText, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoSymbol from "@/assets/godoy-logo-symbol.png";
import { SyncDataButton } from "./SyncDataButton";
import { SyncITBIButton } from "./SyncITBIButton";
import { ImportCSVButton } from "./ImportCSVButton";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { NavLink } from "./NavLink";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Microregiões", url: "/microbairros", icon: MapPin },
  { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck },
  { title: "Documentação", url: "/documentacao", icon: FileText },
];

const adminItems = [
  { title: "Leads", url: "/leads", icon: Users },
];

export function Header() {
  const { user, isAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/auth");
  };

  const allNavItems = isAdmin ? [...navItems, ...adminItems] : navItems;

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
          
          {isAdmin && (
            <>
              <ImportCSVButton />
              <SyncITBIButton />
              <SyncDataButton />
            </>
          )}
          
          <div className="flex items-center gap-3 pl-4 border-l border-accent/30">
            <span className="text-xs text-primary-foreground/70 truncate max-w-[150px]">
              {user?.email}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-accent/20"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sair
            </Button>
          </div>
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
              
              {/* User info */}
              <div className="pb-4 border-b border-border">
                <p className="text-xs text-primary-foreground/70 truncate">
                  {user?.email}
                </p>
                {isAdmin && (
                  <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full mt-1 inline-block">
                    Administrador
                  </span>
                )}
              </div>
              
              {/* Navigation links */}
              <nav className="flex flex-col gap-1 pb-4 border-b border-border">
                {allNavItems.map((item) => (
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
              
              {isAdmin && (
                <div className="flex flex-col gap-2 pb-4 border-b border-border">
                  <ImportCSVButton />
                  <SyncITBIButton />
                  <SyncDataButton />
                </div>
              )}
              
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="justify-start text-primary-foreground/80 hover:text-primary-foreground hover:bg-accent/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
