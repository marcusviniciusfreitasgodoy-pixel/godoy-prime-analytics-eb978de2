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
import VistoriaDigital from "./pages/VistoriaDigital";
import Documentacao from "./pages/Documentacao";
import AvaliacaoPublica from "./pages/AvaliacaoPublica";
import Leads from "./pages/Leads";
import Usuarios from "./pages/Usuarios";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
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
                                <Route path="/vistoria-digital" element={<VistoriaDigital />} />
                                <Route path="/documentacao" element={<Documentacao />} />
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
