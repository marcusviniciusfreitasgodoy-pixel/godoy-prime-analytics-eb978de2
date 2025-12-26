import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicSignatureCanvas } from "@/components/visitas/PublicSignatureCanvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FichaVisita } from "@/types/visitas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle2,
  Building2,
  ArrowLeft,
  FileSignature
} from "lucide-react";
import { toast } from "sonner";

type SignatureType = "visitante" | "corretor";

export default function AssinaturaVisita() {
  const { codigo, tipo } = useParams<{ codigo: string; tipo: string }>();
  const navigate = useNavigate();
  
  const [ficha, setFicha] = useState<FichaVisita | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assinado, setAssinado] = useState(false);

  const signatureType: SignatureType = tipo === "corretor" ? "corretor" : "visitante";

  useEffect(() => {
    const fetchFicha = async () => {
      if (!codigo) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("fichas_visita")
          .select("*")
          .eq("codigo", codigo)
          .single();

        if (error) throw error;
        
        const fichaData = data as unknown as FichaVisita;
        setFicha(fichaData);

        // Verificar se já está assinado
        const field = signatureType === "visitante" 
          ? fichaData.assinatura_visitante 
          : fichaData.assinatura_corretor;
        
        if (field) {
          setAssinado(true);
        }
      } catch (error) {
        console.error("Erro ao buscar ficha:", error);
        setFicha(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFicha();
  }, [codigo, signatureType]);

  const handleSaveSignature = async (signatureData: string) => {
    if (!ficha) return;

    setSaving(true);
    try {
      const field = signatureType === "visitante" 
        ? "assinatura_visitante" 
        : "assinatura_corretor";

      const { error } = await supabase
        .from("fichas_visita")
        .update({ [field]: signatureData })
        .eq("id", ficha.id);

      if (error) throw error;

      setAssinado(true);
      toast.success("Assinatura salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      toast.error("Erro ao salvar assinatura. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ficha) {
    return (
      <>
        <Helmet>
          <title>Visita não encontrada | Godoy Prime</title>
        </Helmet>
        <main className="min-h-screen bg-background p-6">
          <section className="mx-auto max-w-lg">
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <FileSignature className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-xl font-semibold">Visita não encontrada</h1>
                <p className="text-muted-foreground">
                  O código da visita informado não foi encontrado. Verifique se o link está correto.
                </p>
                <Button onClick={() => navigate("/visitas/assinatura")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tentar outro código
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </>
    );
  }

  if (assinado) {
    return (
      <>
        <Helmet>
          <title>Assinatura Confirmada | Godoy Prime</title>
        </Helmet>
        <main className="min-h-screen bg-background p-6">
          <section className="mx-auto max-w-lg">
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-xl font-semibold text-green-600">
                  Assinatura Registrada!
                </h1>
                <p className="text-muted-foreground">
                  {signatureType === "visitante" 
                    ? "Sua assinatura foi registrada com sucesso na ficha de visita."
                    : "A assinatura do corretor foi registrada com sucesso."
                  }
                </p>
                <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{ficha.endereco_imovel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Código: {ficha.codigo}
                </p>
              </CardContent>
            </Card>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Assinar Ficha de Visita | Godoy Prime</title>
        <meta 
          name="description" 
          content="Assine digitalmente a ficha de visita do imóvel." 
        />
      </Helmet>

      <main className="min-h-screen bg-background p-4 md:p-6">
        <section className="mx-auto max-w-2xl space-y-6">
          <h1 className="sr-only">Assinatura digital da visita</h1>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Assinatura Digital</h2>
            <p className="text-muted-foreground">
              {signatureType === "visitante" 
                ? "Registre sua assinatura na ficha de visita"
                : "Registre a assinatura do corretor"
              }
            </p>
          </div>

          {/* Dados da Visita */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Dados da Visita
              </CardTitle>
              <CardDescription>
                Confira os dados antes de assinar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Imóvel</p>
                    <p className="font-medium">{ficha.endereco_imovel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Visita</p>
                    <p className="font-medium">
                      {format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {signatureType === "visitante" ? "Visitante" : "Corretor"}
                    </p>
                    <p className="font-medium">
                      {signatureType === "visitante" ? ficha.nome_visitante : ficha.nome_corretor}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Código:</strong> {ficha.codigo}</p>
                {signatureType === "visitante" && (
                  <p><strong>CPF:</strong> {ficha.cpf_visitante}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Canvas de Assinatura */}
          <PublicSignatureCanvas
            title={signatureType === "visitante" ? "Sua Assinatura" : "Assinatura do Corretor"}
            description="Desenhe sua assinatura no campo abaixo"
            onSave={handleSaveSignature}
            isSaving={saving}
          />

          {/* Termos */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground text-center">
                Ao assinar, você declara que visitou o imóvel acima por intermédio da 
                <strong> Godoy Prime Realty</strong> e está ciente dos termos da ficha de visita, 
                conforme Lei 6.530/78.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
