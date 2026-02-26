import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3, TrendingUp, ClipboardCheck, Calendar, Target, Building2,
  Brain, FileSignature, FileText, Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FunctionalityItem {
  icon: LucideIcon;
  title: string;
  dor: string;
  beneficio: string;
}

const functionalityMap: FunctionalityItem[] = [
  {
    icon: BarChart3,
    title: "Painel Analítico",
    dor: "Decisões baseadas em \"achismo\", sem visão consolidada do mercado.",
    beneficio: "4 indicadores em tempo real (R$/m², Liquidez, Variação YoY, Classificação) com histórico de 60 meses.",
  },
  {
    icon: TrendingUp,
    title: "Motor de Avaliação",
    dor: "Precificação por feeling, laudos caros e demorados.",
    beneficio: "Laudo NBR 14653-2 em 5 min com 3 cenários (pessimista/provável/otimista).",
  },
  {
    icon: ClipboardCheck,
    title: "Vistoria Digital 3.1",
    dor: "Vistorias sem padrão, disputas jurídicas, relatórios manuais.",
    beneficio: "Pontuação 0-100 automática, lista de verificação 50+ itens, PDF profissional.",
  },
  {
    icon: Calendar,
    title: "Gestão de Visitas",
    dor: "Agendamento por WhatsApp, fichas em papel, sem controle.",
    beneficio: "Fichas digitais, assinatura eletrônica, retorno automatizado, relatório analítico.",
  },
  {
    icon: Target,
    title: "Microrregiões",
    dor: "Sem dados de tendência por sub-região, análise superficial.",
    beneficio: "Classificação e evolução por microbairro com mapa interativo de transações.",
  },
  {
    icon: Building2,
    title: "Gestão de Clientes e Funil",
    dor: "Contatos perdidos em WhatsApp, sem acompanhamento, conversão invisível.",
    beneficio: "Quadro 8 estágios, captação automática, notificações email/WhatsApp, conversão rastreável.",
  },
  {
    icon: Brain,
    title: "Sofia IA",
    dor: "Horas pesquisando dados dispersos em fontes diferentes.",
    beneficio: "Resposta contextual instantânea com dados ITBI, análise de documentos.",
  },
  {
    icon: Search,
    title: "Estratégia de Precificação",
    dor: "Sem método para definir preço de lançamento vs. mercado.",
    beneficio: "Diagnóstico 9 perguntas, 3 faixas de preço, recomendação estratégica.",
  },
  {
    icon: FileSignature,
    title: "Propostas Digitais",
    dor: "Propostas informais, sem rastreabilidade, aceite verbal.",
    beneficio: "Modelos simplificado/completo, aceite eletrônico, histórico completo.",
  },
  {
    icon: FileText,
    title: "Parecer Godoy Prime",
    dor: "Comprador sem validação independente, risco de pagar acima do mercado.",
    beneficio: "Análise ITBI + vistoria presencial + projeção de valorização + margem de negociação.",
  },
];

export default function FunctionalityMapSection() {
  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <Badge variant="secondary" className="mb-3">Funcionalidades × Dores</Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Cada funcionalidade resolve uma dor real
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm sm:text-base">
            Mapeamos as principais dores do mercado imobiliário e criamos soluções específicas para cada uma.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {functionalityMap.map((item) => (
            <Card key={item.title} className="group hover:shadow-lg transition-shadow border-border/50">
              <CardContent className="p-4 sm:pt-6 sm:px-6 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3 mb-1">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-lg leading-tight">{item.title}</h3>
                </div>

                {/* Dor */}
                <div className="bg-red-50 dark:bg-red-950/30 border-l-2 border-red-400 pl-2 sm:pl-3 py-1.5 sm:py-2 rounded-r">
                  <p className="text-[10px] sm:text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Dor:</p>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 leading-snug">{item.dor}</p>
                </div>

                {/* Benefício */}
                <div className="bg-green-50 dark:bg-green-950/30 border-l-2 border-green-400 pl-2 sm:pl-3 py-1.5 sm:py-2 rounded-r">
                  <p className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400 mb-0.5">Benefício:</p>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 leading-snug">{item.beneficio}</p>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
