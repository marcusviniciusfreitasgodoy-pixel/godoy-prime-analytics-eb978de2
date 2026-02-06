import { Home, ClipboardCheck, ClipboardList, FileText, MapPin, Users, UserCog, Search, Calculator, Settings, History, Brain, GraduationCap, CalendarCheck, Cog, BookOpen, Rocket } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
import { useAuthContext } from "@/contexts/AuthContext";

const baseItems = [
  { title: "Dashboard", url: "/", icon: Home, tourId: "nav-dashboard" },
  { title: "Onboarding", url: "/onboarding", icon: Rocket, tourId: "nav-onboarding-page" },
  { title: "Manual / Tour", url: "/manual", icon: BookOpen, tourId: "nav-onboarding" },
  { title: "Microregiões", url: "/microbairros", icon: MapPin, tourId: "nav-microregioes" },
  { title: "Pesquisas de Mercado", url: "/pesquisas-mercado", icon: Search, tourId: "nav-pesquisas" },
  { title: "Avaliação Imobiliária", url: "/avaliacao-imobiliaria", icon: Calculator, tourId: "nav-avaliacao" },
  { title: "Histórico Avaliações", url: "/historico-avaliacoes", icon: History, tourId: "nav-historico" },
  { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck, tourId: "nav-vistoria" },
  { title: "Histórico Vistorias", url: "/historico-vistorias", icon: ClipboardList, tourId: "nav-historico-vistorias" },
  { title: "Agendamento de Visitas", url: "/visitas", icon: CalendarCheck, tourId: "nav-visitas" },
  { title: "Documentação", url: "/documentacao", icon: FileText, tourId: "nav-documentacao" },
  { title: "Configurações", url: "/configuracoes", icon: Cog, tourId: "nav-configuracoes" },
];

// Items available to gerente and admin
const gerenteItems = [
  { title: "Calibrador Avaliação", url: "/calibrador-avaliacao", icon: Settings, tourId: "nav-calibrador" },
  { title: "Calibrador Vistoria", url: "/calibrador-vistoria", icon: ClipboardList, tourId: "nav-calibrador-vistoria" },
  { title: "Leads", url: "/leads", icon: Users, tourId: "nav-leads" },
];

// Items available only to admin
const adminItems = [
  { title: "Base Conhecimento Sofia", url: "/base-conhecimento", icon: Brain, tourId: "nav-base-conhecimento" },
  { title: "Usuários", url: "/usuarios", icon: UserCog, tourId: "nav-usuarios" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { isAdmin, isAdminOrGerente } = useAuthContext();
  
  const items = [
    ...baseItems,
    ...(isAdminOrGerente ? gerenteItems : []),
    ...(isAdmin ? adminItems : []),
  ];

  return (
    <div className="hidden lg:block">
      <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
        <div className="p-4 flex justify-end">
          <SidebarTrigger />
        </div>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 px-4">
              Navegação
            </SidebarGroupLabel>
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
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </div>
  );
}
