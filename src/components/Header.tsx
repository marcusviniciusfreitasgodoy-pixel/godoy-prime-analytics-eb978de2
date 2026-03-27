import { MapPin, Menu, Home, ClipboardCheck, ClipboardList, FileText, LogOut, Users, UserCog, Search, Calculator, RefreshCw, Settings, History, Brain, CalendarCheck, Cog, BookOpen, Rocket, User, ChevronDown, Shield, Map, Kanban, MessageSquare, Presentation, BarChart3, Building2, HandshakeIcon, FolderOpen, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import logoSymbol from "@/assets/godoy-logo-symbol.png";
import { SyncDataButton } from "./SyncDataButton";
import { SyncITBIButton } from "./SyncITBIButton";
import { ImportCSVButton } from "./ImportCSVButton";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { NavLink } from "./NavLink";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface MobileNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileNavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MobileNavItem[];
  requiresRole?: "gerente" | "admin" | "superadmin";
}

const mobileMenuGroups: MobileNavGroup[] = [
  {
    label: "Início",
    icon: Home,
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Onboarding", url: "/onboarding", icon: Rocket },
      { title: "Manual / Tour", url: "/manual", icon: BookOpen },
    ],
  },
  {
    label: "Mercado & Território",
    icon: BarChart3,
    items: [
      { title: "Microregiões", url: "/microbairros", icon: MapPin },
      { title: "Intel. Territorial", url: "/inteligencia-territorial", icon: Map },
      { title: "Pesquisas de Mercado", url: "/pesquisas-mercado", icon: Search },
    ],
  },
  {
    label: "Avaliação & Vistoria",
    icon: Building2,
    items: [
      { title: "Avaliação Imobiliária", url: "/avaliacao-imobiliaria", icon: Calculator },
      { title: "Hist. Avaliações", url: "/historico-avaliacoes", icon: History },
      { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck },
      { title: "Hist. Vistorias", url: "/historico-vistorias", icon: ClipboardList },
    ],
  },
  {
    label: "Clientes & Visitas",
    icon: HandshakeIcon,
    items: [
      { title: "Visitas", url: "/visitas", icon: CalendarCheck },
      { title: "Leads", url: "/leads", icon: Users },
      { title: "Pipeline CRM", url: "/pipeline", icon: Kanban },
    ],
    requiresRole: "gerente",
  },
  {
    label: "Documentos & Apoio",
    icon: FolderOpen,
    items: [
      { title: "Documentação", url: "/documentacao", icon: FileText },
      { title: "Apresentação", url: "/apresentacao", icon: Presentation },
    ],
  },
  {
    label: "Administração",
    icon: SlidersHorizontal,
    items: [
      { title: "Calibr. Avaliação", url: "/calibrador-avaliacao", icon: Settings },
      { title: "Calibr. Vistoria", url: "/calibrador-vistoria", icon: ClipboardList },
      { title: "Config. Formulários", url: "/configurar-formularios", icon: MessageSquare },
      { title: "Base Conhecimento", url: "/base-conhecimento", icon: Brain },
      { title: "Usuários", url: "/usuarios", icon: UserCog },
      { title: "Configurações", url: "/configuracoes", icon: Cog },
    ],
    requiresRole: "gerente",
  },
  {
    label: "Superadmin",
    icon: Shield,
    items: [
      { title: "Superadmin", url: "/admin", icon: Shield },
    ],
    requiresRole: "superadmin",
  },
];

export function Header() {
  const { user, isAdmin, isAdminOrGerente, role, signOut } = useAuthContext();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const isSuperadmin = role === "superadmin";

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    toast({ title: "Atualizando...", description: "Limpando cache e baixando versão mais recente" });
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    setTimeout(() => window.location.reload(), 500);
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logout realizado", description: "Você foi desconectado com sucesso." });
    navigate("/auth");
  };

  const shouldShowGroup = (group: MobileNavGroup) => {
    if (!group.requiresRole) return true;
    if (isSuperadmin) return true;
    if (group.requiresRole === "superadmin") return isSuperadmin;
    if (group.requiresRole === "admin") return isAdmin || isSuperadmin;
    if (group.requiresRole === "gerente") return isAdminOrGerente || isSuperadmin;
    return false;
  };

  const visibleGroups = mobileMenuGroups.filter(shouldShowGroup);

  const getUserInitials = () => {
    if (!user?.email) return "U";
    const parts = user.email.split("@")[0].split(".");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const displayName = organization?.name || "GODOY PRIME";

  return (
    <header className="h-16 sm:h-20 border-b border-border bg-primary sticky top-0 z-50 shadow-lg">
      <div className="h-full px-4 sm:px-8 flex items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src={logoSymbol} alt="Logo" className="h-10 sm:h-14 w-auto object-contain" />
          <div className="border-l border-accent/30 pl-2 sm:pl-4">
            <h1 className="font-bold text-sm sm:text-lg text-primary-foreground tracking-wider">{displayName}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] sm:text-xs text-accent font-semibold tracking-wide">ANALYTICS DASHBOARD</p>
              <button
                onClick={handleForceUpdate}
                disabled={isUpdating}
                className="text-[8px] sm:text-[9px] text-primary-foreground/40 font-mono bg-primary-foreground/5 px-1.5 py-0.5 rounded hover:bg-primary-foreground/10 hover:text-primary-foreground/60 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clique para forçar atualização"
              >
                {isUpdating ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : null}
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
          
          {(isAdmin || isSuperadmin) && (
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
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-accent/20">
              <LogOut className="h-4 w-4 mr-1" />
              Sair
            </Button>
          </div>
        </div>

        {/* Mobile: User dropdown + Menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1 text-primary-foreground hover:bg-accent/20 px-2">
                <div className="h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center text-accent font-semibold text-xs">
                  {getUserInitials()}
                </div>
                <ChevronDown className="h-3 w-3 text-primary-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border z-[60]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email?.split("@")[0]}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                  {organization && (
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full mt-1.5 inline-block w-fit">
                      {organization.name}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer">
                <Cog className="mr-2 h-4 w-4" /><span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleForceUpdate} disabled={isUpdating} className="cursor-pointer">
                <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} /><span>Forçar Atualização</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /><span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground" data-tour="mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-primary border-border">
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-2 text-primary-foreground/90 text-sm pb-4 border-b border-border">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span className="font-semibold">Rio de Janeiro</span>
                </div>
                
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
                
                {(isAdmin || isSuperadmin) && (
                  <div className="flex flex-col gap-2 pb-4 border-b border-border">
                    <ImportCSVButton />
                    <SyncITBIButton />
                    <SyncDataButton />
                  </div>
                )}
                
                <Button variant="ghost" onClick={handleLogout} className="justify-start text-primary-foreground/80 hover:text-primary-foreground hover:bg-accent/20">
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
