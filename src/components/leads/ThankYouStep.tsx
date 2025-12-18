import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Gift, MessageCircle, TrendingUp, ArrowRight, Phone } from "lucide-react";

interface ThankYouStepProps {
  nome: string;
  onContinue: () => void;
}

const NEXT_STEPS = [
  {
    icon: TrendingUp,
    title: "Veja sua avaliação",
    description: "Resultado completo com faixa de valores baseada em transações reais",
  },
  {
    icon: MessageCircle,
    title: "Receba oportunidades",
    description: "Imóveis compatíveis com seu interesse direto no WhatsApp",
  },
  {
    icon: Gift,
    title: "Oferta exclusiva",
    description: "Avaliação presencial gratuita para imóveis acima de R$ 1 milhão",
  },
];

export function ThankYouStep({ nome, onContinue }: ThankYouStepProps) {
  const firstName = nome.split(" ")[0];
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-accent/20 flex items-center justify-center shadow-lg">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            Obrigado, {firstName}! 🎉
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Seu cadastro foi realizado com sucesso. Agora você tem acesso exclusivo à sua avaliação.
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <Card className="border-accent/20 bg-card/80 backdrop-blur">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-center text-sm text-muted-foreground uppercase tracking-wide">
            Próximos Passos
          </h3>
          <div className="space-y-3">
            {NEXT_STEPS.map((step, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-primary/5"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <step.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Special Offer Banner */}
      <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-primary/10 border border-accent/20 rounded-xl p-5 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
          <Gift className="h-3 w-3" />
          Oferta Exclusiva
        </div>
        <h3 className="font-bold text-lg">
          Avaliação Presencial Gratuita
        </h3>
        <p className="text-sm text-muted-foreground">
          Para imóveis acima de R$ 1 milhão na Barra da Tijuca, oferecemos uma visita técnica 
          sem compromisso com um de nossos especialistas.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-accent/30 hover:bg-accent/10"
          onClick={() => window.open("https://wa.me/5521964075124?text=Olá! Vim pela avaliação online e gostaria de agendar uma avaliação presencial gratuita.", "_blank")}
        >
          <Phone className="mr-2 h-4 w-4" />
          Agendar pelo WhatsApp
        </Button>
      </div>

      {/* CTA Button */}
      <Button 
        onClick={onContinue} 
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg" 
        size="lg"
      >
        Ver Minha Avaliação Agora
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}