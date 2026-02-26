import { Badge } from "@/components/ui/badge";
import { Users, BarChart3, Settings, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Persona {
  icon: LucideIcon;
  title: string;
  modules: string[];
}

const personas: Persona[] = [
  {
    icon: Search,
    title: "Corretor Autônomo",
    modules: ["Avaliação", "Visitas", "CRM", "Sofia IA"],
  },
  {
    icon: BarChart3,
    title: "Imobiliária",
    modules: ["Dashboard", "Controle Operacional", "Pipeline"],
  },
  {
    icon: Settings,
    title: "Administrador",
    modules: ["Calibradores", "Gestão de Usuários", "Configurações"],
  },
  {
    icon: Users,
    title: "Comprador Premium",
    modules: ["Parecer Independente", "Transparência de Mercado"],
  },
];

export default function PersonasSection() {
  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <Badge variant="secondary" className="mb-3">Para Quem</Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Cada perfil tem sua solução
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {personas.map((p) => (
            <div key={p.title} className="text-center space-y-2 sm:space-y-3 bg-card rounded-xl p-4 shadow-sm sm:bg-transparent sm:shadow-none sm:p-0 sm:rounded-none">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
                <p.icon className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
              </div>
              <h3 className="font-semibold text-sm sm:text-lg">{p.title}</h3>
              <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
                {p.modules.map((m) => (
                  <Badge key={m} variant="secondary" className="text-[10px] sm:text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
