import { 
  Sun, 
  Wrench, 
  Sofa, 
  Shield, 
  LayoutGrid, 
  FileCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const essentialFactors = [
  {
    icon: Sun,
    title: "Posição, Vista & Luz",
    description: "Impacto da localização privilegiada, orientação solar e vistas deslumbrantes.",
  },
  {
    icon: Wrench,
    title: "Conservação & Modernização",
    description: "Estado atual, reformas realizadas e potencial de valorização por melhorias.",
  },
  {
    icon: Sofa,
    title: "Conforto & Amenidades",
    description: "Itens de luxo, instalações e diferenciais que elevam a qualidade de vida.",
  },
  {
    icon: Shield,
    title: "Segurança & Acesso",
    description: "Nível de segurança do condomínio/região e facilidade de acesso.",
  },
  {
    icon: LayoutGrid,
    title: "Funcionalidade & Layout",
    description: "Adequação da planta, otimização dos espaços e tendências de design.",
  },
  {
    icon: FileCheck,
    title: "Status da Documentação",
    description: "Conformidade legal, certidões e histórico do imóvel.",
  },
];

const inspectionItems = [
  "Estrutura e Conservação",
  "Instalações Elétricas",
  "Instalações Hidráulicas",
  "Acabamentos Internos",
  "Esquadrias (Portas e Janelas)",
  "Varanda/Sacada",
  "Posição e Orientação",
  "Ventilação e Iluminação",
  "Climatização",
  "Segurança do Apartamento",
  "Garagem",
  "Marcenaria e Planejados",
  "Louças e Metais",
  "Tecnologia",
  "Acessibilidade e Elevadores",
  "Áreas Comuns do Condomínio",
  "Vizinhança e Entorno",
  "Documentação",
  "Sensação Geral",
];

export function PeritEvaluationSection() {
  const [showAllItems, setShowAllItems] = useState(false);
  const visibleItems = showAllItems ? inspectionItems : inspectionItems.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Título e descrição */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-foreground mb-3">
          Avaliação Completa e Profissional com Perito Avaliador
        </h3>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          Se você busca ir além da estimativa automática, oferecemos a Avaliação Mais Completa 
          e Profissional do Mercado, realizada por um perito avaliador credenciado. Ideal para:
        </p>
      </div>

      {/* Benefícios principais */}
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">✓</span>
            Definir o melhor preço de anúncio sem perder dinheiro.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">✓</span>
            Negociar com total segurança na compra ou na venda.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">✓</span>
            Apoiar decisões estratégicas de investimento, partilha ou atualização patrimonial.
          </li>
        </ul>
      </div>

      {/* 6 Fatores Essenciais */}
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4 text-center">
          Análise de Fatores Essenciais
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {essentialFactors.map((factor, index) => {
            const Icon = factor.icon;
            return (
              <div 
                key={index}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground text-sm mb-1">
                      {factor.title}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {factor.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 19 Itens de Vistoria */}
      <div>
        <h4 className="text-lg font-semibold text-foreground mb-4 text-center">
          Durante a Vistoria Presencial, nosso Perito Analisa:
        </h4>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visibleItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                  {index + 1}
                </span>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
          
          {inspectionItems.length > 8 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllItems(!showAllItems)}
              className="mt-4 w-full text-primary hover:text-primary/80"
            >
              {showAllItems ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver todos os {inspectionItems.length} itens
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mensagem final */}
      <div className="text-center p-4 bg-accent/50 rounded-lg border border-accent">
        <p className="text-sm text-foreground">
          💡 Você só avança com a Avaliação Completa e Personalizada se fizer total sentido 
          para você, depois de ter sua Análise Preliminar de Valor.
        </p>
      </div>
    </div>
  );
}
