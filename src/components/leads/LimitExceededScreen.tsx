import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, MessageCircle, Calendar } from "lucide-react";

interface LimitExceededScreenProps {
  evaluationCount: number;
  email: string;
  onRetry?: () => void;
}

export function LimitExceededScreen({ evaluationCount, email, onRetry }: LimitExceededScreenProps) {
  const whatsappMessage = encodeURIComponent(
    `Olá Marcus! Usei ${evaluationCount} consultas preliminares no site e gostaria de agendar uma avaliação completa com Perito Avaliador. Email: ${email}`
  );

  return (
    <Card className="border-accent/30 shadow-xl bg-card/80 backdrop-blur max-w-lg mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center mb-4 shadow-lg">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <CardTitle className="text-2xl font-bold">Limite de Consultas Atingido</CardTitle>
        <CardDescription className="text-base">
          Você já realizou <span className="font-semibold text-accent">{evaluationCount}</span> análises preliminares gratuitas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-3 text-primary">🏆 Próximo Passo: Parecer Técnico Completo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Para análises mais precisas e detalhadas, converse com Marcus Godoy e conheça o 
            <strong> Parecer Técnico Godoy Prime</strong> - uma avaliação profissional com:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Análise de Valor Real baseada em transações ITBI
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Vistoria Presencial por Perito Credenciado TJRJ
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Relatório de Valorização com projeção de 3-5 anos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Margem de Negociação documentada
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
            size="lg"
            onClick={() => window.open(`https://wa.me/5521964075124?text=${whatsappMessage}`, "_blank")}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Falar com Marcus pelo WhatsApp
          </Button>

          <Button
            variant="outline"
            className="w-full border-primary/30"
            size="lg"
            onClick={() => window.open("tel:+552140400067", "_self")}
          >
            <Phone className="mr-2 h-5 w-5" />
            Ligar: (21) 4040-0067
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            size="lg"
            onClick={() => window.open("https://calendly.com/godoyprime/parecer-tecnico", "_blank")}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Agendar Horário Online
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-800">
            ⏰ <strong>Dica:</strong> Quanto antes validar o valor real, maior sua vantagem na negociação.
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Dúvidas? Entre em contato: contato@godoyprime.com.br
        </p>
      </CardContent>
    </Card>
  );
}
