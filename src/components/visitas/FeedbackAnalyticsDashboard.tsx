import { useState } from "react";
import { useFeedbackAnalytics } from "@/hooks/useFeedbackAnalytics";
import { ClientBrokerComparison } from "@/components/visitas/ClientBrokerComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, DollarSign, MessageSquare, TrendingUp, MapPin, Calendar, FileDown, Mail, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { StandardChartTooltip, CHART_COLORS } from "@/components/ui/chart-tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportFeedbackAnalyticsPdf } from "@/utils/feedbackAnalyticsPdfExport";
import { SendPdfEmailDialog, type ReportType } from "@/components/SendPdfEmailDialog";
import { useToast } from "@/hooks/use-toast";

const PIE_COLORS = [
  "hsl(152 76% 36%)", // emerald
  "hsl(217 91% 60%)", // blue
  "hsl(42 74% 52%)",  // amber
  "hsl(0 84% 60%)",   // red
];

const INTEREST_COLORS: Record<string, string> = {
  "Muito Alto": "hsl(152 76% 36%)",
  "Alto": "hsl(142 71% 45%)",
  "Médio": "hsl(42 74% 52%)",
  "Baixo": "hsl(0 84% 60%)",
};

const VALUE_COLORS: Record<string, string> = {
  "Abaixo": "hsl(0 84% 60%)",
  "Justo": "hsl(152 76% 36%)",
  "Acima": "hsl(42 74% 52%)",
};

function KPICard({ icon: Icon, title, value, subtitle, iconColor }: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle?: string;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5" style={iconColor ? { color: iconColor } : undefined} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function FeedbackAnalyticsDashboard() {
  const { data: analytics, isLoading } = useFeedbackAnalytics();
  const [isExporting, setIsExporting] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    if (!analytics) return;
    setIsExporting(true);
    try {
      const doc = await exportFeedbackAnalyticsPdf(analytics);
      doc.save('relatorio-feedbacks-analiticos.pdf');
      toast({ title: 'PDF exportado com sucesso!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGeneratePdfForEmail = async (_reportType: ReportType) => {
    if (!analytics) throw new Error('Sem dados');
    return exportFeedbackAnalyticsPdf(analytics);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalFeedbacks === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum feedback recebido ainda</p>
        <p className="text-sm mt-2">Os feedbacks e gráficos aparecerão aqui após os visitantes responderem</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
          Exportar PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
          <Mail className="h-4 w-4 mr-1" />
          Enviar por Email
        </Button>
      </div>

      <SendPdfEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        generatePdf={handleGeneratePdfForEmail}
        documentType="feedback_analytics"
        pdfFilename="relatorio-feedbacks-analiticos.pdf"
        defaultSubject="Relatório Analítico de Feedbacks de Visitas"
      />
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={Star}
          title="Avaliação Média"
          value={analytics.avgRating.toFixed(1)}
          subtitle={`de ${analytics.totalFeedbacks} avaliações`}
          iconColor="hsl(42 74% 52%)"
        />
        <KPICard
          icon={ThumbsUp}
          title="Taxa de Proposta"
          value={`${analytics.proposalRate.toFixed(0)}%`}
          subtitle="querem fazer proposta"
          iconColor="hsl(152 76% 36%)"
        />
        <KPICard
          icon={DollarSign}
          title="Valor Justo"
          value={`${analytics.justValueRate.toFixed(0)}%`}
          subtitle="consideram preço justo"
          iconColor="hsl(217 91% 60%)"
        />
        <KPICard
          icon={MessageSquare}
          title="Total Feedbacks"
          value={String(analytics.totalFeedbacks)}
          iconColor="hsl(var(--primary))"
        />
      </div>

      {/* Charts row 1: Distribution + Interest + Value */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição de Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analytics.distributionByRating} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nota" width={40} tick={{ fontSize: 12 }} />
                <Tooltip content={<StandardChartTooltip labelMap={{ count: "Feedbacks" }} />} />
                <Bar dataKey="count" fill="hsl(42 74% 52%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Interest distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nível de Interesse</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={analytics.interestDistribution}
                  dataKey="count"
                  nameKey="nivel"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={30}
                  label={CustomPieLabel}
                  labelLine={false}
                >
                  {analytics.interestDistribution.map((entry) => (
                    <Cell key={entry.nivel} fill={INTEREST_COLORS[entry.nivel] || PIE_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip content={<StandardChartTooltip labelMap={{ count: "Feedbacks" }} />} />
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Value perception pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Percepção de Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={analytics.valuePerception}
                  dataKey="count"
                  nameKey="percepcao"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={30}
                  label={CustomPieLabel}
                  labelLine={false}
                >
                  {analytics.valuePerception.map((entry) => (
                    <Cell key={entry.percepcao} fill={VALUE_COLORS[entry.percepcao] || PIE_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip content={<StandardChartTooltip labelMap={{ count: "Feedbacks" }} />} />
                <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Monthly trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução da Satisfação Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.monthlyTrend} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
              <Tooltip content={<StandardChartTooltip labelMap={{ mediaAvaliacao: "Média", totalFeedbacks: "Qtd Feedbacks" }} />} />
              <Line type="monotone" dataKey="mediaAvaliacao" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Média" />
              <Line type="monotone" dataKey="totalFeedbacks" stroke="hsl(42 74% 52%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" name="Qtd" yAxisId={0} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efeitos UAU */}
      {analytics.topEfeitosUau.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">✨ Efeitos UAU mais citados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(120, analytics.topEfeitosUau.length * 32)}>
              <BarChart data={analytics.topEfeitosUau} layout="vertical" margin={{ left: 20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="efeito" width={120} tick={{ fontSize: 11 }} />
                <Tooltip content={<StandardChartTooltip labelMap={{ count: "Citações" }} />} />
                <Bar dataKey="count" fill="hsl(262 83% 58%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent feedbacks compact list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Feedbacks Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics.recentFeedbacks.map((fb) => (
            <div key={fb.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Badge variant="outline" className="shrink-0 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-0.5" />
                  {fb.avaliacao_geral ?? "-"}
                </Badge>
                <div className="min-w-0">
                  <p className="font-medium truncate text-xs">{fb.ficha?.nome_visitante || "Visitante"}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    <span className="truncate">{fb.ficha?.endereco_imovel}</span>
                  </div>
                </div>
              </div>
              {fb.created_at && (
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {format(new Date(fb.created_at), "dd/MM", { locale: ptBR })}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Client vs Broker Comparison */}
      <ClientBrokerComparison />
    </div>
  );
}
