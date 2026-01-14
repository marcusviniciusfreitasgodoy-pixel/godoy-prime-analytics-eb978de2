import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { BairroProvider } from "@/contexts/BairroContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UpdateIndicator } from "@/components/UpdateIndicator";
import Dashboard from "./pages/Dashboard";
import Microbairros from "./pages/Microbairros";
import PesquisasMercado from "./pages/PesquisasMercado";
import AvaliacaoImobiliaria from "./pages/AvaliacaoImobiliaria";
import HistoricoAvaliacoes from "./pages/HistoricoAvaliacoes";
import HistoricoVistorias from "./pages/HistoricoVistorias";
import VistoriaDigital from "./pages/VistoriaDigital";
import Documentacao from "./pages/Documentacao";
import ManualPlataforma from "./pages/ManualPlataforma";
import BaseConhecimento from "./pages/BaseConhecimento";
import CalibradorAvaliacao from "./pages/CalibradorAvaliacao";
import Leads from "./pages/Leads";
import Usuarios from "./pages/Usuarios";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import AvaliacaoPublica from "./pages/AvaliacaoPublica";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Visitas from "./pages/Visitas";
import AgendarVisita from "./pages/AgendarVisita";
import DisponibilidadeVisitas from "./pages/DisponibilidadeVisitas";
import FeedbackVisita from "./pages/FeedbackVisita";
import FichaVisitaPage from "./pages/FichaVisitaPage";
import FeedbackLanding from "./pages/FeedbackLanding";
import AssinaturaVisita from "./pages/AssinaturaVisita";
import AssinaturaLanding from "./pages/AssinaturaLanding";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Force fresh data on every mount - no stale cache
      staleTime: 0,
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Disable auto-refetch on focus to avoid confusion
      retry: 2,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BairroProvider>
            <UpdateIndicator />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                <Route path="/avaliacao" element={<AvaliacaoPublica />} />
                <Route path="/visitas/feedback" element={<FeedbackLanding />} />
                <Route path="/visitas/feedback/:codigo" element={<FeedbackVisita />} />
                <Route path="/visitas/assinatura" element={<AssinaturaLanding />} />
                <Route path="/visitas/assinatura/:codigo/:tipo" element={<AssinaturaVisita />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider>
                        <div className="min-h-screen flex w-full bg-background">
                          <AppSidebar />
                          <div className="flex-1 flex flex-col w-full overflow-hidden">
                            <Header />
                            <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
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
                              <Route path="/base-conhecimento" element={<ProtectedRoute requireAdmin={true}><BaseConhecimento /></ProtectedRoute>} />
                              <Route path="/calibrador-avaliacao" element={<ProtectedRoute requireAdmin={true}><CalibradorAvaliacao /></ProtectedRoute>} />
                              <Route path="/leads" element={<ProtectedRoute requireAdmin={true}><Leads /></ProtectedRoute>} />
                              <Route path="/usuarios" element={<ProtectedRoute requireAdmin={true}><Usuarios /></ProtectedRoute>} />
                              <Route path="/onboarding" element={<Onboarding />} />
                              <Route path="/visitas" element={<Visitas />} />
                              <Route path="/visitas/agendar" element={<AgendarVisita />} />
                              <Route path="/visitas/disponibilidade" element={<DisponibilidadeVisitas />} />
                              <Route path="/visitas/ficha/:id" element={<FichaVisitaPage />} />
                              <Route path="/configuracoes" element={<Configuracoes />} />
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
