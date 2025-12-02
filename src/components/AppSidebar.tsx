import { LayoutDashboard, TrendingUp, Home, FileText, Database } from "lucide-react";
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
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Análise", url: "/analysis", icon: TrendingUp },
  { title: "Propriedades", url: "/properties", icon: Home },
  { title: "Relatórios", url: "/reports", icon: FileText },
  { title: "Popular Dados", url: "/seed-data", icon: Database },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
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
  );
}
