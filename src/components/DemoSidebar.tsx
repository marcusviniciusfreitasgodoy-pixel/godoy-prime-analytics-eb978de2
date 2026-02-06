import { Home, ClipboardCheck, ClipboardList, FileText, MapPin, Users, Search, Calculator, Settings, History, CalendarCheck, Cog, BookOpen, Rocket } from "lucide-react";
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

const items = [
  { title: "Dashboard", url: "/demo", icon: Home },
  { title: "Onboarding", url: "/demo/onboarding", icon: Rocket },
  { title: "Manual / Tour", url: "/demo/manual", icon: BookOpen },
  { title: "Microregiões", url: "/demo/microbairros", icon: MapPin },
  { title: "Pesquisas de Mercado", url: "/demo/pesquisas-mercado", icon: Search },
  { title: "Avaliação Imobiliária", url: "/demo/avaliacao-imobiliaria", icon: Calculator },
  { title: "Histórico Avaliações", url: "/demo/historico-avaliacoes", icon: History },
  { title: "Vistoria Digital", url: "/demo/vistoria-digital", icon: ClipboardCheck },
  { title: "Histórico Vistorias", url: "/demo/historico-vistorias", icon: ClipboardList },
  { title: "Agendamento de Visitas", url: "/demo/visitas", icon: CalendarCheck },
  { title: "Documentação", url: "/demo/documentacao", icon: FileText },
  { title: "Calibrador Avaliação", url: "/demo/calibrador-avaliacao", icon: Settings },
  { title: "Calibrador Vistoria", url: "/demo/calibrador-vistoria", icon: ClipboardList },
  { title: "Leads", url: "/demo/leads", icon: Users },
  { title: "Configurações", url: "/demo/configuracoes", icon: Cog },
];

export function DemoSidebar() {
  const { open } = useSidebar();

  return (
    <div className="hidden lg:block">
      <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
        <div className="p-4 flex justify-end">
          <SidebarTrigger />
        </div>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 px-4">
              Navegação (Demo)
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
