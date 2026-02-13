import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Star, TrendingUp, TrendingDown, Minus, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { StandardChartTooltip } from "@/components/ui/chart-tooltip";

interface PairedFeedback {
  ficha_visita_id: string;
  codigo: string;
  nome_visitante: string;
  endereco_imovel: string;
  data_visita: string;
  nome_corretor: string;
  // Client
  avaliacao_geral: number | null;
  nivel_interesse: string | null;
  percepcao_valor: string | null;
  gostaria_fazer_proposta: boolean | null;
  conexao_imovel: number | null;
  // Broker
  respostas: Record<string, any>;
  notas_gerais: string | null;
  proximos_passos: string | null;
}

const INTERESSE_LABEL: Record<string, string> = {
  muito_alto: "Muito Alto",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

const INTERESSE_SCORE: Record<string, number> = {
  muito_alto: 5,
  alto: 4,
  medio: 3,
  baixo: 2,
};

const VALOR_LABEL: Record<string, string> = {
  abaixo: "Abaixo",
  justo: "Justo",
  acima: "Acima",
};

function usePairedFeedbacks() {
  return useQuery({
    queryKey: ["paired-feedbacks"],
    queryFn: async () => {
      // Fetch client feedbacks with ficha info
      const { data: clientFeedbacks, error: clientErr } = await supabase
        .from("feedbacks_visita" as any)
        .select(`
          ficha_visita_id, avaliacao_geral, nivel_interesse, percepcao_valor,
          gostaria_fazer_proposta, conexao_imovel,
          ficha:fichas_visita!ficha_visita_id(id, codigo, nome_visitante, endereco_imovel, data_visita, nome_corretor)
        `)
        .order("created_at", { ascending: false });

      if (clientErr) throw clientErr;

      // Fetch broker feedbacks
      const { data: brokerFeedbacks, error: brokerErr } = await supabase
        .from("feedbacks_corretor" as any)
        .select("ficha_visita_id, respostas, notas_gerais, proximos_passos");

      if (brokerErr) throw brokerErr;

      // Build broker map
      const brokerMap = new Map<string, any>();
      (brokerFeedbacks as any[] || []).forEach((bf: any) => {
        brokerMap.set(bf.ficha_visita_id, bf);
      });

      // Pair them
      const paired: PairedFeedback[] = [];
      for (const cf of (clientFeedbacks as any[] || [])) {
        const broker = brokerMap.get(cf.ficha_visita_id);
        if (!broker) continue;
        const ficha = cf.ficha;
        if (!ficha) continue;

        paired.push({
          ficha_visita_id: cf.ficha_visita_id,
          codigo: ficha.codigo,
          nome_visitante: ficha.nome_visitante,
          endereco_imovel: ficha.endereco_imovel,
          data_visita: ficha.data_visita,
          nome_corretor: ficha.nome_corretor,
          avaliacao_geral: cf.avaliacao_geral,
          nivel_interesse: cf.nivel_interesse,
          percepcao_valor: cf.percepcao_valor,
          gostaria_fazer_proposta: cf.gostaria_fazer_proposta,
          conexao_imovel: cf.conexao_imovel,
          respostas: (broker.respostas as Record<string, any>) || {},
          notas_gerais: broker.notas_gerais,
          proximos_passos: broker.proximos_passos,
        });
      }

      return paired;
    },
  });
}

function getAlignmentIcon(aligned: boolean | null) {
  if (aligned === null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return aligned
    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
    : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
}

function getAlignmentLabel(aligned: boolean | null) {
  if (aligned === null) return "Dados insuficientes";
  return aligned ? "Alinhado" : "Divergente";
}

/** Try to extract a broker "interest" or "qualification" rating from dynamic respostas */
function extractBrokerInterest(respostas: Record<string, any>): number | null {
  // Common field_ids that might represent broker's interest assessment
  const interestKeys = [
    "qualificacao_lead", "interesse_real", "potencial_fechamento",
    "nivel_interesse", "avaliacao_interesse", "interesse",
  ];
  for (const key of interestKeys) {
    const val = respostas[key];
    if (typeof val === "number" && val >= 1 && val <= 5) return val;
  }
  // Check for any rating-like field (1-5)
  for (const [, val] of Object.entries(respostas)) {
    if (typeof val === "number" && val >= 1 && val <= 5) return val;
  }
  return null;
}

export function ClientBrokerComparison() {
  const { data: paired, isLoading } = usePairedFeedbacks();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!paired || paired.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Comparação Cliente × Corretor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma visita com ambos os feedbacks encontrada</p>
            <p className="text-xs mt-1">A comparação aparecerá quando houver feedback do cliente e do corretor para a mesma visita</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build aggregate chart data
  const chartData: { name: string; cliente: number; corretor: number }[] = [];

  // Aggregate client interest scores
  let totalClientInterest = 0;
  let countClientInterest = 0;
  let totalBrokerInterest = 0;
  let countBrokerInterest = 0;
  let totalClientRating = 0;
  let countClientRating = 0;
  let clientProposalYes = 0;
  let clientProposalTotal = 0;
  let clientJusto = 0;
  let clientValorTotal = 0;

  for (const p of paired) {
    if (p.nivel_interesse && INTERESSE_SCORE[p.nivel_interesse]) {
      totalClientInterest += INTERESSE_SCORE[p.nivel_interesse];
      countClientInterest++;
    }
    const brokerInterest = extractBrokerInterest(p.respostas);
    if (brokerInterest !== null) {
      totalBrokerInterest += brokerInterest;
      countBrokerInterest++;
    }
    if (p.avaliacao_geral) {
      totalClientRating += p.avaliacao_geral;
      countClientRating++;
    }
    if (p.gostaria_fazer_proposta !== null) {
      clientProposalTotal++;
      if (p.gostaria_fazer_proposta) clientProposalYes++;
    }
    if (p.percepcao_valor) {
      clientValorTotal++;
      if (p.percepcao_valor === "justo") clientJusto++;
    }
  }

  const avgClientInterest = countClientInterest > 0 ? totalClientInterest / countClientInterest : 0;
  const avgBrokerInterest = countBrokerInterest > 0 ? totalBrokerInterest / countBrokerInterest : 0;
  const avgClientRating = countClientRating > 0 ? totalClientRating / countClientRating : 0;

  if (countClientInterest > 0 || countBrokerInterest > 0) {
    chartData.push({
      name: "Interesse",
      cliente: Number(avgClientInterest.toFixed(1)),
      corretor: Number(avgBrokerInterest.toFixed(1)),
    });
  }

  if (countClientRating > 0) {
    chartData.push({
      name: "Avaliação",
      cliente: Number(avgClientRating.toFixed(1)),
      corretor: Number(avgBrokerInterest.toFixed(1)), // broker closest metric
    });
  }

  // Alignment analysis
  const interestAligned = countClientInterest > 0 && countBrokerInterest > 0
    ? Math.abs(avgClientInterest - avgBrokerInterest) <= 1
    : null;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Comparação Cliente × Corretor
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {paired.length} visita{paired.length !== 1 ? "s" : ""} pareada{paired.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Aggregate metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Avaliação Média (Cliente)</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                {countClientRating > 0 ? avgClientRating.toFixed(1) : "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Interesse Médio (Cliente)</p>
              <p className="text-lg font-bold">
                {countClientInterest > 0 ? avgClientInterest.toFixed(1) + "/5" : "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Avaliação Corretor</p>
              <p className="text-lg font-bold">
                {countBrokerInterest > 0 ? avgBrokerInterest.toFixed(1) + "/5" : "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Alinhamento</p>
              <div className="flex items-center justify-center gap-1.5 text-lg font-bold">
                {getAlignmentIcon(interestAligned)}
                <span className="text-sm">{getAlignmentLabel(interestAligned)}</span>
              </div>
            </div>
          </div>

          {/* Bar chart comparison */}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                <Tooltip content={<StandardChartTooltip labelMap={{ cliente: "Cliente", corretor: "Corretor" }} />} />
                <Legend formatter={(value) => <span className="text-xs">{value === "cliente" ? "Cliente" : "Corretor"}</span>} />
                <Bar dataKey="cliente" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="cliente" />
                <Bar dataKey="corretor" fill="hsl(42 74% 52%)" radius={[4, 4, 0, 0]} name="corretor" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-visit comparison list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhamento por Visita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paired.slice(0, 10).map((p) => {
            const brokerInterest = extractBrokerInterest(p.respostas);
            const clientScore = p.nivel_interesse ? INTERESSE_SCORE[p.nivel_interesse] : null;
            const aligned = clientScore !== null && brokerInterest !== null
              ? Math.abs(clientScore - brokerInterest) <= 1
              : null;

            return (
              <div key={p.ficha_visita_id} className="border rounded-lg p-3 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.nome_visitante}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{p.endereco_imovel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {aligned !== null && (
                      <Badge variant={aligned ? "secondary" : "outline"} className="text-[10px] gap-1">
                        {getAlignmentIcon(aligned)}
                        {aligned ? "Alinhado" : "Divergente"}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {p.data_visita ? format(new Date(p.data_visita), "dd/MM/yy", { locale: ptBR }) : ""}
                    </span>
                  </div>
                </div>

                {/* Side by side */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Client column */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2 space-y-1">
                    <p className="font-semibold text-blue-700 dark:text-blue-400 text-[10px] uppercase tracking-wide">👤 Cliente</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avaliação</span>
                      <span className="font-medium flex items-center gap-0.5">
                        {p.avaliacao_geral ? <><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{p.avaliacao_geral}/5</> : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interesse</span>
                      <span className="font-medium">{p.nivel_interesse ? INTERESSE_LABEL[p.nivel_interesse] || p.nivel_interesse : "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-medium">{p.percepcao_valor ? VALOR_LABEL[p.percepcao_valor] || p.percepcao_valor : "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proposta</span>
                      <span className="font-medium">{p.gostaria_fazer_proposta === null ? "N/A" : p.gostaria_fazer_proposta ? "Sim ✓" : "Não"}</span>
                    </div>
                  </div>

                  {/* Broker column */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-md p-2 space-y-1">
                    <p className="font-semibold text-amber-700 dark:text-amber-400 text-[10px] uppercase tracking-wide">🏢 Corretor</p>
                    {brokerInterest !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Qualificação</span>
                        <span className="font-medium">{brokerInterest}/5</span>
                      </div>
                    )}
                    {Object.entries(p.respostas).slice(0, 3).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground truncate max-w-[60%]">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium truncate max-w-[35%]">
                          {typeof val === "boolean" ? (val ? "Sim" : "Não") :
                           typeof val === "number" ? `${val}/5` :
                           String(val || "—").substring(0, 20)}
                        </span>
                      </div>
                    ))}
                    {p.notas_gerais && (
                      <p className="text-[10px] text-muted-foreground italic line-clamp-2 pt-1 border-t border-amber-200 dark:border-amber-800">
                        {p.notas_gerais}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
