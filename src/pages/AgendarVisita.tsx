import { Helmet } from "react-helmet-async";
import { ScheduleForm } from "@/components/visitas/ScheduleForm";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AgendarVisita() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Agendar Visita | Godoy Prime Analytics</title>
      </Helmet>

      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/visitas")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <ScheduleForm onSuccess={() => navigate("/visitas")} />
      </div>
    </>
  );
}
