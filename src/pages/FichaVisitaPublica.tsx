import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Calendar, User, Building2, FileText, CheckCircle2, XCircle, ClipboardList, PenTool } from "lucide-react";

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  agendada: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-blue-100 text-blue-800",
  realizada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function FichaVisitaPublica() {
  const { codigo } = useParams<{ codigo: string }>();

  const { data: ficha, isLoading, error } = useQuery({
    queryKey: ["ficha-publica", codigo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ficha_publica", { p_codigo: codigo! });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Ficha não encontrada");
      return data[0];
    },
    enabled: !!codigo,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-3">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Ficha não encontrada</h2>
            <p className="text-sm text-muted-foreground">
              O código informado não corresponde a nenhuma ficha de visita.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const baseUrl = window.location.origin;
  const dataFormatada = ficha.data_visita
    ? format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : "—";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Ficha de Visita</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-sm font-mono">{ficha.codigo}</Badge>
            <Badge className={statusColors[ficha.status] || ""}>{statusLabels[ficha.status] || ficha.status}</Badge>
          </div>
        </div>

        {/* Dados do Imóvel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Dados do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{ficha.endereco_imovel}</span>
            </div>
            {ficha.condominio_edificio && (
              <p><span className="text-muted-foreground">Condomínio:</span> {ficha.condominio_edificio}</p>
            )}
            {ficha.unidade_imovel && (
              <p><span className="text-muted-foreground">Unidade:</span> {ficha.unidade_imovel}</p>
            )}
            {ficha.codigo_imovel && (
              <p><span className="text-muted-foreground">Código:</span> {ficha.codigo_imovel}</p>
            )}
            {ficha.valor_imovel && (
              <p><span className="text-muted-foreground">Valor:</span> R$ {Number(ficha.valor_imovel).toLocaleString("pt-BR")}</p>
            )}
            {ficha.nome_proprietario && (
              <p><span className="text-muted-foreground">Proprietário:</span> {ficha.nome_proprietario}</p>
            )}
          </CardContent>
        </Card>

        {/* Dados da Visita */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Dados da Visita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Data:</span> {dataFormatada}</p>
            <p><span className="text-muted-foreground">Visitante:</span> {ficha.nome_visitante}</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Corretor:</span> {ficha.nome_corretor}
            </div>
            {ficha.observacoes && (
              <div className="pt-2">
                <p className="text-muted-foreground mb-1">Observações:</p>
                <p className="bg-muted/50 p-2 rounded text-xs">{ficha.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assinaturas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Assinatura do Visitante</span>
              {ficha.tem_assinatura_visitante ? (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Coletada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Pendente</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Assinatura do Corretor</span>
              {ficha.tem_assinatura_corretor ? (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Coletada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Pendente</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!ficha.tem_assinatura_visitante && (
            <Button asChild className="flex-1" variant="default">
              <a href={`${baseUrl}/visitas/assinatura/${ficha.codigo}/visitante`}>
                <PenTool className="h-4 w-4 mr-2" /> Assinar Ficha
              </a>
            </Button>
          )}
          <Button asChild className="flex-1" variant="outline">
            <a href={`${baseUrl}/visitas/feedback/${ficha.codigo}`}>
              <ClipboardList className="h-4 w-4 mr-2" /> Enviar Feedback
            </a>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Esta é uma página de acesso restrito ao visitante desta ficha.
        </p>
      </div>
    </div>
  );
}
