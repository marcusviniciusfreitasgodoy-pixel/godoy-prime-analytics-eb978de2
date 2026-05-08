import { 
  Home, ClipboardCheck, ClipboardList, FileText, MapPin, Users, UserCog, 
  Search, Calculator, Settings, History, Brain, CalendarCheck, Cog, BookOpen, 
  Rocket, Shield, Kanban, MessageSquare, Presentation, Map, ChevronDown,
  BarChart3, Building2, HandshakeIcon, FolderOpen, SlidersHorizontal, FileSignature
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  tourId?: string;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  requiresRole?: "gerente" | "admin" | "superadmin";
}

const menuGroups: NavGroup[] = [
  {
    label: "Início",
    icon: Home,
    items: [
      { title: "Dashboard", url: "/", icon: Home, tourId: "nav-dashboard" },
      { title: "Onboarding", url: "/onboarding", icon: Rocket, tourId: "nav-onboarding-page" },
      { title: "Manual / Tour", url: "/manual", icon: BookOpen, tourId: "nav-onboarding" },
    ],
  },
  {
    label: "Mercado & Território",
    icon: BarChart3,
    items: [
      { title: "Microregiões", url: "/microbairros", icon: MapPin, tourId: "nav-microregioes" },
      { title: "Intel. Territorial", url: "/inteligencia-territorial", icon: Map, tourId: "nav-territorial" },
      { title: "Pesquisas de Mercado", url: "/pesquisas-mercado", icon: Search, tourId: "nav-pesquisas" },
    ],
  },
  {
    label: "Avaliação & Vistoria",
    icon: Building2,
    items: [
      { title: "Avaliação Imobiliária", url: "/avaliacao-imobiliaria", icon: Calculator, tourId: "nav-avaliacao" },
      { title: "Hist. Avaliações", url: "/historico-avaliacoes", icon: History, tourId: "nav-historico" },
      { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck, tourId: "nav-vistoria" },
      { title: "Hist. Vistorias", url: "/historico-vistorias", icon: ClipboardList, tourId: "nav-historico-vistorias" },
      { title: "Autorizações", url: "/autorizacoes-captacao", icon: FileSignature, tourId: "nav-autorizacoes" },
    ],
  },
  {
    label: "Clientes & Visitas",
    icon: HandshakeIcon,
    items: [
      { title: "Visitas", url: "/visitas", icon: CalendarCheck, tourId: "nav-visitas" },
      { title: "WhatsApp Log", url: "/whatsapp-logs", icon: MessageSquare, tourId: "nav-whatsapp-logs" },
      { title: "Leads", url: "/leads", icon: Users, tourId: "nav-leads" },
      { title: "Pipeline CRM", url: "/pipeline", icon: Kanban, tourId: "nav-pipeline" },
    ],
    requiresRole: "gerente",
  },
  {
    label: "Documentos & Apoio",
    icon: FolderOpen,
    items: [
      { title: "Documentação", url: "/documentacao", icon: FileText, tourId: "nav-documentacao" },
      { title: "Apresentação", url: "/apresentacao", icon: Presentation, tourId: "nav-apresentacao" },
    ],
  },
  {
    label: "Administração",
    icon: SlidersHorizontal,
    items: [
      { title: "Calibr. Avaliação", url: "/calibrador-avaliacao", icon: Settings, tourId: "nav-calibrador" },
      { title: "Calibr. Vistoria", url: "/calibrador-vistoria", icon: ClipboardList, tourId: "nav-calibrador-vistoria" },
      { title: "Config. Formulários", url: "/configurar-formularios", icon: MessageSquare, tourId: "nav-configurar-formularios" },
      { title: "Base Conhecimento", url: "/base-conhecimento", icon: Brain, tourId: "nav-base-conhecimento" },
      { title: "Usuários", url: "/usuarios", icon: UserCog, tourId: "nav-usuarios" },
      { title: "Configurações", url: "/configuracoes", icon: Cog, tourId: "nav-configuracoes" },
    ],
    requiresRole: "gerente",
  },
  {
    label: "Superadmin",
    icon: Shield,
    items: [
      { title: "Superadmin", url: "/admin", icon: Shield, tourId: "nav-superadmin" },
    ],
    requiresRole: "superadmin",
  },
];

// Items visible to basic "corretor" role inside grouped sections
const corretorVisibleItems = [
  "/visitas", "/configuracoes",
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { isAdmin, isAdminOrGerente, role } = useAuthContext();
  const { organization } = useOrganization();
  const location = useLocation();
  const isSuperadmin = role === "superadmin";

  const shouldShowGroup = (group: NavGroup) => {
    if (!group.requiresRole) return true;
    if (isSuperadmin) return true;
    if (group.requiresRole === "superadmin") return isSuperadmin;
    if (group.requiresRole === "admin") return isAdmin || isSuperadmin;
    if (group.requiresRole === "gerente") return isAdminOrGerente || isSuperadmin;
    return false;
  };

  const filterGroupItems = (group: NavGroup) => {
    if (!group.requiresRole) return group.items;
    if (isSuperadmin || isAdmin) return group.items;
    if (isAdminOrGerente) {
      // Gerentes see all items in their groups except admin-only ones
      return group.items.filter(item => 
        !["/base-conhecimento", "/usuarios"].includes(item.url)
      );
    }
    // Corretores only see specific items
    return group.items.filter(item => corretorVisibleItems.includes(item.url));
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.url);
  };

  return (
    <div className="hidden lg:block">
      <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
        <div className="p-4 flex justify-end">
          <SidebarTrigger />
        </div>

        {open && organization && (
          <div className="px-4 pb-3 border-b border-sidebar-border mb-2">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {organization.name}
            </p>
            <Badge variant="outline" className="text-[10px] mt-1">
              {organization.plan || "starter"}
            </Badge>
          </div>
        )}
        
        <SidebarContent>
          {menuGroups.map((group) => {
            if (!shouldShowGroup(group)) return null;
            const items = filterGroupItems(group);
            if (items.length === 0) return null;
            const active = isGroupActive(group);

            return (
              <Collapsible key={group.label} defaultOpen={active || group.label === "Início"} className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild className="text-sidebar-foreground/60 px-4 hover:bg-sidebar-accent/50 rounded-md cursor-pointer">
                    <CollapsibleTrigger className="flex w-full items-center gap-2">
                      <group.icon className="h-4 w-4 flex-shrink-0" />
                      {open && (
                        <>
                          <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">{group.label}</span>
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink 
                                to={item.url} 
                                end
                                className="flex items-center gap-3 px-4 py-2 hover:bg-sidebar-accent rounded-md transition-colors"
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                                data-tour={item.tourId}
                              >
                                <item.icon className="h-4 w-4 flex-shrink-0" />
                                {open && <span className="text-sm">{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
        </SidebarContent>
      </Sidebar>
    </div>
  );
}
