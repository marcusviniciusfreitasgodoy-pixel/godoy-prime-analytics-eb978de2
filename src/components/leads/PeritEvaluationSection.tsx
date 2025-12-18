import { 
  Shield, 
  Search, 
  Home, 
  TrendingUp, 
  Target,
  Award,
  MapPin,
  Database,
  CheckCircle,
  Clock,
  Banknote,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

const parecerEntregas = [
  {
    icon: Search,
    title: "Análise de Valor Real",
    description: "Cruzamos dados do ITBI com anúncios e histórico de transações para descobrir o verdadeiro valor de mercado.",
  },
  {
    icon: Home,
    title: "Vistoria Presencial Detalhada",
    description: "Avaliamos o estado de conservação, acabamentos e características que impactam diretamente no valor do imóvel.",
  },
  {
    icon: TrendingUp,
    title: "Relatório de Potencial de Valorização",
    description: "Projetamos cenários futuros com base em tendências do bairro e desenvolvimentos da região.",
  },
  {
    icon: Target,
    title: "Recomendação de Preço Justo",
    description: "Entregamos o valor exato que você deve pagar/aceitar + margem de negociação fundamentada.",
  },
];

const credenciais = [
  { label: "Perito Avaliador Credenciado TJRJ", icon: Award },
  { label: "CRECI PJ 11841 RJ | CRECI PF 80199 RJ", icon: CheckCircle },
  { label: "Primeiro Personal Shopper Imobiliário do Rio de Janeiro", icon: Shield },
  { label: "Especialização Exclusiva: Barra da Tijuca", icon: MapPin },
  { label: "Banco de Dados Proprietário: Transações Reais de Cartório", icon: Database },
];

const primeBuyerPhases = [
  { phase: "1", title: "Briefing Detalhado", desc: "Entendemos exatamente o que você busca" },
  { phase: "2", title: "Curadoria Exclusiva", desc: "Pré-selecionamos imóveis que atendem seus critérios" },
  { phase: "3", title: "Análise Técnica", desc: "Parecer completo de cada imóvel selecionado" },
  { phase: "4", title: "Negociação Blindada", desc: "Negociamos em seu nome com dados técnicos" },
  { phase: "5", title: "Acompanhamento Total", desc: "Do contrato até as chaves" },
];

export function PeritEvaluationSection() {
  return (
    <div className="space-y-10">
      {/* Seção 1: Exposição do Problema */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="text-center space-y-4">
          <h3 className="text-xl md:text-2xl font-bold text-red-800">
            Você Está Negociando Sozinho Contra Vendedor + Corretor + Imobiliária
          </h3>
          <p className="text-red-700 text-sm md:text-base">
            (Todos Lucrando Quando Você Paga Caro — Chegou a Hora de Ter Defensor Técnico Exclusivo)
          </p>
          <div className="bg-white/80 rounded-xl p-4 max-w-2xl mx-auto">
            <p className="text-red-900 font-medium">
              "Três pessoas defendendo preço alto. <strong className="text-red-700">Zero pessoas defendendo você.</strong>"
            </p>
          </div>
        </div>
      </div>

      {/* Seção 2: Parecer Godoy Prime - Sua Solução */}
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            <Shield className="inline h-6 w-6 text-primary mr-2" />
            Parecer Godoy Prime: Seu Escudo Técnico
          </h3>
          <p className="text-primary font-semibold">
            Contra Prejuízo de R$ 100-300 Mil
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parecerEntregas.map((entrega, index) => {
            const Icon = entrega.icon;
            return (
              <div 
                key={index}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-foreground text-sm mb-1">
                      {entrega.title}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {entrega.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 3: Autoridade - Marcus Godoy */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h4 className="text-lg font-bold text-foreground mb-2">
            <Award className="inline h-5 w-5 text-accent mr-2" />
            Marcus Godoy
          </h4>
          <p className="text-sm text-muted-foreground">
            Seu Defensor Técnico na Negociação
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {credenciais.map((cred, index) => {
            const Icon = cred.icon;
            return (
              <div 
                key={index}
                className="flex items-center gap-2 bg-white/80 border border-primary/20 rounded-full px-3 py-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground font-medium">{cred.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 4: Garantia Dupla */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-foreground text-center">
          🛡️ Garantia Dupla
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Garantia de Validação Independente
            </h5>
            <p className="text-sm text-green-700">
              Se a análise não revelar pelo menos um ponto crítico que valha mais que o investimento → <strong>reembolso 100%</strong>
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Garantia de Execução Profissional
            </h5>
            <p className="text-sm text-green-700">
              Se não entregar no prazo de 7 dias úteis por falha operacional → <strong>reembolso 100% + compensação</strong>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground italic">
          "Você só arrisca o custo de continuar vulnerável."
        </p>
      </div>

      {/* Seção 5: Investimento */}
      <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-2xl p-6 text-center">
        <h4 className="text-lg font-bold text-foreground mb-4 flex items-center justify-center gap-2">
          <Banknote className="h-5 w-5 text-accent" />
          Investimento
        </h4>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-lg font-bold text-foreground">A partir de R$ 5.000</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Economia Média</p>
            <p className="text-lg font-bold text-green-600">R$ 180-450 mil</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ROI</p>
            <p className="text-lg font-bold text-primary">36-90x</p>
          </div>
        </div>

        <p className="text-sm text-foreground font-medium">
          "Não é gasto — é <strong className="text-accent">blindagem patrimonial</strong> com retorno mensurável."
        </p>
      </div>

      {/* Seção 6: Sistema Representação Blindada (Oferta Complementar) */}
      <div className="bg-[#0C2340] rounded-2xl p-6 text-white">
        <div className="text-center mb-6">
          <h4 className="text-lg font-bold mb-2">
            🚀 Quer Representação Completa Durante Todo o Processo?
          </h4>
          <p className="text-white/70 text-sm">
            Sistema de Representação Blindada: Prime Buyer Experience
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {primeBuyerPhases.map((phase, index) => (
            <div 
              key={index}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-center"
            >
              <div className="text-[#D4AF37] font-bold text-xs mb-0.5">Fase {phase.phase}</div>
              <div className="text-white text-xs font-medium">{phase.title}</div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-white/80 text-sm">
            <strong className="text-[#D4AF37]">A Diferença Matemática:</strong> Compradores que usam Personal Shopper 
            economizam em média 8-15% no valor final + evitam 100% dos vícios ocultos.
          </p>
          
          <Button 
            variant="outline" 
            className="bg-transparent border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 focus:bg-[#D4AF37]/10 active:bg-[#D4AF37]/20 focus:text-[#D4AF37] active:text-[#D4AF37]"
            onClick={() => window.open('https://personalshopperimobiliario.godoyprime.com.br', '_blank')}
          >
            Conhecer Prime Buyer Experience
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
