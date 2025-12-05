import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BairroProvider } from "@/contexts/BairroContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Dashboard from "./pages/Dashboard";
import Microbairros from "./pages/Microbairros";
import VistoriaDigital from "./pages/VistoriaDigital";
import Documentacao from "./pages/Documentacao";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <BairroProvider>
            <SidebarProvider defaultOpen={true}>
              <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                  <Header />
                  <main className="flex-1 px-1 py-2 sm:p-6 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/microbairros" element={<Microbairros />} />
                      <Route path="/vistoria-digital" element={<VistoriaDigital />} />
                      <Route path="/documentacao" element={<Documentacao />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              </div>
            </SidebarProvider>
          </BairroProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
