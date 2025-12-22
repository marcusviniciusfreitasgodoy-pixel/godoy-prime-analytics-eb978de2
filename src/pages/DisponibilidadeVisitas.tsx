import { Helmet } from "react-helmet-async";
import { AvailabilityManager } from "@/components/visitas/AvailabilityManager";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DisponibilidadeVisitas() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Disponibilidade | Godoy Prime Analytics</title>
      </Helmet>

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/visitas")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Disponibilidade de Horários</h1>
            <p className="text-muted-foreground">Defina quando você está disponível para visitas</p>
          </div>
        </div>

        <AvailabilityManager />
      </div>
    </>
  );
}
