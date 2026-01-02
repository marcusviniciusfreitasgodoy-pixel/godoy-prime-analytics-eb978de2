import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVisitas } from "@/hooks/useVisitas";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useVisitasStats } from "@/hooks/useVisitasStats";
import { VisitCard } from "@/components/visitas/VisitCard";
import { VisitasDashboardKPIs } from "@/components/visitas/VisitasDashboardKPIs";
import { VisitasEvolutionChart } from "@/components/visitas/VisitasEvolutionChart";
import { CorretorRanking } from "@/components/visitas/CorretorRanking";
import { PageTour, TourButton } from "@/components/PageTour";
import { Calendar, List, Plus, Loader2, LayoutDashboard, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Visitas() {
  const navigate = useNavigate();
  const { fichas, isLoading: loadingFichas } = useVisitas();
  const { agendamentos, isLoading: loadingAgendamentos } = useAgendamentos();
  const { stats, corretorRanking, evolucaoMensal, isLoading: loadingStats } = useVisitasStats();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [runTour, setRunTour] = useState(false);

  const isLoading = loadingFichas || loadingAgendamentos;

  return (
    <>
      <Helmet>
        <title>Dashboard de Visitas | Godoy Prime Analytics</title>
      </Helmet>

      <PageTour page="visitas" run={runTour} onFinish={() => setRunTour(false)} />

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dashboard de Visitas</h1>
              <p className="text-sm text-muted-foreground">Acompanhe métricas e gerencie visitas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TourButton onClick={() => setRunTour(true)} />
              <Button onClick={() => navigate("/visitas/agendar")} data-tour="visitas-nova" size="sm" className="h-9">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Visita</span>
              </Button>
              <Button variant="outline" onClick={() => navigate("/visitas/disponibilidade")} data-tour="visitas-disponibilidade" size="sm" className="h-9">
                <Calendar className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Disponibilidade</span>
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs sempre visíveis */}
        <div data-tour="visitas-kpis">
          <VisitasDashboardKPIs stats={stats} isLoading={loadingStats} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto" data-tour="visitas-tabs">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="agendamentos" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamentos</span>
              <Badge variant="secondary" className="text-[10px] sm:hidden">{agendamentos?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="fichas" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Fichas ({fichas?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6" data-tour="visitas-dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VisitasEvolutionChart data={evolucaoMensal} isLoading={loadingStats} />
              <CorretorRanking data={corretorRanking} isLoading={loadingStats} />
            </div>
          </TabsContent>

          <TabsContent value="agendamentos" className="mt-6" data-tour="visitas-agendamentos">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : agendamentos && agendamentos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agendamentos.map((agendamento) => (
                  <VisitCard key={agendamento.id} agendamento={agendamento} type="agendamento" />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento encontrado</p>
                <Button variant="link" onClick={() => navigate("/visitas/agendar")}>
                  Criar primeiro agendamento
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fichas" className="mt-6" data-tour="visitas-fichas">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : fichas && fichas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fichas.map((ficha) => (
                  <VisitCard key={ficha.id} ficha={ficha} type="ficha" />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ficha de visita encontrada</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="mt-6" data-tour="visitas-ranking">
            <CorretorRanking data={corretorRanking} isLoading={loadingStats} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
