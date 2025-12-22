import { FichaVisita, AgendamentoVisita } from "@/types/visitas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VisitStatusBadge } from "./VisitStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, User, Phone, Calendar, Eye, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VisitCardProps {
  ficha?: FichaVisita;
  agendamento?: AgendamentoVisita;
  type: "ficha" | "agendamento";
}

export function VisitCard({ ficha, agendamento, type }: VisitCardProps) {
  const navigate = useNavigate();

  if (type === "ficha" && ficha) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{ficha.nome_visitante}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">{ficha.codigo}</p>
            </div>
            <VisitStatusBadge status={ficha.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{ficha.endereco_imovel}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(ficha.data_visita), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Corretor: {ficha.nome_corretor}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate(`/visitas/ficha/${ficha.id}`)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/visitas/feedback/${ficha.codigo}`)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "agendamento" && agendamento) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{agendamento.nome_visitante}</CardTitle>
            <VisitStatusBadge status={agendamento.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{agendamento.endereco_imovel}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(agendamento.data_hora), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{agendamento.telefone_visitante}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate(`/visitas/agendar?edit=${agendamento.id}`)}
            >
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
