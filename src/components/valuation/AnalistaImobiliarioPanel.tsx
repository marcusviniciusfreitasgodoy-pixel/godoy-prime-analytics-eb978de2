import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================================
// Analista Imobiliário — camada de QA (segunda opinião) sobre o laudo.
// Consome a edge function /analista-imobiliario, que por sua vez consulta o
// NÚCLEO oficial (/parecer-nucleo) e roda o LLM com o system prompt literal.
// Aqui apenas EXIBIMOS o rascunho — nenhuma decisão automática.
// ============================================================================

interface Props {
  avaliacaoId?: string | null;
  resultadoMotor?: Record<string, unknown>;
  identificacao: {
    logradouro: string;
    bairro: string;
    numero?: string;
    nome_condominio?: string;
    tipologia?: string;
  };
}

type NucleoFonte = { fonte: string } & Record<string, unknown>;
type Parecer = {
  nucleo?: {
    itbi?: NucleoFonte | null;
    iptu?: NucleoFonte | null;
    territorial?: NucleoFonte | null;
  };
  contexto?: Array<{ sinal: string; fonte: string; data: string }>;
  parecer?: {
    concorda?: "concorda" | "concorda_com_ressalva" | "diverge";
    justificativa?: string;
    lacunas?: string[];
    recomendacao?: "aceitar_resultado" | "revisar_input" | "marcar_especialista";
  };
  status?: string;
};

export function AnalistaImobiliarioPanel({ avaliacaoId, resultadoMotor, identificacao }: Props) {
  const [loading, setLoading] = useState(false);
  const [parecer, setParecer] = useState<Parecer | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const rodarQA = async () => {
    setLoading(true);
    setErro(null);
    setParecer(null);
    try {
      const body: Record<string, unknown> = { identificacao };
      if (avaliacaoId) body.avaliacao_id = avaliacaoId;
      else if (resultadoMotor) body.resultado_motor = resultadoMotor;

      const { data, error } = await supabase.functions.invoke("analista-imobiliario", { body });
      if (error) throw error;
      if (!data) throw new Error("Resposta vazia do Analista");
      setParecer(data as Parecer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
      toast.error("Não foi possível gerar o parecer de QA", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const concordaBadge = (() => {
    const c = parecer?.parecer?.concorda;
    if (c === "concorda") return { label: "Concorda", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300", Icon: CheckCircle2 };
    if (c === "concorda_com_ressalva") return { label: "Concorda com ressalva", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300", Icon: AlertTriangle };
    if (c === "diverge") return { label: "Diverge", cls: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300", Icon: XCircle };
    return null;
  })();

  const recomendacaoLabel = (() => {
    const r = parecer?.parecer?.recomendacao;
    if (r === "aceitar_resultado") return "Aceitar resultado";
    if (r === "revisar_input") return "Revisar inputs";
    if (r === "marcar_especialista") return "Marcar especialista";
    return null;
  })();

  return (
    <Card className="border-2 border-slate-300 dark:border-slate-700">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-slate-300 shrink-0" />
          Analista Imobiliário — QA do laudo
          {parecer?.status && (
            <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wide">
              {parecer.status}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Segunda opinião técnica sobre o resultado do motor, ancorada em dado oficial isolado. Rascunho para revisão humana antes de finalizar o Parecer.
        </p>

        {!parecer && (
          <Button onClick={rodarQA} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Rodar QA do laudo
              </>
            )}
          </Button>
        )}

        {erro && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3 text-xs sm:text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Falha ao gerar parecer</p>
              <p className="opacity-80">{erro}</p>
            </div>
          </div>
        )}

        {parecer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* -------- Bloco NÚCLEO (dado oficial) -------- */}
            <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3 sm:p-4">
              <header className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <h5 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  Núcleo · dado oficial
                </h5>
              </header>
              <div className="space-y-3 text-xs sm:text-sm">
                <NucleoItem
                  titulo="ITBI"
                  data={parecer.nucleo?.itbi as Record<string, unknown> | null | undefined}
                  campos={[
                    ["Média por m²", "med_m2", "brl"],
                    ["Mediana por m²", "mediana_m2", "brl"],
                    ["Transações", "total_transacoes", "num"],
                    ["Período", "periodo", "text"],
                  ]}
                />
                <NucleoItem
                  titulo="IPTU"
                  data={parecer.nucleo?.iptu as Record<string, unknown> | null | undefined}
                  campos={[
                    ["Valor venal", "valor_venal", "brl"],
                    ["Tipologia", "tipologia", "text"],
                  ]}
                />
                <NucleoItem
                  titulo="Territorial"
                  data={parecer.nucleo?.territorial as Record<string, unknown> | null | undefined}
                  campos={[
                    ["Microbairro", "microbairro", "text"],
                    ["Condomínio", "condominio", "text"],
                  ]}
                />
              </div>
            </section>

            {/* -------- Bloco PARECER (opinião + contexto) -------- */}
            <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 sm:p-4">
              <header className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <h5 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  Parecer
                </h5>
                {concordaBadge && (
                  <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${concordaBadge.cls}`}>
                    <concordaBadge.Icon className="h-3 w-3" />
                    {concordaBadge.label}
                  </span>
                )}
              </header>

              {parecer.parecer?.justificativa && (
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-foreground">
                  {parecer.parecer.justificativa}
                </p>
              )}

              {parecer.parecer?.lacunas && parecer.parecer.lacunas.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">
                    Lacunas declaradas
                  </p>
                  <ul className="text-xs sm:text-sm space-y-1">
                    {parecer.parecer.lacunas.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-600 shrink-0">•</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recomendacaoLabel && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">Recomendação</p>
                  <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
                    {recomendacaoLabel}
                  </p>
                </div>
              )}

              {parecer.contexto && parecer.contexto.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">
                    Contexto · sinais de mercado
                  </p>
                  <ul className="text-xs space-y-1">
                    {parecer.contexto.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.sinal}</span>
                        <span className="text-muted-foreground"> — {c.fonte} · {c.data}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <div className="lg:col-span-2 flex flex-wrap items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={rodarQA} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
                Rodar novamente
              </Button>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Rascunho técnico. Nenhuma exportação a cliente é feita automaticamente.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

type Campo = [label: string, key: string, kind: "brl" | "num" | "text"];

function NucleoItem({
  titulo,
  data,
  campos,
}: {
  titulo: string;
  data?: Record<string, unknown> | null;
  campos: Campo[];
}) {
  if (!data) {
    return (
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{titulo}</p>
        <p className="text-xs text-muted-foreground">Sem dado no núcleo.</p>
      </div>
    );
  }
  const fonte = typeof data.fonte === "string" ? data.fonte : null;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{titulo}</p>
        {fonte && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
            fonte: {fonte}
          </span>
        )}
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
        {campos.map(([label, key, kind]) => {
          const v = data[key];
          return (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{formatar(v, kind)}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function formatar(v: unknown, kind: "brl" | "num" | "text"): string {
  if (v === null || v === undefined || v === "") return "—";
  if (kind === "brl" && typeof v === "number") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  }
  if (kind === "num" && typeof v === "number") {
    return new Intl.NumberFormat("pt-BR").format(v);
  }
  return String(v);
}
