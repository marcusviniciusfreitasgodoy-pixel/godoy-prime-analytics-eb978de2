import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PublicSignatureCanvas } from "@/components/visitas/PublicSignatureCanvas";
import { AutorizacaoDocumentoPreview } from "@/components/autorizacoes/AutorizacaoDocumentoPreview";
import { generateAutorizacaoPdf } from "@/utils/autorizacaoPdfExport";
import type { Autorizacao, AutorizacaoFormData } from "@/types/autorizacao";
import { Loader2, FileSignature, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Stage = "loading" | "review" | "signing" | "refusing" | "done" | "refused" | "error" | "expired";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function AutorizacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [stage, setStage] = useState<Stage>("loading");
  const [aut, setAut] = useState<Autorizacao | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [aceitouLgpd, setAceitouLgpd] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-autorizacao-publica?token=${encodeURIComponent(token)}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Erro");
        setAut(j.autorizacao);
        const status = j.autorizacao.status;
        if (status === "assinada") setStage("done");
        else if (status === "recusada") setStage("refused");
        else setStage("review");
      } catch (e: any) {
        setErrorMsg(e?.message || "Não foi possível carregar a autorização.");
        setStage("error");
      }
    })();
  }, [token]);

  const handleAssinar = async (assinaturaB64: string) => {
    if (!token || !aut) return;
    setSubmitting(true);
    try {
      const signedAut: Autorizacao = {
        ...aut,
        assinatura_proprietario: assinaturaB64,
        data_assinatura_proprietario: new Date().toISOString(),
        status: "assinada",
      };
      const blob = await generateAutorizacaoPdf(signedAut);
      const pdfB64 = await blobToBase64(blob);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assinar-autorizacao`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          token,
          acao: "assinar",
          assinatura: assinaturaB64,
          pdf_base64: pdfB64,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao assinar");
      setStage("done");
    } catch (e: any) {
      toast.error("Erro ao assinar", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecusar = async () => {
    if (!token || !motivoRecusa.trim()) {
      toast.error("Por favor, descreva o motivo da recusa.");
      return;
    }
    setSubmitting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assinar-autorizacao`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ token, acao: "recusar", motivo_recusa: motivoRecusa }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro ao recusar");
      setStage("refused");
    } catch (e: any) {
      toast.error("Erro ao recusar", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formData: AutorizacaoFormData | null = aut ? {
    proprietario_nome: aut.proprietario_nome,
    proprietario_cpf: aut.proprietario_cpf,
    proprietario_rg: aut.proprietario_rg || "",
    proprietario_rg_orgao: aut.proprietario_rg_orgao || "",
    proprietario_telefone: aut.proprietario_telefone || "",
    proprietario_email: aut.proprietario_email,
    endereco: aut.endereco,
    numero: aut.numero || "",
    complemento: aut.complemento || "",
    bairro: aut.bairro,
    cidade: aut.cidade,
    cep: aut.cep || "",
    valor_condominio: String(aut.valor_condominio ?? ""),
    valor_iptu: String(aut.valor_iptu ?? ""),
    vagas: aut.vagas ?? 0,
    quartos: aut.quartos ?? 0,
    valor_avaliacao: String(aut.valor_avaliacao),
    valor_venda: String(aut.valor_venda),
    tipo_gestao: aut.tipo_gestao,
    prazo_dias: aut.prazo_dias,
    percentual_honorarios: Number(aut.percentual_honorarios),
  } : null;

  return (
    <>
      <Helmet>
        <title>Autorização de Captação | Godoy Prime</title>
        <meta name="description" content="Revise e assine digitalmente sua autorização de captação." />
      </Helmet>

      <div className="min-h-screen bg-muted/30">
        <header className="bg-[#0C2340] text-white py-4 px-6 shadow-md">
          <div className="container mx-auto flex items-center gap-3">
            <FileSignature className="h-6 w-6 text-[#D4AF37]" />
            <div>
              <h1 className="text-lg font-bold">Godoy Prime</h1>
              <p className="text-xs opacity-80">Autorização de Captação</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
          {stage === "loading" && (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          )}

          {stage === "error" && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-3" />
                <h2 className="text-xl font-semibold">Link inválido ou expirado</h2>
                <p className="text-muted-foreground mt-2">{errorMsg}</p>
              </CardContent>
            </Card>
          )}

          {stage === "done" && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600 mb-3" />
                <h2 className="text-2xl font-semibold">Autorização assinada com sucesso!</h2>
                <p className="text-muted-foreground mt-2">Uma cópia foi enviada para seu corretor.</p>
                {aut?.codigo && <p className="text-xs text-muted-foreground mt-4">Código: {aut.codigo}</p>}
              </CardContent>
            </Card>
          )}

          {stage === "refused" && (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-16 w-16 mx-auto text-red-600 mb-3" />
                <h2 className="text-2xl font-semibold">Autorização recusada</h2>
                <p className="text-muted-foreground mt-2">Sua resposta foi registrada e enviada ao corretor.</p>
              </CardContent>
            </Card>
          )}

          {(stage === "review" || stage === "signing" || stage === "refusing") && aut && formData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Documento para Revisão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-white max-h-[60vh] overflow-y-auto">
                    <AutorizacaoDocumentoPreview
                      data={formData}
                      corretorNome={aut.corretor_nome}
                      corretorCreci={aut.corretor_creci}
                      codigo={aut.codigo}
                      cidade={aut.cidade}
                    />
                  </div>
                </CardContent>
              </Card>

              {stage === "review" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="lgpd"
                        checked={aceitouLgpd}
                        onCheckedChange={(c) => setAceitouLgpd(c === true)}
                      />
                      <Label htmlFor="lgpd" className="text-sm font-normal leading-relaxed">
                        Li e concordo com os termos da autorização de captação e autorizo o tratamento dos meus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).
                      </Label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        className="flex-1"
                        disabled={!aceitouLgpd}
                        onClick={() => setStage("signing")}
                      >
                        <FileSignature className="h-4 w-4 mr-2" /> Assinar Documento
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => setStage("refusing")}>
                        <XCircle className="h-4 w-4 mr-2" /> Recusar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stage === "signing" && (
                <PublicSignatureCanvas
                  title="Assinatura do Proprietário"
                  description="Assine no campo abaixo para confirmar a autorização."
                  onSave={handleAssinar}
                  isSaving={submitting}
                />
              )}

              {stage === "refusing" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recusar Autorização</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="motivo">Motivo da recusa</Label>
                      <Textarea
                        id="motivo"
                        placeholder="Descreva brevemente o motivo..."
                        value={motivoRecusa}
                        onChange={(e) => setMotivoRecusa(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStage("review")} disabled={submitting}>Voltar</Button>
                      <Button variant="destructive" onClick={handleRecusar} disabled={submitting || !motivoRecusa.trim()}>
                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                        Confirmar Recusa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}