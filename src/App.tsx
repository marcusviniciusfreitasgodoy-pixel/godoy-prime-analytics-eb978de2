import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { BairroProvider } from "@/contexts/BairroContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UpdateIndicator } from "@/components/UpdateIndicator";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";
import { TourProgressBar } from "@/components/TourProgressBar";
import Dashboard from "./pages/Dashboard";
import Microbairros from "./pages/Microbairros";
import PesquisasMercado from "./pages/PesquisasMercado";
import AvaliacaoImobiliaria from "./pages/AvaliacaoImobiliaria";
import HistoricoAvaliacoes from "./pages/HistoricoAvaliacoes";
import HistoricoVistorias from "./pages/HistoricoVistorias";
import VistoriaDigital from "./pages/VistoriaDigital";
import Documentacao from "./pages/Documentacao";
import HistoricoDocumentos from "./pages/HistoricoDocumentos";
import ManualPlataforma from "./pages/ManualPlataforma";
import BaseConhecimento from "./pages/BaseConhecimento";
import CalibradorAvaliacao from "./pages/CalibradorAvaliacao";
import CalibradorVistoria from "./pages/CalibradorVistoria";
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
import NovaFichaVisita from "./pages/NovaFichaVisita";
import FeedbackLanding from "./pages/FeedbackLanding";
import AssinaturaVisita from "./pages/AssinaturaVisita";
import AssinaturaLanding from "./pages/AssinaturaLanding";
import PropostaPublica from "./pages/PropostaPublica";
import Configuracoes from "./pages/Configuracoes";
import DemoLayout from "./pages/DemoLayout";
import Apresentacao from "./pages/Apresentacao";
import ConviteAceitar from "./pages/ConviteAceitar";
import AdminPanel from "./pages/AdminPanel";
import PipelineCRM from "./pages/PipelineCRM";
import CalibradorFeedbackCorretor from "./pages/CalibradorFeedbackCorretor";
import ConfigurarFormularios from "./pages/ConfigurarFormularios";
import InteligenciaTerritorial from "./pages/InteligenciaTerritorial";
import FichaVisitaPublica from "./pages/FichaVisitaPublica";
import WhatsAppLogs from "./pages/WhatsAppLogs";
import AutorizacoesCaptacao from "./pages/AutorizacoesCaptacao";
import AutorizacaoPublica from "./pages/AutorizacaoPublica";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OrganizationProvider>
          <BairroProvider>
            <UpdateIndicator />
            <PWAUpdateBanner onUpdate={() => (window as any).__pwaUpdate?.()} />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                <Route path="/avaliacao" element={<AvaliacaoPublica />} />
                <Route path="/convite/:token" element={<ConviteAceitar />} />
                <Route path="/visitas/feedback" element={<FeedbackLanding />} />
                <Route path="/visitas/feedback/:codigo" element={<FeedbackVisita />} />
                <Route path="/visitas/assinatura" element={<AssinaturaLanding />} />
                <Route path="/visitas/assinatura/:codigo/:tipo" element={<AssinaturaVisita />} />
                <Route path="/proposta/:codigo" element={<PropostaPublica />} />
                <Route path="/visitas/ficha-publica/:codigo" element={<FichaVisitaPublica />} />
                <Route path="/autorizacao/:token" element={<AutorizacaoPublica />} />
                <Route path="/demo/*" element={<DemoLayout />} />
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
                              <Route path="/inteligencia-territorial" element={<InteligenciaTerritorial />} />
                              <Route path="/pesquisas-mercado" element={<PesquisasMercado />} />
                              <Route path="/avaliacao-imobiliaria" element={<AvaliacaoImobiliaria />} />
                              <Route path="/historico-avaliacoes" element={<HistoricoAvaliacoes />} />
                              <Route path="/vistoria-digital" element={<VistoriaDigital />} />
                              <Route path="/historico-vistorias" element={<HistoricoVistorias />} />
                              <Route path="/documentacao" element={<Documentacao />} />
                              <Route path="/historico-documentos" element={<HistoricoDocumentos />} />
                              <Route path="/manual" element={<ManualPlataforma />} />
                              <Route path="/base-conhecimento" element={<ProtectedRoute requireAdmin={true}><BaseConhecimento /></ProtectedRoute>} />
                              <Route path="/calibrador-avaliacao" element={<ProtectedRoute requireAdminOrGerente={true}><CalibradorAvaliacao /></ProtectedRoute>} />
                              <Route path="/calibrador-vistoria" element={<ProtectedRoute requireAdminOrGerente={true}><CalibradorVistoria /></ProtectedRoute>} />
                              <Route path="/calibrador-feedback-corretor" element={<Navigate to="/configurar-formularios" replace />} />
                              <Route path="/configurar-formularios" element={<ProtectedRoute requireAdminOrGerente={true}><ConfigurarFormularios /></ProtectedRoute>} />
                              <Route path="/leads" element={<ProtectedRoute requireAdminOrGerente={true}><Leads /></ProtectedRoute>} />
                              <Route path="/pipeline" element={<ProtectedRoute requireAdminOrGerente={true}><PipelineCRM /></ProtectedRoute>} />
                              <Route path="/usuarios" element={<ProtectedRoute requireAdmin={true}><Usuarios /></ProtectedRoute>} />
                              <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminPanel /></ProtectedRoute>} />
                              <Route path="/onboarding" element={<Onboarding />} />
                              <Route path="/visitas" element={<Visitas />} />
                              <Route path="/visitas/agendar" element={<AgendarVisita />} />
                              <Route path="/visitas/nova-ficha" element={<NovaFichaVisita />} />
                              <Route path="/visitas/disponibilidade" element={<DisponibilidadeVisitas />} />
                              <Route path="/visitas/ficha/:id" element={<FichaVisitaPage />} />
                              <Route path="/configuracoes" element={<Configuracoes />} />
                              <Route path="/whatsapp-logs" element={<ProtectedRoute requireAdminOrGerente={true}><WhatsAppLogs /></ProtectedRoute>} />
                              <Route path="/autorizacoes-captacao" element={<AutorizacoesCaptacao />} />
                              <Route path="/apresentacao" element={<Apresentacao />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </main>
                            <TourProgressBar />
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </BairroProvider>
          </OrganizationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
