import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Calendar, FileDown, Loader2, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportFeedbackIndividualPdf } from "@/utils/feedbackIndividualPdfExport";
import { useToast } from "@/hooks/use-toast";

export interface FeedbackDetail {
  id: string;
  avaliacao_geral: number | null;
  conexao_imovel: number | null;
  nivel_interesse: string | null;
  percepcao_valor: string | null;
  o_que_mais_gostou: string | null;
  o_que_menos_gostou: string | null;
  o_que_alteraria: string | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  ponto_resistencia: string | null;
  sugestoes_melhoria: string | null;
  gostaria_fazer_proposta: boolean | null;
  compraria_imovel: boolean | null;
  atende_necessidades: boolean | null;
  valor_ofertaria: number | null;
  forma_pagamento: string | null;
  sinal_entrada: number | null;
  valor_financiado: number | null;
  efeito_uau: string[] | null;
  efeito_uau_detalhe: string | null;
  campos_customizados: Record<string, unknown> | null;
  created_at: string | null;
  ficha?: {
    codigo: string;
    nome_visitante: string;
    endereco_imovel: string;
    data_visita: string;
    nome_corretor?: string;
    valor_imovel?: number | null;
  };
}

const INTERESSE_MAP: Record<string, string> = {
  muito_alto: "Muito Alto",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

const PERCEPCAO_MAP: Record<string, string> = {
  abaixo: "Abaixo do mercado",
  justo: "Justo",
  acima: "Acima do mercado",
};

const INTERESSE_COLOR: Record<string, string> = {
  muito_alto: "bg-emerald-500",
  alto: "bg-green-500",
  medio: "bg-yellow-500",
  baixo: "bg-red-500",
};

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">({value}/5)</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-primary border-b pb-1">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
      <span className="font-medium text-muted-foreground min-w-[140px]">{label}:</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

function CommentBox({ label, text, variant }: { label: string; text: string; variant: "positive" | "negative" | "neutral" }) {
  const bg = variant === "positive"
    ? "bg-emerald-50 dark:bg-emerald-950/30"
    : variant === "negative"
    ? "bg-red-50 dark:bg-red-950/30"
    : "bg-muted/50";
  const emoji = variant === "positive" ? "👍" : variant === "negative" ? "👎" : "💬";

  return (
    <div className={`${bg} p-2.5 rounded-lg text-xs`}>
      <p className="font-medium mb-1">{emoji} {label}</p>
      <p className="text-muted-foreground whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: FeedbackDetail | null;
}

export function FeedbackDetailModal({ open, onOpenChange, feedback }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  if (!feedback) return null;

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const doc = await exportFeedbackIndividualPdf(feedback);
      const code = feedback.ficha?.codigo || "feedback";
      doc.save(`feedback-${code}.pdf`);
      toast({ title: "PDF exportado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base">
              Feedback — {feedback.ficha?.codigo || "N/A"}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Visit data */}
          <Section title="Dados da Visita">
            <Field label="Visitante" value={feedback.ficha?.nome_visitante} />
            {feedback.ficha?.endereco_imovel && (
              <Field label="Imóvel" value={
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{feedback.ficha.endereco_imovel}</span>
              } />
            )}
            {feedback.ficha?.data_visita && (
              <Field label="Data" value={
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 shrink-0" />{format(new Date(feedback.ficha.data_visita), "dd/MM/yyyy", { locale: ptBR })}</span>
              } />
            )}
            {feedback.ficha?.nome_corretor && <Field label="Corretor" value={feedback.ficha.nome_corretor} />}
            {feedback.ficha?.valor_imovel && <Field label="Valor" value={formatCurrency(feedback.ficha.valor_imovel)} />}
            {feedback.created_at && (
              <Field label="Enviado em" value={format(new Date(feedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
            )}
          </Section>

          {/* Ratings */}
          <Section title="Avaliações">
            {feedback.avaliacao_geral != null && (
              <Field label="Avaliação Geral" value={<RatingStars value={feedback.avaliacao_geral} />} />
            )}
            {feedback.conexao_imovel != null && (
              <Field label="Conexão com imóvel" value={<RatingStars value={feedback.conexao_imovel} />} />
            )}
            {feedback.nivel_interesse && (
              <Field label="Nível de Interesse" value={
                <Badge variant="secondary" className="text-xs">
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${INTERESSE_COLOR[feedback.nivel_interesse] || "bg-muted"}`} />
                  {INTERESSE_MAP[feedback.nivel_interesse] || feedback.nivel_interesse}
                </Badge>
              } />
            )}
            {feedback.percepcao_valor && (
              <Field label="Percepção de Valor" value={PERCEPCAO_MAP[feedback.percepcao_valor] || feedback.percepcao_valor} />
            )}
            {feedback.atende_necessidades != null && (
              <Field label="Atende necessidades" value={feedback.atende_necessidades ? "Sim ✅" : "Não ❌"} />
            )}
            {feedback.compraria_imovel != null && (
              <Field label="Compraria o imóvel" value={feedback.compraria_imovel ? "Sim ✅" : "Não ❌"} />
            )}
          </Section>

          {/* Comments */}
          {(feedback.o_que_mais_gostou || feedback.o_que_menos_gostou || feedback.o_que_alteraria || feedback.pontos_positivos || feedback.pontos_negativos || feedback.ponto_resistencia || feedback.sugestoes_melhoria) && (
            <Section title="Comentários">
              <div className="grid grid-cols-1 gap-2">
                {feedback.o_que_mais_gostou && <CommentBox label="O que mais gostou" text={feedback.o_que_mais_gostou} variant="positive" />}
                {feedback.pontos_positivos && <CommentBox label="Pontos positivos" text={feedback.pontos_positivos} variant="positive" />}
                {feedback.o_que_menos_gostou && <CommentBox label="O que menos gostou" text={feedback.o_que_menos_gostou} variant="negative" />}
                {feedback.pontos_negativos && <CommentBox label="Pontos negativos" text={feedback.pontos_negativos} variant="negative" />}
                {feedback.ponto_resistencia && <CommentBox label="Ponto de resistência" text={feedback.ponto_resistencia} variant="negative" />}
                {feedback.o_que_alteraria && <CommentBox label="O que alteraria" text={feedback.o_que_alteraria} variant="neutral" />}
                {feedback.sugestoes_melhoria && <CommentBox label="Sugestões de melhoria" text={feedback.sugestoes_melhoria} variant="neutral" />}
              </div>
            </Section>
          )}

          {/* Efeitos UAU */}
          {feedback.efeito_uau && feedback.efeito_uau.length > 0 && (
            <Section title="✨ Efeitos UAU">
              <div className="flex flex-wrap gap-1.5">
                {feedback.efeito_uau.map((e) => (
                  <Badge key={e} variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />{e}
                  </Badge>
                ))}
              </div>
              {feedback.efeito_uau_detalhe && (
                <p className="text-xs text-muted-foreground mt-1">{feedback.efeito_uau_detalhe}</p>
              )}
            </Section>
          )}

          {/* Proposal */}
          <Section title="Interesse e Proposta">
            {feedback.gostaria_fazer_proposta != null && (
              <Field label="Quer fazer proposta" value={
                <Badge variant={feedback.gostaria_fazer_proposta ? "default" : "secondary"} className="text-xs">
                  {feedback.gostaria_fazer_proposta ? <><ThumbsUp className="h-3 w-3 mr-1" />Sim</> : <><ThumbsDown className="h-3 w-3 mr-1" />Não</>}
                </Badge>
              } />
            )}
            {feedback.valor_ofertaria != null && <Field label="Valor que ofertaria" value={formatCurrency(feedback.valor_ofertaria)} />}
            {feedback.forma_pagamento && <Field label="Forma de pagamento" value={feedback.forma_pagamento} />}
            {feedback.sinal_entrada != null && <Field label="Sinal / Entrada" value={formatCurrency(feedback.sinal_entrada)} />}
            {feedback.valor_financiado != null && <Field label="Valor financiado" value={formatCurrency(feedback.valor_financiado)} />}
          </Section>

          {/* Custom fields */}
          {feedback.campos_customizados && Object.keys(feedback.campos_customizados).length > 0 && (
            <Section title="Campos Customizados">
              {Object.entries(feedback.campos_customizados).map(([key, val]) => (
                <Field key={key} label={key} value={String(val ?? "")} />
              ))}
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
