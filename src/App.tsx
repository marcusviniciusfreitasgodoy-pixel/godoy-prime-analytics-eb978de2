import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BairroProvider } from "@/contexts/BairroContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Microbairros from "./pages/Microbairros";
import PesquisasMercado from "./pages/PesquisasMercado";
import AvaliacaoImobiliaria from "./pages/AvaliacaoImobiliaria";
import HistoricoAvaliacoes from "./pages/HistoricoAvaliacoes";
import CalibradorAvaliacao from "./pages/CalibradorAvaliacao";
import BaseConhecimento from "./pages/BaseConhecimento";
import VistoriaDigital from "./pages/VistoriaDigital";
import Documentacao from "./pages/Documentacao";
import Leads from "./pages/Leads";
import Usuarios from "./pages/Usuarios";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AvaliacaoPublica from "./pages/AvaliacaoPublica";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Domínios exclusivos para landing page de avaliação
const AVALIACAO_DOMAINS = ['avaliacao.godoyprime.com.br'];

const App = () => {
  // Detecta se é domínio exclusivo de avaliação
  const isAvaliacaoDomain = AVALIACAO_DOMAINS.includes(window.location.hostname);

  // Se for domínio de avaliação, renderiza apenas a landing page
  if (isAvaliacaoDomain) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AvaliacaoPublica />} />
              <Route path="/avaliacao" element={<AvaliacaoPublica />} />
              <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="*" element={<AvaliacaoPublica />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BairroProvider>
              <Routes>
                {/* Página pública de avaliação - sem sidebar/header */}
                <Route path="/avaliacao" element={<AvaliacaoPublica />} />
                
                {/* Página de Política de Privacidade - pública */}
                <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                
                {/* Página de autenticação */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Página de redefinir senha */}
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Páginas protegidas com layout completo */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <SidebarProvider defaultOpen={true}>
                        <div className="min-h-screen flex w-full bg-background">
                          <AppSidebar />
                          <div className="flex-1 flex flex-col">
                            <Header />
                            <main className="flex-1 px-1 py-2 sm:p-6 overflow-auto">
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/microbairros" element={<Microbairros />} />
                                <Route path="/pesquisas-mercado" element={<PesquisasMercado />} />
                                <Route path="/avaliacao-imobiliaria" element={<AvaliacaoImobiliaria />} />
                                <Route path="/historico-avaliacoes" element={<HistoricoAvaliacoes />} />
                                <Route path="/vistoria-digital" element={<VistoriaDigital />} />
                                <Route path="/documentacao" element={<Documentacao />} />
                                <Route 
                                  path="/base-conhecimento" 
                                  element={
                                    <ProtectedRoute requireAdmin>
                                      <BaseConhecimento />
                                    </ProtectedRoute>
                                  } 
                                />
                                <Route 
                                  path="/calibrador-avaliacao" 
                                  element={
                                    <ProtectedRoute requireAdmin>
                                      <CalibradorAvaliacao />
                                    </ProtectedRoute>
                                  } 
                                />
                                <Route
                                  path="/leads" 
                                  element={
                                    <ProtectedRoute requireAdmin>
                                      <Leads />
                                    </ProtectedRoute>
                                  } 
                                />
                                <Route 
                                  path="/usuarios" 
                                  element={
                                    <ProtectedRoute requireAdmin>
                                      <Usuarios />
                                    </ProtectedRoute>
                                  } 
                                />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </main>
                            <Footer />
                          </div>
                        </div>
                      </SidebarProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BairroProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
