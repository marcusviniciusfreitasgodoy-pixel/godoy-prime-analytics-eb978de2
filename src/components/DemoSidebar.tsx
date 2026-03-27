import { 
  Home, ClipboardCheck, ClipboardList, FileText, MapPin, Users, 
  Search, Calculator, Settings, History, CalendarCheck, Cog, Presentation,
  ChevronDown, BarChart3, Building2, HandshakeIcon, FolderOpen, SlidersHorizontal
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

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const menuGroups: NavGroup[] = [
  {
    label: "Início",
    icon: Home,
    items: [
      { title: "Dashboard", url: "/demo", icon: Home },
    ],
  },
  {
    label: "Mercado & Território",
    icon: BarChart3,
    items: [
      { title: "Microregiões", url: "/demo/microbairros", icon: MapPin },
      { title: "Pesquisas de Mercado", url: "/demo/pesquisas-mercado", icon: Search },
    ],
  },
  {
    label: "Avaliação & Vistoria",
    icon: Building2,
    items: [
      { title: "Avaliação Imobiliária", url: "/demo/avaliacao-imobiliaria", icon: Calculator },
      { title: "Hist. Avaliações", url: "/demo/historico-avaliacoes", icon: History },
      { title: "Vistoria Digital", url: "/demo/vistoria-digital", icon: ClipboardCheck },
      { title: "Hist. Vistorias", url: "/demo/historico-vistorias", icon: ClipboardList },
    ],
  },
  {
    label: "Clientes & Visitas",
    icon: HandshakeIcon,
    items: [
      { title: "Visitas", url: "/demo/visitas", icon: CalendarCheck },
      { title: "Leads", url: "/demo/leads", icon: Users },
    ],
  },
  {
    label: "Documentos & Apoio",
    icon: FolderOpen,
    items: [
      { title: "Documentação", url: "/demo/documentacao", icon: FileText },
      { title: "Apresentação", url: "/demo/apresentacao", icon: Presentation },
    ],
  },
  {
    label: "Administração",
    icon: SlidersHorizontal,
    items: [
      { title: "Calibr. Avaliação", url: "/demo/calibrador-avaliacao", icon: Settings },
      { title: "Calibr. Vistoria", url: "/demo/calibrador-vistoria", icon: ClipboardList },
      { title: "Configurações", url: "/demo/configuracoes", icon: Cog },
    ],
  },
];

export function DemoSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.url);
  };

  return (
    <div className="hidden xl:block">
      <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
        <div className="p-3 flex justify-end">
          <SidebarTrigger />
        </div>
        <SidebarContent>
          {menuGroups.map((group) => {
            const active = isGroupActive(group);
            return (
              <Collapsible key={group.label} defaultOpen={active || group.label === "Início"} className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild className="text-sidebar-foreground/60 px-3 hover:bg-sidebar-accent/50 rounded-md cursor-pointer">
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
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-sidebar-accent rounded-md transition-colors"
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              >
                                <item.icon className="h-4 w-4 flex-shrink-0" />
                                {open && <span className="truncate">{item.title}</span>}
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
