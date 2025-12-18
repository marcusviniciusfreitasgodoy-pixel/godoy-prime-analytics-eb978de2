import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  FileSearch, 
  Calculator, 
  ClipboardCheck, 
  FileText, 
  Bot, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Download, 
  Home,
  MapPin,
  TrendingUp,
  Users,
  Settings
} from 'lucide-react';
import { exportManualPDF } from '@/utils/manualPdfExport';
import { toast } from 'sonner';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  route: string;
  color: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Dashboard Principal",
    description: "Visão geral do mercado imobiliário da Barra da Tijuca com KPIs, gráficos de evolução e ranking de microbairros.",
    icon: <BarChart3 className="h-8 w-8" />,
    features: [
      "KPIs em tempo real (mediana, média, volume)",
      "Gráfico de evolução de preços",
      "Ranking de microbairros",
      "Seletor de bairro para filtrar dados",
      "Exportação de relatórios"
    ],
    route: "/",
    color: "from-primary to-primary/70"
  },
  {
    id: 2,
    title: "Microregiões",
    description: "Análise detalhada por logradouro e condomínio, com separação por tipologia e indicadores de tendência.",
    icon: <MapPin className="h-8 w-8" />,
    features: [
      "Pesquisa por logradouro",
      "Análise de condomínios",
      "Separação casas vs apartamentos",
      "Indicadores de tendência",
      "Gráfico de evolução por rua"
    ],
    route: "/microbairros",
    color: "from-blue-500 to-blue-400"
  },
  {
    id: 3,
    title: "Pesquisas de Mercado",
    description: "Ferramenta avançada de busca com filtros por localização, valor, período e área.",
    icon: <FileSearch className="h-8 w-8" />,
    features: [
      "Filtros por localização",
      "Filtros por faixa de valor",
      "Filtros por período",
      "Filtros por área",
      "Exportação CSV/Excel"
    ],
    route: "/pesquisas-mercado",
    color: "from-green-500 to-green-400"
  },
  {
    id: 4,
    title: "Avaliação Imobiliária",
    description: "Sistema de avaliação em 6 etapas com 26 características e geração de laudo em PDF.",
    icon: <Calculator className="h-8 w-8" />,
    features: [
      "6 etapas de avaliação",
      "26 características avaliadas",
      "Cenários pessimista/provável/otimista",
      "Nível de confiança automático",
      "Laudo em PDF profissional"
    ],
    route: "/avaliacao-imobiliaria",
    color: "from-yellow-500 to-yellow-400"
  },
  {
    id: 5,
    title: "Vistoria Digital",
    description: "Checklist completo para inspeção técnica com registro fotográfico e score de conservação.",
    icon: <ClipboardCheck className="h-8 w-8" />,
    features: [
      "55+ itens para casas",
      "50+ itens para apartamentos",
      "Sistema de scoring",
      "Registro fotográfico",
      "Relatório PDF detalhado"
    ],
    route: "/vistoria-digital",
    color: "from-orange-500 to-orange-400"
  },
  {
    id: 6,
    title: "Documentação",
    description: "Checklist de due diligence para transações imobiliárias com análise de documentos por IA.",
    icon: <FileText className="h-8 w-8" />,
    features: [
      "Checklist de documentos",
      "Analisador de documentos (IA)",
      "Status de verificação",
      "Alertas de pendências",
      "Exportação PDF"
    ],
    route: "/documentacao",
    color: "from-purple-500 to-purple-400"
  },
  {
    id: 7,
    title: "Sofia - Assistente IA",
    description: "Assistente virtual inteligente para consultas sobre o mercado imobiliário.",
    icon: <Bot className="h-8 w-8" />,
    features: [
      "Chat em tempo real",
      "Consultas por voz",
      "Análise de documentos",
      "Sugestões inteligentes",
      "Respostas contextualizadas"
    ],
    route: "/",
    color: "from-pink-500 to-pink-400"
  },
  {
    id: 8,
    title: "Recursos Administrativos",
    description: "Ferramentas para gestão de leads, usuários e calibração do sistema de avaliação.",
    icon: <Settings className="h-8 w-8" />,
    features: [
      "Base de Conhecimento da IA",
      "Calibrador de Avaliação",
      "Gestão de Leads",
      "Gerenciamento de Usuários",
      "Rastreamento de Atividades"
    ],
    route: "/usuarios",
    color: "from-slate-500 to-slate-400"
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToFeature = () => {
    navigate(step.route);
  };

  const handleFinish = () => {
    localStorage.setItem('godoy-onboarding-completed', 'true');
    toast.success('Onboarding concluído! Bem-vindo ao Godoy Prime Analytics.');
    navigate('/');
  };

  const handleDownloadManual = () => {
    exportManualPDF();
    toast.success('Manual exportado com sucesso!');
  };

  return (
    <>
      <Helmet>
        <title>Onboarding - Godoy Prime Analytics</title>
        <meta name="description" content="Tutorial interativo para novos usuários do Godoy Prime Analytics" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo ao Godoy Prime Analytics
          </h1>
          <p className="text-muted-foreground">
            Conheça todas as funcionalidades da plataforma em poucos minutos
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Etapa {currentStep + 1} de {onboardingSteps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% concluído
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {onboardingSteps.map((s, index) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(index)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : completedSteps.includes(index)
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {completedSteps.includes(index) && <Check className="h-3 w-3" />}
              {s.title}
            </button>
          ))}
        </div>

        {/* Main Content Card */}
        <Card className="mb-8 overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${step.color}`} />
          <CardHeader className="text-center pb-4">
            <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white mb-4`}>
              {step.icon}
            </div>
            <CardTitle className="text-2xl">{step.title}</CardTitle>
            <CardDescription className="text-base max-w-lg mx-auto">
              {step.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 max-w-md mx-auto">
              {step.features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {index + 1}
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-6">
              <Button 
                variant="outline" 
                onClick={handleGoToFeature}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Explorar {step.title}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadManual}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar Manual PDF
            </Button>

            {currentStep === onboardingSteps.length - 1 ? (
              <Button onClick={handleFinish} className="gap-2">
                <Check className="h-4 w-4" />
                Concluir Onboarding
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">8+</div>
            <div className="text-xs text-muted-foreground">Módulos</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">26+</div>
            <div className="text-xs text-muted-foreground">Características</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">100+</div>
            <div className="text-xs text-muted-foreground">Itens de Vistoria</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">IA</div>
            <div className="text-xs text-muted-foreground">Integrada</div>
          </Card>
        </div>
      </div>
    </>
  );
}
