import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { LeadCaptureForm } from "@/components/leads/LeadCaptureForm";
import { ThankYouStep } from "@/components/leads/ThankYouStep";
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
  id: string;
  nome: string;
  email: string;
  telefone: string;
  interesse: "compra" | "venda";
}

type Step = "form" | "lead-capture" | "thank-you" | "result";

const TRUST_BADGES = [
  { icon: Shield, text: "Dados Oficiais ITBI" },
  { icon: TrendingUp, text: "+80.000 Transações Reais" },
];

const DIFFERENTIALS = [
  {
    icon: FileCheck,
    title: "Transações Reais, Não Estimativas",
    description: "Diferente de outras ferramentas que usam algoritmos e suposições, nossa avaliação é baseada em transações ITBI efetivamente realizadas.",
    highlights: ["Resultado instantâneo e gratuito", "Dados da Prefeitura do Rio de Janeiro"],
  },
  {
    icon: Shield,
    title: "Dados Oficiais do Governo",
    description: "Acesso exclusivo a +80.000 registros oficiais de compra e venda de imóveis dos últimos 5 anos.",
    highlights: ["Atualização mensal", "Análise específica por bairro, rua e tipologia"],
  },
  {
    icon: TrendingUp,
    title: "Precisão de Mercado",
    description: "Valores baseados no que compradores realmente pagaram, não em preços de anúncios inflacionados.",
    highlights: ["Negocie com confiança", "Evite pagar a mais"],
  },
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
    }
    // If lead is captured, the QuickValuationResult handles the WhatsApp/email flow
  };

  const handleNewValuation = () => {
    setValuationData(null);
    setLeadData(null);
    setLeadCaptured(false);
    setStep("form");
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
            {step === "result" && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleNewValuation}
                className="hover:bg-primary/10 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Nova Avaliação
              </Button>
            )}
          </div>
        </header>

        {/* Hero Section - Only on form step */}
        {step === "form" && (
          <>
            <section className="py-8 px-4">
              <div className="container mx-auto max-w-2xl text-center space-y-4">
                {/* Differentiator Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium animate-fade-in">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Avaliação baseada em transações reais ITBI
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight animate-fade-in [animation-delay:150ms]">
                  Descubra o{" "}
                  <span className="text-accent">valor real</span>{" "}
                  do seu imóvel
                </h2>
                <p className="text-xl font-medium text-foreground/90 animate-fade-in [animation-delay:300ms]">
                  Vai <span className="text-accent">comprar</span> ou <span className="text-accent">vender</span>? 
                  Negocie com segurança.
                </p>
                <p className="text-base text-muted-foreground max-w-xl mx-auto animate-fade-in [animation-delay:450ms]">
                  Avaliação gratuita baseada em{" "}
                  <strong className="text-foreground">+80.000 transações oficiais</strong> da 
                  Prefeitura do Rio de Janeiro. Sem estimativas, sem achismos.
                </p>
                
                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {TRUST_BADGES.map((badge, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 animate-fade-in hover-scale"
                      style={{ animationDelay: `${600 + index * 100}ms` }}
                    >
                      <badge.icon className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">{badge.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Nosso Diferencial - Destacado */}
            <section className="py-6 px-4 bg-gradient-to-b from-accent/5 to-transparent">
              <div className="container mx-auto max-w-3xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold mb-3">
                    <Award className="h-3.5 w-3.5" />
                    EXCLUSIVO GODOY PRIME
                  </div>
                  <h3 className="text-2xl font-bold">
                    Por que escolher nossa avaliação?
                  </h3>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  {DIFFERENTIALS.map((diff, index) => (
                    <div 
                      key={index}
                      className="bg-card rounded-xl p-5 border-2 border-accent/30 shadow-lg shadow-accent/5 hover:border-accent/50 transition-colors"
                    >
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="p-3 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30">
                          <diff.icon className="h-6 w-6 text-accent" />
                        </div>
                        <h4 className="font-semibold text-sm">{diff.title}</h4>
                        <p className="text-xs text-muted-foreground">{diff.description}</p>
                        <div className="space-y-1.5 pt-2 w-full">
                          {diff.highlights.map((highlight, hIndex) => (
                            <div 
                              key={hIndex}
                              className="flex items-center gap-2 text-xs bg-accent/10 rounded-md px-2 py-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                              <span className="text-foreground/80">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 max-w-lg">
          {step === "form" && (
            <div className="space-y-6">
              <QuickValuationForm onComplete={handleQuickValuationComplete} />

              {/* Disclaimer */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Avaliação Rápida:</strong> Esta é uma estimativa simplificada 
                      baseada em dados históricos de transações ITBI. Para uma análise mais completa e personalizada, 
                      oferecemos nossa <strong className="text-accent">Avaliação Completa</strong>, feita por um 
                      <strong className="text-foreground"> PERITO AVALIADOR</strong>, que inclui também análise dos 
                      imóveis anunciados no mercado atual, tendências de valorização e características específicas 
                      do seu imóvel.
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
              leadInfo={leadData ? {
                id: leadData.id,
                nome: leadData.nome,
                email: leadData.email,
                telefone: leadData.telefone,
                interesse: leadData.interesse
              } : undefined}
              onProceedToComplete={handleProceedToComplete}
              onNewValuation={handleNewValuation}
            />
          )}
        </main>

        {/* Premium Footer */}
        <footer className="border-t border-accent/30 mt-auto py-8 bg-[#0C2340]">
          <div className="container mx-auto px-4 text-center space-y-4">
            <img src={godoyLogo} alt="Godoy Prime" className="h-8 w-auto mx-auto" />
            <p className="text-sm text-white/80">
              © {new Date().getFullYear()} Godoy Prime Realty. CRECI 11841-PJ
            </p>
            <p className="text-xs text-white/60 max-w-md mx-auto px-2">
              Dados baseados em +80.000 transações oficiais ITBI da Prefeitura do Rio de Janeiro. 
              Esta é uma estimativa automatizada e não substitui uma avaliação profissional.
            </p>
            
            {/* Contact Info - Mobile Responsive */}
            <div className="space-y-2 pt-2">
              <p className="text-xs text-white/70">
                Av. das Américas, 10101 - Bloco 2, Sala 316
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs">
                <a href="tel:+552140400067" className="text-white/80 hover:text-accent transition-colors">
                  📞 (21) 4040-0067
                </a>
                <a href="https://wa.me/5521997250515" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-accent transition-colors">
                  💬 (21) 99725-0515 (WhatsApp)
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 pt-3 text-xs">
              <a 
                href="https://godoyprime.com.br/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 underline transition-colors"
              >
                Imobiliária Godoy Prime
              </a>
              <span className="hidden sm:inline text-white/40">•</span>
              <a 
                href="https://personalshopperimobiliario.godoyprime.com.br/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 underline transition-colors"
              >
                Personal Shopper Imobiliário
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
