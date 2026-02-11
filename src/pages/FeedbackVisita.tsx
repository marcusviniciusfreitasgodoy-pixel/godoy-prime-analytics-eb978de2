import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FeedbackForm } from "@/components/visitas/FeedbackForm";
import { useVisitas } from "@/hooks/useVisitas";
import { useFeedbackVisita } from "@/hooks/useFeedbackVisita";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, MapPin, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FichaVisita, StatusVisita } from "@/types/visitas";

// Minimal ficha data for public feedback page (security: sensitive PII removed from RPC)
type FichaPublica = Pick<FichaVisita, 'id' | 'codigo' | 'endereco_imovel' | 'data_visita' | 'nome_corretor' | 'status'>;

export default function FeedbackVisita() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const { getFichaByCodigo } = useVisitas();
  const { checkFeedbackExists } = useFeedbackVisita();
  
  const [ficha, setFicha] = useState<FichaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackEnviado, setFeedbackEnviado] = useState(false);
  const [jaTemFeedback, setJaTemFeedback] = useState(false);

  useEffect(() => {
    const loadFicha = async () => {
      if (!codigo) return;
      
      const fichaData = await getFichaByCodigo(codigo);
      setFicha(fichaData);
      
      if (fichaData) {
        const exists = await checkFeedbackExists(fichaData.id);
        setJaTemFeedback(exists);
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

  if (!ficha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Código de visita não encontrado</p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (jaTemFeedback || feedbackEnviado) {
    return (
      <>
        <Helmet>
          <title>Feedback Enviado | Godoy Prime</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Obrigado!</h2>
              <p className="text-muted-foreground">
                Seu feedback foi registrado com sucesso. Suas opiniões são muito importantes para nós.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Feedback da Visita | Godoy Prime</title>
      </Helmet>

      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Info da Visita */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback da Visita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{ficha.endereco_imovel}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(ficha.data_visita), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Corretor: {ficha.nome_corretor}</span>
              </div>
            </CardContent>
          </Card>

          {/* Formulário */}
          <FeedbackForm 
            fichaVisitaId={ficha.id}
            onSuccess={() => setFeedbackEnviado(true)} 
          />
        </div>
      </div>
    </>
  );
}
