import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useVisitas } from "@/hooks/useVisitas";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { VisitCard } from "@/components/visitas/VisitCard";
import { Calendar, List, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Visitas() {
  const navigate = useNavigate();
  const { fichas, isLoading: loadingFichas } = useVisitas();
  const { agendamentos, isLoading: loadingAgendamentos } = useAgendamentos();
  const [activeTab, setActiveTab] = useState("agendamentos");

  const isLoading = loadingFichas || loadingAgendamentos;

  return (
    <>
      <Helmet>
        <title>Agendamento de Visitas | Godoy Prime Analytics</title>
      </Helmet>

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Agendamento de Visitas</h1>
            <p className="text-muted-foreground">Gerencie visitas e agendamentos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/visitas/agendar")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Visita
            </Button>
            <Button variant="outline" onClick={() => navigate("/visitas/disponibilidade")}>
              <Calendar className="h-4 w-4 mr-2" />
              Disponibilidade
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="agendamentos" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agendamentos ({agendamentos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="fichas" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Fichas de Visita ({fichas?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agendamentos" className="mt-6">
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

          <TabsContent value="fichas" className="mt-6">
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
        </Tabs>
      </div>
    </>
  );
}
