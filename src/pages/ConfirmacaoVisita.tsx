import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck,
  CalendarX,
  CalendarClock,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

type Step =
  | "loading"
  | "menu"
  | "confirmando"
  | "confirmado"
  | "cancelando"
  | "cancelado_oferecer_reagendar"
  | "reagendando"
  | "reagendado"
  | "expirado"
  | "erro";

interface AgendamentoPublico {
  id: string;
  endereco_imovel: string;
  codigo_imovel?: string | null;
  data_hora: string;
  tipo_servico: string;
  status: string;
  nome_visitante: string;
  corretor_id: string | null;
  acao_cliente?: string | null;
}

function formatDateTimeBR(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function tipoServicoLabel(tipo: string) {
  return (
    { visita: "visita", avaliacao: "avaliação", consultoria: "consultoria", fotografia: "fotografia" } as Record<string, string>
  )[tipo] || "visita";
}

export default function ConfirmacaoVisita() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [agendamento, setAgendamento] = useState<AgendamentoPublico | null>(null);
  const [corretorNome, setCorretorNome] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // reschedule state
  const [novaData, setNovaData] = useState<Date | undefined>(undefined);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null);
  const [novoConfirmado, setNovoConfirmado] = useState<AgendamentoPublico | null>(null);

  async function call(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke(
      "public-visita-confirmacao",
      { body: { token, ...body } },
    );
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  useEffect(() => {
    if (!token) {
      setStep("erro");
      setErrorMsg("Link inválido.");
      return;
    }
    (async () => {
      try {
        const data = await call({ action: "info" });
        setAgendamento(data.agendamento);
        setCorretorNome(data.corretor_nome);
        if (data.expirado) {
          setStep("expirado");
          return;
        }
        if (data.agendamento.status === "realizada") {
          setStep("erro");
          setErrorMsg("Esta visita já foi realizada.");
          return;
        }
        setStep("menu");
      } catch (e: any) {
        setStep("erro");
        setErrorMsg(e?.message || "Não foi possível carregar a visita.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleConfirmar() {
    setSubmitting(true);
    try {
      await call({ action: "confirmar" });
      setStep("confirmado");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao confirmar.");
      setStep("erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelar() {
    setSubmitting(true);
    try {
      await call({ action: "cancelar", motivo });
      setStep("cancelado_oferecer_reagendar");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao cancelar.");
      setStep("erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchHorarios(d: Date) {
    if (!agendamento?.corretor_id) {
      setHorarios([]);
      return;
    }
    setHorariosLoading(true);
    setHorarioEscolhido(null);
    try {
      const dataKey = format(d, "yyyy-MM-dd");
      const data = await call({
        action: "horarios",
        corretor_id: agendamento.corretor_id,
        data: dataKey,
      });
      setHorarios(data.horarios || []);
    } catch {
      setHorarios([]);
    } finally {
      setHorariosLoading(false);
    }
  }

  async function handleReagendar() {
    if (!novaData || !horarioEscolhido) return;
    setSubmitting(true);
    try {
      const [hh, mm] = horarioEscolhido.split(":").map(Number);
      // Construct ISO in BRT then convert to UTC
      const dataKey = format(novaData, "yyyy-MM-dd");
      // Build a Date assuming BRT (UTC-3)
      const isoBRT = `${dataKey}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-03:00`;
      const utc = new Date(isoBRT).toISOString();
      const data = await call({ action: "reagendar", nova_data_hora: utc });
      setNovoConfirmado(data.novo_agendamento);
      setStep("reagendado");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao reagendar.");
      setStep("erro");
    } finally {
      setSubmitting(false);
    }
  }

  const dataFormatada = useMemo(
    () => (agendamento ? formatDateTimeBR(agendamento.data_hora) : ""),
    [agendamento],
  );

  return (
    <>
      <Helmet>
        <title>Confirmar Visita | Godoy Prime</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-8">
        <div className="mx-auto max-w-md space-y-4">
          <div className="text-center pb-2">
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#0C2340" }}>
              Godoy Prime
            </h1>
            <p className="text-xs text-muted-foreground">Confirmação de visita</p>
          </div>

          {step === "loading" && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          )}

          {step === "expirado" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" /> Link expirado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Este link de confirmação já não está mais ativo.</p>
                <p>Em caso de dúvidas, entre em contato com seu corretor pelo WhatsApp.</p>
              </CardContent>
            </Card>
          )}

          {step === "erro" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <XCircle className="h-5 w-5" /> Não foi possível continuar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {errorMsg || "Tente novamente em instantes."}
              </CardContent>
            </Card>
          )}

          {(step === "menu" || step === "confirmando") && agendamento && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Olá, {agendamento.nome_visitante}!</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Confirme abaixo a sua {tipoServicoLabel(agendamento.tipo_servico)}:
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>{agendamento.endereco_imovel}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{dataFormatada}</span>
                  </div>
                  {corretorNome && (
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <span>Corretor: {corretorNome}</span>
                    </div>
                  )}
                  {agendamento.status === "confirmada" && (
                    <Badge variant="secondary" className="mt-1">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Já confirmada
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    style={{ backgroundColor: "#0C2340" }}
                    onClick={handleConfirmar}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Confirmar presença
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep("reagendando")}
                    disabled={submitting}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" /> Reagendar
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setStep("cancelando")}
                    disabled={submitting}
                  >
                    <CalendarX className="mr-2 h-4 w-4" /> Cancelar visita
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "confirmado" && agendamento && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#0C2340" }}>
                  <CheckCircle2 className="h-5 w-5" style={{ color: "#D4AF37" }} />
                  Visita confirmada!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Combinado, {agendamento.nome_visitante}. Estamos te esperando:
                </p>
                <div className="rounded-lg border bg-card p-3 capitalize">{dataFormatada}</div>
                <div className="rounded-lg border bg-card p-3">{agendamento.endereco_imovel}</div>
                <p className="text-xs text-muted-foreground pt-2">
                  Você pode fechar esta janela.
                </p>
              </CardContent>
            </Card>
          )}

          {step === "cancelando" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cancelar visita</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Conte rapidamente o motivo (opcional). Após cancelar você poderá escolher uma nova data.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Ex.: imprevisto, mudei de ideia, prefiro outro horário..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep("menu")}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelar}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar visita"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "cancelado_oferecer_reagendar" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <XCircle className="h-5 w-5 text-destructive" /> Visita cancelada
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Quer escolher uma nova data agora?
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  style={{ backgroundColor: "#0C2340" }}
                  onClick={() => setStep("reagendando")}
                >
                  <CalendarClock className="mr-2 h-4 w-4" /> Escolher nova data
                </Button>
                <p className="text-xs text-muted-foreground pt-1 text-center">
                  Ou feche esta janela e entre em contato com o corretor depois.
                </p>
              </CardContent>
            </Card>
          )}

          {step === "reagendando" && agendamento && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Escolha nova data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {corretorNome ? `Disponibilidade de ${corretorNome}` : "Disponibilidade"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={novaData}
                    onSelect={(d) => {
                      setNovaData(d);
                      if (d) fetchHorarios(d);
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={ptBR}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>

                {novaData && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Horários disponíveis</p>
                    {horariosLoading ? (
                      <p className="text-xs text-muted-foreground">Carregando...</p>
                    ) : horarios.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum horário disponível nessa data. Escolha outro dia.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {horarios.map((h) => (
                          <Button
                            key={h}
                            variant={horarioEscolhido === h ? "default" : "outline"}
                            size="sm"
                            onClick={() => setHorarioEscolhido(h)}
                            style={
                              horarioEscolhido === h
                                ? { backgroundColor: "#0C2340" }
                                : undefined
                            }
                          >
                            {h}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep("menu")}
                    disabled={submitting}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: "#0C2340" }}
                    disabled={!novaData || !horarioEscolhido || submitting}
                    onClick={handleReagendar}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Confirmar nova data"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "reagendado" && novoConfirmado && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#0C2340" }}>
                  <CheckCircle2 className="h-5 w-5" style={{ color: "#D4AF37" }} />
                  Visita reagendada!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Sua nova visita está marcada para:</p>
                <div className="rounded-lg border bg-card p-3 capitalize">
                  {formatDateTimeBR(novoConfirmado.data_hora)}
                </div>
                <div className="rounded-lg border bg-card p-3">
                  {novoConfirmado.endereco_imovel}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Você receberá um novo email e WhatsApp confirmando este agendamento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
