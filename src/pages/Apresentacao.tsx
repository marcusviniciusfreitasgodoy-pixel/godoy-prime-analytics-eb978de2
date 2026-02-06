import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Building2, ClipboardCheck, Calendar, Target, FileText,
  TrendingUp, Brain, Shield, ArrowRight, MessageCircle, Eye,
} from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-pdf.png";

const features = [
  { icon: BarChart3, title: "Dashboard Analítico", desc: "KPIs de mercado em tempo real com evolução de preços por m² e liquidez por tipologia." },
  { icon: TrendingUp, title: "Avaliação Imobiliária", desc: "Precificação inteligente baseada em dados oficiais de transações com ajustes por características." },
  { icon: ClipboardCheck, title: "Vistoria Digital", desc: "Checklist completo com score automático, itens críticos e ajuste de valor por estado de conservação." },
  { icon: Calendar, title: "Agendamento de Visitas", desc: "Gestão completa de visitas com fichas digitais, assinatura eletrônica, feedback automatizado e relatório analítico em PDF." },
  { icon: Target, title: "Microregiões", desc: "Ranking e evolução de preços por microbairro com mapa interativo de transações." },
  { icon: Building2, title: "Gestão de Leads", desc: "Captação automática de leads via avaliação pública com acompanhamento de conversão." },
];

const differentials = [
  { icon: Shield, title: "Dados Oficiais", desc: "Base de transações imobiliárias reais, garantindo precisão nas análises de mercado." },
  { icon: Brain, title: "IA para Precificação", desc: "Algoritmo proprietário com ajustes por 30+ características do imóvel e tendências de mercado." },
  { icon: FileText, title: "Relatórios em PDF", desc: "Laudos profissionais prontos para apresentação ao cliente, incluindo feedback analítico de visitas e branding personalizado." },
];

export default function Apresentacao() {
  const navigate = useNavigate();

  const whatsappUrl = "https://wa.me/5521999999999?text=Olá! Gostaria de agendar uma apresentação da plataforma Godoy Prime Analytics.";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <img src={godoyLogo} alt="Godoy Prime" className="h-14 sm:h-16 mx-auto mb-8" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Plataforma de Inteligência Imobiliária
          </h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Transforme dados de mercado em decisões estratégicas. Avaliação, vistoria, 
            agendamento e análises — tudo em uma única plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 text-base font-semibold"
              onClick={() => navigate("/demo")}
            >
              <Eye className="h-5 w-5" />
              Explorar Demonstração
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => window.open(whatsappUrl, "_blank")}
            >
              <MessageCircle className="h-5 w-5" />
              Agendar Apresentação
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">Módulos</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">Tudo que sua imobiliária precisa</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Cada módulo foi projetado para otimizar o dia a dia do corretor e gerar resultados mensuráveis.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-lg transition-shadow border-border/50">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Differentials */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">Diferenciais</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">Por que escolher a Godoy Prime?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {differentials.map((d) => (
              <div key={d.title} className="text-center">
                <div className="h-14 w-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
                  <d.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{d.title}</h3>
                <p className="text-sm text-muted-foreground">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Pronto para elevar o padrão da sua imobiliária?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Explore a demonstração interativa com dados fictícios ou agende uma apresentação personalizada.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" onClick={() => navigate("/demo")}>
              Explorar Demonstração
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => window.open(whatsappUrl, "_blank")}>
              <MessageCircle className="h-4 w-4" />
              Falar com Consultor
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-3">
          <img src={godoyLogo} alt="Godoy Prime" className="h-8 mx-auto opacity-60" />
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            Aviso: Esta ferramenta fornece análises estatísticas baseadas em dados públicos de transações imobiliárias. 
            As informações não substituem laudos oficiais e devem ser utilizadas apenas como referência de mercado.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Godoy Prime Analytics. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
