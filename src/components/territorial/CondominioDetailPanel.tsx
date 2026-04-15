import { useMemo } from "react";
import { X, ExternalLink, Building2, MapPin, Ruler, DollarSign, BarChart3, AlertCircle, Info, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useCondoItbiHistory, useTorresByCondominio, type TerritorialCondominio } from "@/hooks/useTerritorialData";
import { useNavigate } from "react-router-dom";

const PLACEHOLDER_PATTERNS = /não identificad|não cadastrad|não localizad|falhou/i;

function getCondoDisplayName(c: TerritorialCondominio): string {
  if (c.nome_condominio && !PLACEHOLDER_PATTERNS.test(c.nome_condominio)) {
    return c.nome_condominio;
  }
  if (c.logradouro_padrao && !PLACEHOLDER_PATTERNS.test(c.logradouro_padrao)) {
    return c.logradouro_padrao;
  }
  if (c.latitude && c.longitude) {
    return `📍 ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`;
  }
  return "Condomínio sem identificação";
}

interface CondominioDetailPanelProps {
  condominio: TerritorialCondominio;
  onClose: () => void;
}

export function CondominioDetailPanel({ condominio: c, onClose }: CondominioDetailPanelProps) {
  const navigate = useNavigate();
  const { data: history, isLoading: historyLoading } = useCondoItbiHistory(c.latitude, c.longitude);
  const { data: torres } = useTorresByCondominio(c.id);

  const chartData = useMemo(() => {
    if (!history) return [];
    return history.map((h: any) => ({
      name: h.periodo,
      preco: h.preco_medio_m2,
      transacoes: h.transacoes,
      agrupamento: h.agrupamento ?? "trimestral",
    }));
  }, [history]);

  const hasItbi = c.total_transacoes_itbi != null && c.total_transacoes_itbi > 0;
  const conf = c.confianca_identificacao ?? 0;

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate text-base">
            {getCondoDisplayName(c)}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.logradouro_padrao}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {c.fonte_identificacao && (
              <Badge variant="outline" className="text-[10px]">{c.fonte_identificacao}</Badge>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] ${conf >= 0.8 ? "border-green-500 text-green-600" : conf >= 0.5 ? "border-yellow-500 text-yellow-600" : ""}`}
            >
              {(conf * 100).toFixed(0)}% confiança
            </Badge>
          </div>
          {c.fonte_identificacao === "algoritmo_pal" && (
            <div className="flex items-start gap-1.5 mt-2 p-2 bg-muted/50 rounded-md">
              <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Identificado por algoritmo — dados de torres e unidades podem representar edificações individuais (casas) e necessitar de revisão manual.
              </p>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Dados físicos */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Dados Físicos
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: c.fonte_identificacao === "algoritmo_pal" && !c.padrao_construtivo ? "Edificações" : "Torres", value: c.numero_torres ?? "—" },
                { label: "Unidades est.", value: c.unidades_estimadas?.toLocaleString("pt-BR") ?? "—" },
                { label: "Área lote", value: c.area_lote ? `${c.area_lote.toLocaleString("pt-BR")} m²` : "—" },
                { label: "Área construída", value: c.area_total_construida ? `${c.area_total_construida.toLocaleString("pt-BR")} m²` : "—" },
                { label: "Valor venal", value: c.valor_venal_estimado ? `R$ ${c.valor_venal_estimado.toLocaleString("pt-BR")}` : "—" },
                { label: "Padrão", value: c.padrao_construtivo ?? "—" },
              ].map((item) => (
                <div key={item.label} className="bg-muted/50 rounded-md p-2">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              <MapPin className="inline h-3 w-3" /> {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
            </p>
          </section>

          {/* Histórico ITBI */}
          {hasItbi && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Histórico de Preços ITBI
              </h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Card className="bg-accent/10 border-accent/20">
                  <CardContent className="p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">R$/m²</p>
                    <p className="text-sm font-bold text-accent">
                      {c.preco_medio_m2?.toLocaleString("pt-BR")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Transações</p>
                    <p className="text-sm font-bold">{c.total_transacoes_itbi}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Última</p>
                    <p className="text-sm font-bold">
                      {c.ultima_transacao_itbi
                        ? new Date(c.ultima_transacao_itbi).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              {historyLoading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">Carregando...</div>
              ) : chartData.length >= 2 ? (
                <div>
                  {chartData[0]?.agrupamento === "anual" && (
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Agrupamento anual — poucos dados trimestrais disponíveis
                    </p>
                  )}
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === "preco") return [`R$ ${value.toLocaleString("pt-BR")}/m²`, "Preço"];
                            return [value, "Transações"];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="preco"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "hsl(var(--accent))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : chartData.length === 1 ? (
                <div className="border border-border rounded-md p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Preço registrado</p>
                  <p className="text-lg font-bold text-accent">
                    R$ {Number(chartData[0].preco).toLocaleString("pt-BR")}/m²
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {chartData[0].transacoes} transação(ões)
                  </p>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border rounded-md">
                  <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                  Sem transações ITBI neste endereço nos últimos 5 anos
                </div>
              )}
            </section>
          )}

          {/* Torres */}
          {torres && torres.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Torres ({torres.length})
              </h4>
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8 px-2">Torre</TableHead>
                      <TableHead className="text-xs h-8 px-2">Andares</TableHead>
                      <TableHead className="text-xs h-8 px-2">Un. est.</TableHead>
                      <TableHead className="text-xs h-8 px-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help">
                              Projeção (m²) <Info className="h-3 w-3 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            Área da projeção da torre no solo (footprint). A área construída total é aprox. este valor × nº de andares.
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-xs h-8 px-2">Área total est.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {torres.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs px-2 py-1.5">{t.nome_torre || `Torre ${t.numero_torre}`}</TableCell>
                        <TableCell className="text-xs px-2 py-1.5">{t.andares ?? "—"}</TableCell>
                        <TableCell className="text-xs px-2 py-1.5">{t.unidades_estimadas ?? "—"}</TableCell>
                        <TableCell className="text-xs px-2 py-1.5">{t.area_footprint?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell className="text-xs px-2 py-1.5">
                          {t.area_footprint && t.andares
                            ? (t.area_footprint * t.andares).toLocaleString("pt-BR")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </section>
          )}

          {/* Ações */}
          <section className="space-y-2 pt-2">
            <Button
              className="w-full"
              onClick={() => navigate(`/avaliacao-imobiliaria?logradouro=${encodeURIComponent(c.logradouro_padrao)}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Avaliação
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/pesquisas-mercado?busca=${encodeURIComponent(c.logradouro_padrao)}`)}
            >
              Pesquisar no Mercado
            </Button>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
