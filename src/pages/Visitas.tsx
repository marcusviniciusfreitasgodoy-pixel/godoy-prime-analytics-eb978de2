import { Helmet } from "react-helmet-async";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVisitas } from "@/hooks/useVisitas";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useVisitasStats } from "@/hooks/useVisitasStats";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { VisitCard } from "@/components/visitas/VisitCard";
import { VisitasDashboardKPIs } from "@/components/visitas/VisitasDashboardKPIs";
import { VisitasEvolutionChart } from "@/components/visitas/VisitasEvolutionChart";
import { CorretorRanking } from "@/components/visitas/CorretorRanking";
import { FeedbackAnalyticsDashboard } from "@/components/visitas/FeedbackAnalyticsDashboard";
import { PageTour, TourButton } from "@/components/PageTour";
import { Calendar, List, Plus, Loader2, LayoutDashboard, Trophy, MessageSquare, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useFeedbackAnalytics } from "@/hooks/useFeedbackAnalytics";

export default function Visitas() {
  const navigate = useNavigate();
  const { fichas, isLoading: loadingFichas } = useVisitas();
  const { agendamentos, isLoading: loadingAgendamentos } = useAgendamentos();
  const { stats, corretorRanking, evolucaoMensal, isLoading: loadingStats } = useVisitasStats();
  const { data: feedbackAnalytics } = useFeedbackAnalytics();
  const { isDemo } = useDemo();
  const { user } = useAuth();
  const demoUser = isDemo ? { email: "demo@godoyprime.com.br" } : user;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [runTour, setRunTour] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const isLoading = loadingFichas || loadingAgendamentos;

  const feedbackCount = feedbackAnalytics?.totalFeedbacks ?? 0;

  // Filter and sort agendamentos
  const filteredAgendamentos = useMemo(() => {
    if (!agendamentos) return [];
    let filtered = [...agendamentos];
    if (statusFilter !== "todos") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    filtered.sort((a, b) => {
      const da = new Date(a.data_hora).getTime();
      const db = new Date(b.data_hora).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });
    return filtered;
  }, [agendamentos, statusFilter, sortOrder]);


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
              <Button variant="secondary" onClick={() => navigate("/visitas/nova-ficha")} size="sm" className="h-9">
                <FilePlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Ficha</span>
              </Button>
              <Button variant="outline" onClick={() => navigate("/visitas/disponibilidade")} data-tour="visitas-disponibilidade" size="sm" className="h-9">
                <Calendar className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Disponibilidade</span>
              </Button>
            </div>
          </div>
        </div>

        <div data-tour="visitas-kpis">
          <VisitasDashboardKPIs stats={stats} isLoading={loadingStats} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-auto" data-tour="visitas-tabs">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="agendamentos" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agendamentos</span>
              <Badge variant="secondary" className="text-[10px] ml-1">{agendamentos?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="fichas" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Fichas</span>
              <Badge variant="secondary" className="text-[10px] ml-1">{fichas?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedbacks</span>
              <Badge variant="secondary" className="text-[10px] ml-1">{feedbackCount}</Badge>
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
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {sortOrder === "desc" ? "Mais recente" : "Mais antigo"}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAgendamentos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgendamentos.map((agendamento) => (
                  <VisitCard
                    key={agendamento.id}
                    agendamento={agendamento}
                    type="agendamento"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento encontrado</p>
                {statusFilter !== "todos" && (
                  <Button variant="link" onClick={() => setStatusFilter("todos")}>
                    Limpar filtro
                  </Button>
                )}
                {statusFilter === "todos" && (
                  <Button variant="link" onClick={() => navigate("/visitas/agendar")}>
                    Criar primeiro agendamento
                  </Button>
                )}
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

          <TabsContent value="feedbacks" className="mt-6" data-tour="visitas-feedbacks">
            <FeedbackAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="ranking" className="mt-6" data-tour="visitas-ranking">
            <CorretorRanking data={corretorRanking} isLoading={loadingStats} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
