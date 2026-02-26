import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DemoProvider } from "@/contexts/DemoContext";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoSidebar } from "@/components/DemoSidebar";
import { DemoHeader } from "@/components/DemoHeader";
import Dashboard from "@/pages/Dashboard";
import Microbairros from "@/pages/Microbairros";
import PesquisasMercado from "@/pages/PesquisasMercado";
import AvaliacaoImobiliaria from "@/pages/AvaliacaoImobiliaria";
import HistoricoAvaliacoes from "@/pages/HistoricoAvaliacoes";
import HistoricoVistorias from "@/pages/HistoricoVistorias";
import VistoriaDigital from "@/pages/VistoriaDigital";
import Documentacao from "@/pages/Documentacao";
import ManualPlataforma from "@/pages/ManualPlataforma";
import CalibradorAvaliacao from "@/pages/CalibradorAvaliacao";
import CalibradorVistoria from "@/pages/CalibradorVistoria";
import Leads from "@/pages/Leads";
import Visitas from "@/pages/Visitas";
import Configuracoes from "@/pages/Configuracoes";
import Apresentacao from "@/pages/Apresentacao";
import NotFound from "@/pages/NotFound";

const BANNER_HEIGHT = "36px";

export default function DemoLayout() {
  return (
    <DemoProvider isDemo>
      {/* Banner fixo no topo, fora do SidebarProvider para não conflitar com sidebar fixed */}
      <DemoBanner />
      
      {/* Conteúdo principal com offset do banner */}
      <div style={{ height: `calc(100vh - ${BANNER_HEIGHT})` }} className="flex flex-col">
        <SidebarProvider>
          <div className="flex flex-1 w-full bg-background overflow-hidden">
            <DemoSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <DemoHeader />
              <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/microbairros" element={<Microbairros />} />
                  <Route path="/pesquisas-mercado" element={<PesquisasMercado />} />
                  <Route path="/avaliacao-imobiliaria" element={<AvaliacaoImobiliaria />} />
                  <Route path="/historico-avaliacoes" element={<HistoricoAvaliacoes />} />
                  <Route path="/vistoria-digital" element={<VistoriaDigital />} />
                  <Route path="/historico-vistorias" element={<HistoricoVistorias />} />
                  <Route path="/documentacao" element={<Documentacao />} />
                  <Route path="/manual" element={<ManualPlataforma />} />
                  <Route path="/calibrador-avaliacao" element={<CalibradorAvaliacao />} />
                  <Route path="/calibrador-vistoria" element={<CalibradorVistoria />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/visitas" element={<Visitas />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/apresentacao" element={<Apresentacao />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </DemoProvider>
  );
}
