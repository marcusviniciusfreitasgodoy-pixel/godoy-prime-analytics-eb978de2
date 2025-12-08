import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { LeadCaptureForm } from "@/components/leads/LeadCaptureForm";
import { ThankYouStep } from "@/components/leads/ThankYouStep";
import { ValuationEngine } from "@/components/valuation/ValuationEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, TrendingUp, Award, CheckCircle, FileCheck, AlertCircle, Sparkles } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-symbol.png";

interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
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

interface LeadData {
  nome: string;
  email: string;
  telefone: string;
}

type Step = "form" | "lead-capture" | "thank-you" | "result" | "complete-valuation";

const TRUST_BADGES = [
  { icon: Shield, text: "Dados Oficiais ITBI" },
  { icon: TrendingUp, text: "+80.000 Transações Reais" },
  { icon: Award, text: "CRECI 11841-PJ" },
];

const DIFFERENTIALS = [
  {
    icon: FileCheck,
    title: "Transações Reais, Não Estimativas",
    description: "Diferente de outras ferramentas que usam algoritmos e suposições, nossa avaliação é baseada em transações ITBI efetivamente realizadas e registradas na Prefeitura do Rio de Janeiro.",
  },
  {
    icon: Shield,
    title: "Dados Oficiais do Governo",
    description: "Acesso exclusivo a +80.000 registros oficiais de compra e venda de imóveis dos últimos 5 anos, atualizados mensalmente.",
  },
  {
    icon: TrendingUp,
    title: "Precisão de Mercado",
    description: "Valores baseados no que compradores realmente pagaram, não em preços de anúncios inflacionados ou estimativas genéricas.",
  },
];

const BENEFITS = [
  "Baseada em transações reais de compra e venda (ITBI)",
  "Dados oficiais da Prefeitura do Rio de Janeiro",
  "Análise específica por bairro, rua e tipologia",
  "Resultado instantâneo e gratuito",
];

export default function AvaliacaoPublica() {
  const [step, setStep] = useState<Step>("form");
  const [valuationData, setValuationData] = useState<QuickValuationData | null>(null);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const handleQuickValuationComplete = (data: QuickValuationData) => {
    setValuationData(data);
    if (data.itbiData && data.estimativa) {
      setStep("lead-capture");
    } else {
      setStep("result");
    }
  };

  const handleLeadCaptureSuccess = (data: LeadData) => {
    setLeadData(data);
    setLeadCaptured(true);
    setStep("thank-you");
  };

  const handleThankYouContinue = () => {
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
        <header className="border-b border-accent/30 bg-[#0C2340] sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto drop-shadow-lg" />
              <div>
                <h1 className="font-semibold text-lg tracking-tight text-white">Godoy Prime Realty</h1>
                <p className="text-xs text-accent font-medium">Avaliação Imobiliária Premium</p>
              </div>
            </div>
            {step !== "form" && step !== "lead-capture" && step !== "thank-you" && (
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
              {/* Differentiator Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Avaliação baseada em transações reais ITBI
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Quanto vale o imóvel que você quer{" "}
                <span className="text-accent">comprar?</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Descubra o valor real de mercado baseado em{" "}
                <strong className="text-foreground">transações oficiais de compra e venda</strong>, 
                não em estimativas ou anúncios. Negocie com confiança.
              </p>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-3 pt-4">
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

              {/* Differentials Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-center text-lg">
                  Nosso Diferencial
                </h3>
                <div className="space-y-3">
                  {DIFFERENTIALS.map((diff, index) => (
                    <div 
                      key={index}
                      className="bg-gradient-to-r from-accent/5 to-transparent rounded-lg p-4 border border-accent/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 shrink-0">
                          <diff.icon className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{diff.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{diff.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Avaliação Rápida:</strong> Esta é uma estimativa simplificada 
                      baseada em dados históricos de transações ITBI. Para uma análise mais completa e personalizada, 
                      oferecemos nossa <strong className="text-accent">Avaliação Completa</strong>, que inclui também 
                      análise dos imóveis anunciados no mercado atual, tendências de valorização e características 
                      específicas do seu imóvel.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Preencha o formulário acima para receber sua avaliação rápida gratuita e, se desejar, 
                      solicitar uma avaliação completa com um de nossos especialistas.
                    </p>
                  </div>
                </div>
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
                quartos={valuationData.quartos}
                banheiros={valuationData.banheiros}
                suites={valuationData.suites}
                vagas={valuationData.vagas}
                origem="avaliacao_rapida"
                onSuccess={handleLeadCaptureSuccess}
              />
            </div>
          )}

          {step === "thank-you" && leadData && (
            <ThankYouStep 
              nome={leadData.nome} 
              onContinue={handleThankYouContinue} 
            />
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
        <footer className="border-t border-accent/30 mt-auto py-8 bg-[#0C2340]">
          <div className="container mx-auto px-4 text-center space-y-3">
            <img src={godoyLogo} alt="Godoy Prime" className="h-8 w-auto mx-auto" />
            <p className="text-sm text-white/80">
              © {new Date().getFullYear()} Godoy Prime Realty. CRECI 11841-PJ
            </p>
            <p className="text-xs text-white/60 max-w-md mx-auto">
              Dados baseados em +80.000 transações oficiais ITBI da Prefeitura do Rio de Janeiro. 
              Esta é uma estimativa automatizada e não substitui uma avaliação profissional.
            </p>
            <div className="flex justify-center gap-4 pt-2 text-xs text-white/60">
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
