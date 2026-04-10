import { useState } from "react";
import { FichaVisita, AgendamentoVisita } from "@/types/visitas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VisitStatusBadge } from "./VisitStatusBadge";
import { BrokerFeedbackModal } from "./BrokerFeedbackModal";
import { format, differenceInCalendarDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, User, Phone, Calendar, Eye, FileText, XCircle, FilePlus, Mail, Clock, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface VisitCardProps {
  ficha?: FichaVisita;
  agendamento?: AgendamentoVisita;
  type: "ficha" | "agendamento";
  onCreateFicha?: (agendamento: AgendamentoVisita) => void;
}

export function VisitCard({ ficha, agendamento, type, onCreateFicha }: VisitCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [brokerFeedbackOpen, setBrokerFeedbackOpen] = useState(false);

  const handleCancelAgendamento = async (id: string, agendamentoData?: AgendamentoVisita) => {
    try {
      const { error } = await supabase
        .from('agendamentos_visita')
        .update({ status: 'cancelada' as const })
        .eq('id', id);
      
      if (error) throw error;

      // Auto-cancelar ficha vinculada
      try {
        const { data: fichaVinculada } = await supabase
          .from('fichas_visita' as any)
          .select('id')
          .eq('agendamento_id', id)
          .maybeSingle();
        if (fichaVinculada) {
          await supabase
            .from('fichas_visita' as any)
            .update({ status: 'cancelada' as const })
            .eq('id', (fichaVinculada as any).id);
          queryClient.invalidateQueries({ queryKey: ['fichas-visita'] });
        }
      } catch (fichaErr) {
        console.error('Erro ao cancelar ficha vinculada:', fichaErr);
      }
      
      // Enviar e-mail de cancelamento se tiver email do visitante
      if (agendamentoData?.email_visitante) {
        try {
          await supabase.functions.invoke('send-visit-email', {
            body: {
              type: 'agendamento_cancelado',
              to: agendamentoData.email_visitante,
              data: {
                nome_visitante: agendamentoData.nome_visitante,
                endereco_imovel: agendamentoData.endereco_imovel,
                data_hora: agendamentoData.data_hora,
                telefone_visitante: agendamentoData.telefone_visitante,
              },
              sendToAgency: true,
            },
          });
        } catch (emailErr) {
          console.error('Erro ao enviar e-mail de cancelamento:', emailErr);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['agendamentos-visita'] });
      toast.success('Agendamento cancelado com sucesso');
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const handleViewFicha = async (agendamentoId: string) => {
    try {
      const { data: fichaVinculada } = await supabase
        .from('fichas_visita' as any)
        .select('id')
        .eq('agendamento_id', agendamentoId)
        .maybeSingle();
      if (fichaVinculada) {
        navigate(`/visitas/ficha/${(fichaVinculada as any).id}`);
      } else {
        toast.info('Ficha não encontrada para este agendamento');
      }
    } catch (err) {
      console.error('Erro ao buscar ficha:', err);
    }
  };

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
            {ficha.status === 'realizada' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBrokerFeedbackOpen(true)}
                title="Feedback do Corretor"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/visitas/feedback/${ficha.codigo}`)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>

          <BrokerFeedbackModal
            open={brokerFeedbackOpen}
            onOpenChange={setBrokerFeedbackOpen}
            fichaVisitaId={ficha.id}
            fichaLabel={`${ficha.nome_visitante} — ${ficha.endereco_imovel}`}
          />
        </CardContent>
      </Card>
    );
  }

  if (type === "agendamento" && agendamento) {
    const isCancelled = agendamento.status === 'cancelada';
    const now = new Date();
    const visitDate = new Date(agendamento.data_hora);
    const daysUntil = differenceInCalendarDays(visitDate, now);
    const hoursUntil = differenceInHours(visitDate, now);
    const isUrgent = hoursUntil >= 0 && hoursUntil <= 24 && !isCancelled;

    const getProximityBadge = () => {
      if (isCancelled || visitDate < now) return null;
      if (daysUntil === 0) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><Clock className="h-3 w-3 mr-0.5" />Hoje</Badge>;
      if (daysUntil === 1) return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600"><Clock className="h-3 w-3 mr-0.5" />Amanhã</Badge>;
      if (daysUntil <= 7) return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Em {daysUntil} dias</Badge>;
      return null;
    };
    
    return (
      <Card className={`hover:shadow-md transition-shadow ${isCancelled ? 'opacity-60' : ''} ${isUrgent ? 'ring-1 ring-amber-400/50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{agendamento.nome_visitante}</CardTitle>
              {getProximityBadge()}
            </div>
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

          {agendamento.email_visitante && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{agendamento.email_visitante}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!isCancelled && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/visitas/agendar?edit=${agendamento.id}`)}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewFicha(agendamento.id)}
                  title="Ver Ficha de Visita"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Ficha</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleCancelAgendamento(agendamento.id, agendamento)}
                  title="Cancelar agendamento"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            {isCancelled && (
              <span className="text-sm text-muted-foreground italic">Cancelado</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
