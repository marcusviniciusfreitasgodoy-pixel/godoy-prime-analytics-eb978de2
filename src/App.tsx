import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { BairroProvider } from "@/contexts/BairroContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Microbairros from "./pages/Microbairros";
import PesquisasMercado from "./pages/PesquisasMercado";
import AvaliacaoImobiliaria from "./pages/AvaliacaoImobiliaria";
import HistoricoAvaliacoes from "./pages/HistoricoAvaliacoes";
import VistoriaDigital from "./pages/VistoriaDigital";
import Documentacao from "./pages/Documentacao";
import BaseConhecimento from "./pages/BaseConhecimento";
import CalibradorAvaliacao from "./pages/CalibradorAvaliacao";
import Leads from "./pages/Leads";
import Usuarios from "./pages/Usuarios";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BairroProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <div className="min-h-screen flex w-full bg-background">
                          <AppSidebar />
                          <div className="flex-1 flex flex-col w-full overflow-hidden">
                            <Header />
                            <main className="flex-1 overflow-auto">
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/microbairros" element={<Microbairros />} />
                                <Route path="/pesquisas-mercado" element={<PesquisasMercado />} />
                                <Route path="/avaliacao-imobiliaria" element={<AvaliacaoImobiliaria />} />
                                <Route path="/historico-avaliacoes" element={<HistoricoAvaliacoes />} />
                                <Route path="/vistoria-digital" element={<VistoriaDigital />} />
                                <Route path="/documentacao" element={<Documentacao />} />
                                <Route path="/base-conhecimento" element={<BaseConhecimento />} />
                                <Route path="/calibrador-avaliacao" element={<CalibradorAvaliacao />} />
                                <Route path="/leads" element={<Leads />} />
                                <Route path="/usuarios" element={<Usuarios />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </main>
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </BairroProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
