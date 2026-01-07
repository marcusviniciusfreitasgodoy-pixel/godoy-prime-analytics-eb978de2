import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm, QuickValuationData } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { PublicSofiaAssistant } from "@/components/leads/PublicSofiaAssistant";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  Eye,
  Calculator,
  Target,
  Users,
  Home,
  DollarSign,
  BarChart3,
  FileSearch,
  Clock,
  Building2,
  ChevronDown
} from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-symbol.png";
import heroBackground from "@/assets/hero-barra-luxury.jpg";

type Step = "form" | "result";

// Stats for hero
const HERO_STATS = [
  { value: "80.000+", label: "Transações Oficiais", icon: FileSearch },
  { value: "5 Anos", label: "De Dados Históricos", icon: Clock },
  { value: "142", label: "Bairros do Rio", icon: Building2 },
];

// Problems section data
const PROBLEMS = [
  {
    icon: Eye,
    title: "Anúncios inflacionados",
    description: "Preços de anúncios não refletem o valor real de venda. Vendedores pedem mais, compradores oferecem menos.",
  },
  {
    icon: Calculator,
    title: "Algoritmos genéricos",
    description: "Ferramentas online usam fórmulas simplistas que ignoram os diferenciais únicos de cada imóvel.",
  },
  {
    icon: Target,
    title: "Falta de dados oficiais",
    description: "Sem acesso a transações reais, você negocia no escuro e pode perder dinheiro.",
  },
];

// Solutions section data
const SOLUTIONS = [
  {
    icon: Shield,
    title: "Dados Oficiais",
    description: "Usamos transações reais registradas na Prefeitura do RJ, não apenas preços de anúncios.",
    highlight: "Fonte governamental confiável",
  },
  {
    icon: Award,
    title: "Especialistas em Alto Padrão",
    description: "Foco exclusivo em Barra da Tijuca e bairros nobres do Rio com metodologia específica.",
    highlight: "Conhecimento local profundo",
  },
  {
    icon: BarChart3,
    title: "Metodologia Transparente",
    description: "Você vê exatamente como calculamos: base de dados, filtros aplicados e período analisado.",
    highlight: "Sem caixas-pretas",
  },
];

// Audience personas
const PERSONAS = [
  {
    icon: Home,
    title: "Proprietários",
    subtitle: "Quer vender pelo melhor preço?",
    description: "Descubra o valor real do seu imóvel baseado em transações oficiais e negocie com segurança.",
    cta: "Posicione seu imóvel com preço correto e evite perder meses tentando vender sem sucesso.",
  },
  {
    icon: Users,
    title: "Compradores",
    subtitle: "Quer negociar com confiança?",
    description: "Saiba se o preço pedido está dentro da realidade de mercado antes de fazer uma proposta.",
    cta: "Negocie com informações reais e pague o valor justo",
  },
  {
    icon: DollarSign,
    title: "Investidores",
    subtitle: "Quer identificar oportunidades?",
    description: "Compare valores por região e tipologia para encontrar as melhores oportunidades de investimento.",
    cta: "Tome decisões com dados reais",
  },
];

// SEO meta tags otimizadas para conversão
const SEO_CONFIG = {
  title: "Avaliação Imobiliária Gratuita | Descubra o Valor Real do Seu Imóvel | Godoy Prime",
  description: "Descubra o valor real do seu imóvel na Barra da Tijuca em 30 segundos. Avaliação baseada em +80.000 transações oficiais da Prefeitura do RJ. Gratuito e sem compromisso.",
  keywords: "avaliação imóvel gratuita, valor imóvel Barra da Tijuca, preço m2 Rio de Janeiro, quanto vale meu apartamento, transações oficiais, avaliação online, valor real imóvel",
  canonical: "https://avaliacao.godoyprime.com.br",
  ogImage: "https://avaliacao.godoyprime.com.br/og-image.jpg",
};

export default function AvaliacaoPublica() {
  const [step, setStep] = useState<Step>("form");
  const [valuationData, setValuationData] = useState<QuickValuationData | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  // UTM tracking para campanhas
  const { utmParams, hasUTM } = useUTMTracking();

  const handleQuickValuationComplete = (data: QuickValuationData) => {
    setValuationData(data);
    setStep("result");
    // Scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleNewValuation = () => {
    setValuationData(null);
    setStep("form");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{SEO_CONFIG.title}</title>
        <meta name="title" content={SEO_CONFIG.title} />
        <meta name="description" content={SEO_CONFIG.description} />
        <meta name="keywords" content={SEO_CONFIG.keywords} />
        <link rel="canonical" href={SEO_CONFIG.canonical} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SEO_CONFIG.canonical} />
        <meta property="og:title" content={SEO_CONFIG.title} />
        <meta property="og:description" content={SEO_CONFIG.description} />
        <meta property="og:image" content={SEO_CONFIG.ogImage} />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="Godoy Prime Realty" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={SEO_CONFIG.canonical} />
        <meta property="twitter:title" content={SEO_CONFIG.title} />
        <meta property="twitter:description" content={SEO_CONFIG.description} />
        <meta property="twitter:image" content={SEO_CONFIG.ogImage} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Godoy Prime Realty" />
        <meta name="geo.region" content="BR-RJ" />
        <meta name="geo.placename" content="Rio de Janeiro" />
        
        {/* Structured Data - LocalBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            "name": "Godoy Prime Realty",
            "description": "Avaliação imobiliária premium baseada em dados oficiais",
            "url": SEO_CONFIG.canonical,
            "logo": "https://avaliacao.godoyprime.com.br/godoy-logo.png",
            "telephone": "+55-21-96407-5124",
            "email": "contato@godoyprime.com.br",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Rio de Janeiro",
              "addressRegion": "RJ",
              "addressCountry": "BR"
            },
            "areaServed": {
              "@type": "City",
              "name": "Rio de Janeiro"
            },
            "priceRange": "$$$$",
            "sameAs": [
              "https://www.instagram.com/godoyprime"
            ]
          })}
        </script>
        
        {/* Structured Data - Service */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Avaliação Imobiliária Gratuita",
            "description": "Descubra o valor real do seu imóvel baseado em +80.000 transações oficiais",
            "provider": {
              "@type": "RealEstateAgent",
              "name": "Godoy Prime Realty"
            },
            "areaServed": {
              "@type": "City",
              "name": "Rio de Janeiro"
            },
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "BRL"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* ============ SECTION 1: HERO (Navy with background image) ============ */}
        <section className="relative text-white overflow-hidden">
          {/* Background image with overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBackground})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0C2340]/95 via-[#0C2340]/90 to-[#1a3a5c]/85" />
          
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <header className="relative z-10 container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={godoyLogo} alt="Godoy Prime" className="h-10 md:h-12 w-auto drop-shadow-lg" />
              <div className="hidden sm:block">
                <h1 className="font-semibold text-base md:text-lg tracking-tight">Godoy Prime Realty</h1>
                <p className="text-xs text-[#D4AF37] font-medium">Avaliação Imobiliária Premium</p>
              </div>
            </div>
            <Button 
              onClick={scrollToForm}
              className="bg-[#D4AF37] hover:bg-[#c9a432] text-[#0C2340] font-semibold shadow-lg"
              size="sm"
            >
              Consultar Valor
            </Button>
          </header>

          {/* Hero Content */}
          <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium animate-fade-in">
                <Shield className="h-4 w-4 text-[#D4AF37]" />
                Transações Oficiais da Prefeitura do Rio de Janeiro
              </div>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight animate-fade-in [animation-delay:150ms]">
                Negocie com Confiança:
                <br />
                <span className="text-[#D4AF37]">Descubra o Valor Real</span>
                <br className="hidden md:block" />
                {" "}de Qualquer Imóvel
              </h2>

              <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto animate-fade-in [animation-delay:300ms]">
                Avaliação baseada em transações reais de compra e venda, 
                não em preços de anúncios inflacionados.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in [animation-delay:450ms]">
                <Button 
                  onClick={scrollToForm}
                  size="lg"
                  className="bg-[#D4AF37] hover:bg-[#c9a432] text-[#0C2340] font-bold shadow-xl hover:shadow-2xl transition-all duration-300 text-base px-8"
                >
                  Descobrir Valor Real Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 md:gap-8 pt-8 border-t border-white/10 mt-8 animate-fade-in [animation-delay:600ms]">
                {HERO_STATS.map((stat, index) => (
                  <div key={index} className="text-center">
                    <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-xl md:text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs md:text-sm text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
              <ChevronDown className="h-6 w-6 text-white/40" />
            </div>
          </div>
        </section>

        {/* ============ SECTION 2: PROBLEM (White background) ============ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-4">
                O PROBLEMA
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                Por Que Você Está Negociando no Escuro?
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A diferença entre o preço pedido e o valor real pode chegar a <strong className="text-[#D4AF37]">R$ 200.000</strong> ou mais.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PROBLEMS.map((problem, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-[#D4AF37]/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                    <problem.icon className="h-6 w-6 text-destructive" />
                  </div>
                  <h4 className="font-bold text-lg text-[#0C2340] mb-2">{problem.title}</h4>
                  <p className="text-muted-foreground text-sm">{problem.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ SECTION 3: SOLUTION (Light gray background) ============ */}
        <section className="py-16 md:py-20 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-sm font-semibold mb-4">
                A SOLUÇÃO
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                A Solução Que Muda Tudo
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Avaliação baseada em dados reais da Prefeitura, não em achismos ou algoritmos genéricos.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {SOLUTIONS.map((solution, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-6 border-2 border-[#D4AF37]/20 hover:border-[#D4AF37]/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
                    <solution.icon className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-bold text-lg text-[#0C2340] mb-2">{solution.title}</h4>
                  <p className="text-muted-foreground text-sm mb-4">{solution.description}</p>
                  <div className="flex items-center gap-2 text-xs bg-[#D4AF37]/10 text-[#0C2340] rounded-lg px-3 py-2">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37]" />
                    {solution.highlight}
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                <TrendingUp className="inline h-4 w-4 text-[#D4AF37] mr-1" />
                Usado por corretores e investidores premium da Barra da Tijuca
              </p>
            </div>
          </div>
        </section>

        {/* ============ SECTION 4: PARA QUEM É (White background) ============ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0C2340]/10 text-[#0C2340] text-sm font-semibold mb-4">
                PARA QUEM É
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                Para Quem É Esta Avaliação?
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PERSONAS.map((persona, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-[#D4AF37]/30 hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0C2340] to-[#1a3a5c] flex items-center justify-center mx-auto mb-4">
                    <persona.icon className="h-8 w-8 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-bold text-xl text-[#0C2340] mb-1">{persona.title}</h4>
                  <p className="text-[#D4AF37] font-medium text-sm mb-3">{persona.subtitle}</p>
                  <p className="text-muted-foreground text-sm mb-4">{persona.description}</p>
                  <div className="inline-flex items-center gap-2 text-xs bg-[#D4AF37]/10 text-[#0C2340] rounded-full px-4 py-2 font-medium">
                    <CheckCircle className="h-3.5 w-3.5 text-[#D4AF37]" />
                    {persona.cta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ SECTION 5: FINAL CTA (Gold background) ============ */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-[#D4AF37] to-[#c9a432]">
          <div className="container mx-auto max-w-3xl text-center">
            <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
              Pronto para Descobrir o Valor Real?
            </h3>
            <p className="text-[#0C2340]/80 text-lg mb-8">
              Comece agora – leva apenas 30 segundos.
            </p>
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="bg-[#0C2340] hover:bg-[#0a1d33] text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 text-base px-10"
            >
              Consultar Valor Real
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* ============ SECTION 6: FORM (Light gray background) ============ */}
        <section ref={formRef} className="py-16 md:py-20 px-4 bg-gray-50 scroll-mt-4">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0C2340]/10 text-[#0C2340] text-sm font-semibold mb-4">
                AVALIAÇÃO PRELIMINAR
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                Consulte o Valor Real
              </h3>
              <p className="text-muted-foreground">
                Resultado instantâneo baseado em transações reais • Sem compromisso
              </p>
            </div>

            {step === "form" && (
              <div className="space-y-6">
                <QuickValuationForm onComplete={handleQuickValuationComplete} />

                {/* Trust badges */}
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4 text-[#D4AF37]" />
                    Dados da Prefeitura RJ
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37]" />
                    Sem compromisso
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4 text-[#D4AF37]" />
                    Resultado em 30 segundos
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Aviso:</strong> Esta é uma estimativa automática baseada em dados 
                      históricos de transações oficiais. Não substitui um laudo técnico assinado por perito avaliador.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============ RESULT SECTION (appears after form submit) ============ */}
        {step === "result" && valuationData && (
          <section ref={resultRef} className="py-12 px-4 bg-gradient-to-b from-gray-50 to-white scroll-mt-4">
            <div className="container mx-auto max-w-3xl">
              <QuickValuationResult
                data={valuationData}
                onNewValuation={handleNewValuation}
              />
            </div>
          </section>
        )}

        {/* ============ SECTION 7: FOOTER (Navy background) ============ */}
        <footer className="py-12 px-4 bg-[#0C2340]">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Logo and info */}
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                  <img src={godoyLogo} alt="Godoy Prime" className="h-10 w-auto" />
                  <div>
                    <h4 className="font-semibold text-white">Godoy Prime Realty</h4>
                    <p className="text-xs text-[#D4AF37]">CRECI 11841-PJ</p>
                  </div>
                </div>
                <p className="text-white/60 text-sm max-w-md">
                  Especialistas em imóveis de alto padrão na Barra da Tijuca. 
                  Avaliações baseadas em dados oficiais da Prefeitura do Rio de Janeiro.
                </p>
              </div>

              {/* Contact */}
              <div className="text-center md:text-right">
                <p className="text-white/80 text-sm mb-2">
                  Av. das Américas, 10101 - Bloco 2, Sala 316
                </p>
                <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-2 sm:gap-4 text-sm">
                  <a href="tel:+552140400067" className="text-white/80 hover:text-[#D4AF37] transition-colors">
                    📞 (21) 4040-0067
                  </a>
                  <a href="https://wa.me/5521964075124" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-[#D4AF37] transition-colors">
                    💬 (21) 96407-5124
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-white/40 text-xs">
                © {new Date().getFullYear()} Godoy Prime Realty. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/politica-privacidade" className="text-white/40 text-xs hover:text-[#D4AF37] transition-colors">
                  Política de Privacidade
                </Link>
                <span className="text-white/20">|</span>
                <span className="text-white/40 text-xs">
                  Desenvolvido por Godoy Prime Realty
                </span>
              </div>
            </div>
          </div>
        </footer>

        {/* Sofia Assistant for Public Page */}
        <PublicSofiaAssistant />

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
