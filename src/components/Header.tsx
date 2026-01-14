import { MapPin, Menu, Home, ClipboardCheck, ClipboardList, FileText, LogOut, Users, UserCog, Search, Calculator, RefreshCw, Settings, History, Brain, CalendarCheck, Cog, BookOpen, Rocket, User, ChevronDown } from "lucide-react";
import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// Manter sincronizado com AppSidebar.tsx
const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Onboarding", url: "/onboarding", icon: Rocket },
  { title: "Manual / Tour", url: "/manual", icon: BookOpen },
  { title: "Microregiões", url: "/microbairros", icon: MapPin },
  { title: "Pesquisas de Mercado", url: "/pesquisas-mercado", icon: Search },
  { title: "Avaliação Imobiliária", url: "/avaliacao-imobiliaria", icon: Calculator },
  { title: "Histórico Avaliações", url: "/historico-avaliacoes", icon: History },
  { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck },
  { title: "Histórico Vistorias", url: "/historico-vistorias", icon: ClipboardList },
  { title: "Agendamento de Visitas", url: "/visitas", icon: CalendarCheck },
  { title: "Documentação", url: "/documentacao", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Cog },
];

const adminItems = [
  { title: "Base Conhecimento Sofia", url: "/base-conhecimento", icon: Brain },
  { title: "Calibrador Avaliação", url: "/calibrador-avaliacao", icon: Settings },
  { title: "Calibrador Vistoria", url: "/calibrador-vistoria", icon: ClipboardList },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Usuários", url: "/usuarios", icon: UserCog },
];

export function Header() {
  const { user, isAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    toast({
      title: "Atualizando...",
      description: "Limpando cache e baixando versão mais recente",
    });
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // Force reload
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/auth");
  };

  const allNavItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return "U";
    const parts = user.email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

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
            <div className="flex items-center gap-2">
              <p className="text-[10px] sm:text-xs text-accent font-semibold tracking-wide">ANALYTICS DASHBOARD</p>
              <button
                onClick={handleForceUpdate}
                disabled={isUpdating}
                className="text-[8px] sm:text-[9px] text-primary-foreground/40 font-mono bg-primary-foreground/5 px-1.5 py-0.5 rounded hover:bg-primary-foreground/10 hover:text-primary-foreground/60 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clique para forçar atualização"
              >
                {isUpdating ? (
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                ) : null}
                v{typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev'}
              </button>
            </div>
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

        {/* Mobile: User dropdown + Menu */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center gap-1 text-primary-foreground hover:bg-accent/20 px-2"
              >
                <div className="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-accent font-semibold text-xs">
                  {getUserInitials()}
                </div>
                <ChevronDown className="h-3 w-3 text-primary-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-card border-border z-[60]"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email?.split("@")[0]}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email}
                  </p>
                  {isAdmin && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full mt-1.5 inline-block w-fit">
                      Administrador
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate("/configuracoes")}
                className="cursor-pointer"
              >
                <Cog className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleForceUpdate}
                disabled={isUpdating}
                className="cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>Forçar Atualização</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground"
                data-tour="mobile-menu"
              >
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
                <nav className="flex flex-col gap-1 pb-4 border-b border-border max-h-[60vh] overflow-y-auto">
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
      </div>
    </header>
  );
}
