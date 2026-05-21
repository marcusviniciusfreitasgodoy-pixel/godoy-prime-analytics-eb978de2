import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalForm } from "@/components/visitas/ProposalForm";
import { PropostaPreFill } from "@/types/proposta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, User } from "lucide-react";

export default function PropostaPublica() {
  const { codigo } = useParams<{ codigo: string }>();
  const [preFill, setPreFill] = useState<PropostaPreFill>({});
  const [loading, setLoading] = useState(true);
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    const loadFicha = async () => {
      if (!codigo || codigo === "novo") {
        setLoading(false);
        return;
      }

      // Buscar dados da ficha pelo código para pré-preencher
      const { data: ficha } = await supabase
        .rpc("get_ficha_by_codigo", { p_codigo: codigo }) as any;

      if (ficha && ficha.length > 0) {
        const f = ficha[0];
        setPreFill({
          ficha_visita_id: f.id,
          nome_completo: f.nome_visitante,
          cpf_cnpj: f.cpf_visitante,
          telefone: f.telefone_visitante,
          email: f.email_visitante,
          endereco_resumido: f.endereco_imovel,
          organization_id: f.organization_id,
        });
        setEndereco(f.endereco_imovel || "");
      }

      setLoading(false);
    };

    loadFicha();
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Proposta de Compra | Godoy Prime</title>
        <meta name="description" content="Visualize e assine sua proposta de compra de imóvel com a Godoy Prime Realty de forma segura e digital." />
        <link rel="canonical" href="https://analytics.godoyprime.com.br/proposta" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Proposta de Compra | Godoy Prime" />
        <meta property="og:description" content="Visualize e assine sua proposta de compra de imóvel com a Godoy Prime Realty." />
        <meta property="og:url" content="https://analytics.godoyprime.com.br/proposta" />
        <meta property="og:site_name" content="Godoy Prime Realty" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Proposta de Compra</CardTitle>
            </CardHeader>
            {endereco && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{endereco}</span>
                </div>
              </CardContent>
            )}
          </Card>

          <ProposalForm preFill={preFill} standalone />
        </div>
      </div>
    </>
  );
}
