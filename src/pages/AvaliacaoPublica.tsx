import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { LeadCaptureForm } from "@/components/leads/LeadCaptureForm";
import { ValuationEngine } from "@/components/valuation/ValuationEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, TrendingUp, Award, CheckCircle } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-symbol.png";

interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
  itbiData: {
    min_m2: number;
    med_m2: number;
    max_m2: number;
    transaction_count: number;
  } | null;
  estimativa: {
    min: number;
    med: number;
    max: number;
  } | null;
}

type Step = "form" | "lead-capture" | "result" | "complete-valuation";

const TRUST_BADGES = [
  { icon: Shield, text: "Dados Oficiais ITBI" },
  { icon: TrendingUp, text: "+80.000 Transações" },
  { icon: Award, text: "CRECI 11841-PJ" },
];

const BENEFITS = [
  "Estimativa baseada em transações reais de compra e venda",
  "Dados oficiais da Prefeitura do Rio de Janeiro",
  "Análise específica por bairro e tipologia",
  "Resultado instantâneo e gratuito",
];

export default function AvaliacaoPublica() {
  const [step, setStep] = useState<Step>("form");
  const [valuationData, setValuationData] = useState<QuickValuationData | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const handleQuickValuationComplete = (data: QuickValuationData) => {
    setValuationData(data);
    if (data.itbiData && data.estimativa) {
      setStep("lead-capture");
    } else {
      setStep("result");
    }
  };

  const handleLeadCaptureSuccess = () => {
    setLeadCaptured(true);
    setStep("result");
  };

  const handleProceedToComplete = () => {
    if (!leadCaptured) {
      setStep("lead-capture");
    } else {
      setStep("complete-valuation");
    }
  };

  const handleNewValuation = () => {
    setValuationData(null);
    setStep("form");
  };

  const handleBackToResult = () => {
    setStep("result");
  };

  return (
    <>
      <Helmet>
        <title>Avaliação Gratuita de Imóveis | Godoy Prime Realty</title>
        <meta 
          name="description" 
          content="Descubra o valor real do imóvel que você deseja comprar no Rio de Janeiro. Avaliação gratuita baseada em +80.000 transações oficiais ITBI." 
        />
        <meta name="keywords" content="avaliação imóvel, valor imóvel, Barra da Tijuca, Rio de Janeiro, ITBI, preço m2" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.05)] via-background to-[hsl(var(--accent)/0.05)]">
        {/* Premium Header */}
        <header className="border-b border-primary/10 bg-card/90 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto drop-shadow-lg" />
              <div>
                <h1 className="font-semibold text-lg tracking-tight">Godoy Prime Realty</h1>
                <p className="text-xs text-accent font-medium">Avaliação Imobiliária Premium</p>
              </div>
            </div>
            {step !== "form" && step !== "lead-capture" && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={step === "complete-valuation" ? handleBackToResult : handleNewValuation}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
        </header>

        {/* Hero Section - Only on form step */}
        {step === "form" && (
          <section className="py-8 px-4">
            <div className="container mx-auto max-w-2xl text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Quanto vale o imóvel que você quer{" "}
                <span className="text-accent">comprar?</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Descubra em segundos o valor de mercado baseado em transações reais. 
                Negocie com confiança.
              </p>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                {TRUST_BADGES.map((badge, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10"
                  >
                    <badge.icon className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 max-w-lg">
          {step === "form" && (
            <div className="space-y-8">
              <QuickValuationForm onComplete={handleQuickValuationComplete} />
              
              {/* Benefits List */}
              <div className="bg-card/50 backdrop-blur rounded-xl p-6 border border-primary/10">
                <h3 className="font-semibold text-center mb-4">
                  Por que usar nossa avaliação?
                </h3>
                <ul className="space-y-3">
                  {BENEFITS.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === "lead-capture" && valuationData && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Sua avaliação está pronta!</h2>
                <p className="text-muted-foreground">
                  Cadastre-se para ver o resultado completo e receber oportunidades exclusivas.
                </p>
              </div>
              <LeadCaptureForm
                bairroInteresse={valuationData.bairro}
                areaInteresse={valuationData.area_m2}
                valorInteresse={valuationData.estimativa?.med}
                origem="avaliacao_rapida"
                onSuccess={handleLeadCaptureSuccess}
              />
            </div>
          )}

          {step === "result" && valuationData && (
            <QuickValuationResult
              data={valuationData}
              onProceedToComplete={handleProceedToComplete}
              onNewValuation={handleNewValuation}
            />
          )}

          {step === "complete-valuation" && valuationData && (
            <div className="max-w-3xl mx-auto">
              <ValuationEngine bairro={valuationData.bairro} />
            </div>
          )}
        </main>

        {/* Premium Footer */}
        <footer className="border-t border-primary/10 mt-auto py-8 bg-card/50 backdrop-blur">
          <div className="container mx-auto px-4 text-center space-y-3">
            <img src={godoyLogo} alt="Godoy Prime" className="h-8 w-auto mx-auto opacity-80" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Godoy Prime Realty. CRECI 11841-PJ
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Dados baseados em +80.000 transações oficiais ITBI da Prefeitura do Rio de Janeiro. 
              Esta é uma estimativa automatizada e não substitui uma avaliação profissional.
            </p>
            <div className="flex justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <span>Av. das Américas, 10101 - Bloco 2, Sala 316</span>
              <span>•</span>
              <span>(21) 4040-0067</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
