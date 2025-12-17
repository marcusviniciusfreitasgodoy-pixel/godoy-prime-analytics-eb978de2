import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm, QuickValuationData } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, TrendingUp, Award, CheckCircle, FileCheck, AlertCircle, Sparkles, MessageCircle } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-symbol.png";

type Step = "form" | "result";

const TRUST_BADGES = [
  { icon: Shield, text: "Dados Oficiais ITBI da Prefeitura do RJ" },
  { icon: TrendingUp, text: "+80.000 Transações Reais (5 anos)" },
  { icon: Award, text: "Foco em Alto Padrão - Barra da Tijuca" },
];

const DIFFERENTIALS = [
  {
    icon: FileCheck,
    title: "Transações reais, não apenas anúncios",
    description: "Em vez de olhar só preços de anúncios inflacionados, usamos registros oficiais de compra e venda (ITBI), ou seja, quanto os compradores realmente pagaram por imóveis na Barra da Tijuca.",
    highlights: ["Resultado imediato em tela", "Análise baseada em dados da Prefeitura do Rio de Janeiro"],
  },
  {
    icon: Shield,
    title: "Dados oficiais e foco local",
    description: "Nossa base reúne mais de 80.000 transações oficiais de compra e venda dos últimos 5 anos na Barra da Tijuca, com maior peso para as negociações dos últimos 12 meses.",
    highlights: ["Atualização mensal", "Análise por bairro, rua, condomínio e tipologia"],
  },
  {
    icon: TrendingUp,
    title: "Precisão para negociar melhor",
    description: "Os valores estimados consideram quanto foi efetivamente pago em imóveis comparáveis ao seu, e não apenas o preço pedido em anúncios.",
    highlights: ["Evite vender abaixo do que vale", "Não pague mais caro do que o justo"],
  },
];

export default function AvaliacaoPublica() {
  const [step, setStep] = useState<Step>("form");
  const [valuationData, setValuationData] = useState<QuickValuationData | null>(null);

  const handleQuickValuationComplete = (data: QuickValuationData) => {
    setValuationData(data);
    setStep("result");
  };

  const handleNewValuation = () => {
    setValuationData(null);
    setStep("form");
  };

  return (
    <>
      <Helmet>
        <title>Avaliação Imobiliária Gratuita e Transparente | Godoy Prime Realty</title>
        <meta 
          name="description" 
          content="Descubra o valor de mercado do seu imóvel na Barra da Tijuca com base em transações reais ITBI. Avaliação gratuita baseada em +80.000 transações oficiais." 
        />
        <meta name="keywords" content="avaliação imóvel, valor imóvel, Barra da Tijuca, Rio de Janeiro, ITBI, preço m2, avaliação gratuita" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.05)] via-background to-[hsl(var(--accent)/0.05)]">
        {/* Header */}
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium animate-fade-in">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Dados oficiais ITBI da Prefeitura do Rio de Janeiro
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight animate-fade-in [animation-delay:150ms]">
                  Avaliação Imobiliária{" "}
                  <span className="text-accent">Gratuita</span> e{" "}
                  <span className="text-accent">Transparente</span>
                </h2>
                
                <p className="text-lg text-foreground/90 animate-fade-in [animation-delay:300ms]">
                  Descubra, em segundos, a estimativa de valor de mercado do seu imóvel na Barra da Tijuca, 
                  com base em transações reais da Prefeitura do Rio de Janeiro – sem achismos e sem pegadinhas.
                </p>
                
                <p className="text-base text-muted-foreground max-w-xl mx-auto animate-fade-in [animation-delay:450ms]">
                  Vai <strong className="text-accent">comprar</strong> ou <strong className="text-accent">vender</strong>? 
                  Negocie com segurança usando dados reais de mercado.
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

            {/* Por que escolher nossa avaliação? */}
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
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {step === "form" && (
            <div className="space-y-6">
              <QuickValuationForm onComplete={handleQuickValuationComplete} />

              {/* Disclaimer */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Aviso:</strong> Esta é uma estimativa automática baseada em dados 
                    históricos de transações ITBI e em regras estatísticas. Não substitui um laudo técnico assinado por perito avaliador.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "result" && valuationData && (
            <QuickValuationResult
              data={valuationData}
              onNewValuation={handleNewValuation}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-accent/30 mt-auto py-8 bg-[#0C2340]">
          <div className="container mx-auto px-4 text-center space-y-4">
            <img src={godoyLogo} alt="Godoy Prime" className="h-8 w-auto mx-auto" />
            <p className="text-sm text-white/80">
              © {new Date().getFullYear()} Godoy Prime Realty. CRECI 11841-PJ
            </p>
            <p className="text-xs text-white/60 max-w-md mx-auto px-2">
              Dados baseados em mais de 80.000 transações oficiais ITBI da Prefeitura do Rio de Janeiro 
              dos últimos 5 anos, com foco nas negociações mais recentes da Barra da Tijuca. 
              Esta é uma estimativa automatizada e não substitui uma avaliação profissional assinada por perito.
            </p>
            
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
          </div>
        </footer>

        {/* Floating WhatsApp Button */}
        <a
          href="https://wa.me/5521964075124?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20avalia%C3%A7%C3%A3o%20de%20im%C3%B3veis."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5C] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in group"
          aria-label="Contato via WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="font-medium text-sm hidden sm:inline group-hover:inline">Fale Conosco</span>
        </a>
      </div>
    </>
  );
}
