import { Menu, Home, ClipboardCheck, ClipboardList, FileText, MapPin, Users, Search, Calculator, Settings, History, CalendarCheck, Cog } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import logoSymbol from "@/assets/godoy-logo-symbol.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/demo", icon: Home },
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

export function DemoHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      {/* Mobile menu */}
      <div className="lg:hidden">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img src={logoSymbol} alt="Godoy" className="h-8 w-auto" />
                <div>
                  <h2 className="font-semibold text-sm">Godoy Prime</h2>
                  <Badge variant="outline" className="text-[10px] h-4">DEMO</Badge>
                </div>
              </div>
            </div>
            <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-100px)]">
              {navItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-accent/10 transition-colors"
                  activeClassName="bg-accent/10 text-accent font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <img src={logoSymbol} alt="Godoy Prime" className="h-7 w-auto hidden lg:block" />
        <Badge variant="outline" className="text-xs">DEMONSTRAÇÃO</Badge>
      </div>

      <div className="flex-1" />
    </header>
  );
}
