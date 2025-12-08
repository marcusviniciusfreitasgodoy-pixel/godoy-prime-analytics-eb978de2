import { Home, ClipboardCheck, FileText, MapPin, Users } from "lucide-react";
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
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Microregiões", url: "/microbairros", icon: MapPin },
  { title: "Vistoria Digital", url: "/vistoria-digital", icon: ClipboardCheck },
  { title: "Documentação", url: "/documentacao", icon: FileText },
  { title: "Leads", url: "/leads", icon: Users },
];

export function AppSidebar() {
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
    </div>
  );
}
