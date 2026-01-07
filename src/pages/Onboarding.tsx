import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Settings,
  HelpCircle,
  Search,
  CalendarCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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

interface FAQItem {
  pergunta: string;
  resposta: string;
}

interface FAQCategory {
  id: string;
  titulo: string;
  icon: React.ReactNode;
  perguntas: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "geral",
    titulo: "Geral",
    icon: <HelpCircle className="h-4 w-4" />,
    perguntas: [
      { pergunta: "O que é o Godoy Prime Analytics?", resposta: "É uma plataforma de inteligência imobiliária que oferece análise de dados, avaliações automatizadas, vistorias digitais e assistência por IA para profissionais do mercado imobiliário da Barra da Tijuca." },
      { pergunta: "Quem pode usar a plataforma?", resposta: "Corretores de imóveis, avaliadores, gestores imobiliários e empresas do setor imobiliário." },
      { pergunta: "A plataforma funciona em dispositivos móveis?", resposta: "Sim, a interface é totalmente responsiva e funciona em desktops, tablets e smartphones." },
      { pergunta: "Preciso instalar algum software?", resposta: "Não, a plataforma funciona diretamente no navegador web, sem necessidade de instalação." }
    ]
  },
  {
    id: "dashboard",
    titulo: "Dashboard e Indicadores",
    icon: <BarChart3 className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Com que frequência os dados são atualizados?", resposta: "Os dados são sincronizados diariamente com as bases oficiais de transações." },
      { pergunta: "O que significa a mediana de preço por m²?", resposta: "É o valor central quando todos os preços são ordenados, representando melhor o mercado por não ser afetado por valores extremos." },
      { pergunta: "Como funciona o ranking de microbairros?", resposta: "Os microbairros são ordenados pela mediana de preço por m², permitindo identificar as regiões mais valorizadas." },
      { pergunta: "Posso exportar os gráficos do dashboard?", resposta: "Sim, você pode exportar relatórios completos em PDF e dados em Excel/CSV." }
    ]
  },
  {
    id: "pesquisas",
    titulo: "Pesquisas de Mercado",
    icon: <FileSearch className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Quais filtros estão disponíveis nas pesquisas?", resposta: "Localização (bairro, logradouro), faixa de valor, período, área e tipologia do imóvel." },
      { pergunta: "Posso salvar minhas pesquisas favoritas?", resposta: "O histórico de pesquisas é salvo automaticamente para consulta posterior." },
      { pergunta: "Qual o período máximo de dados disponíveis?", resposta: "Os dados cobrem os últimos 5 anos de transações oficiais registradas." },
      { pergunta: "Como exportar os resultados das pesquisas?", resposta: "Use os botões de exportação para gerar arquivos CSV ou Excel com todos os dados filtrados." }
    ]
  },
  {
    id: "avaliacao",
    titulo: "Avaliação Imobiliária",
    icon: <Calculator className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Quantas características são avaliadas?", resposta: "São 26 características divididas em categorias: localização, estrutura, acabamentos e diferenciais." },
      { pergunta: "O que são os cenários pessimista, provável e otimista?", resposta: "São três estimativas de valor que consideram diferentes condições de mercado e negociação." },
      { pergunta: "Como é calculado o nível de confiança?", resposta: "Baseado na quantidade de dados de mercado disponíveis e na consistência das características avaliadas." },
      { pergunta: "Posso gerar um laudo em PDF?", resposta: "Sim, ao final da avaliação você pode gerar um laudo profissional completo em PDF." },
      { pergunta: "As avaliações ficam salvas?", resposta: "Sim, todas as avaliações são salvas no histórico e podem ser consultadas ou atualizadas posteriormente." }
    ]
  },
  {
    id: "vistoria",
    titulo: "Vistoria Digital",
    icon: <ClipboardCheck className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Qual a diferença entre vistoria de casa e apartamento?", resposta: "Casas têm checklist com 55+ itens incluindo área externa, enquanto apartamentos têm 50+ itens focados em áreas comuns e privativas." },
      { pergunta: "Como funciona o sistema de scoring?", resposta: "Cada item é avaliado e recebe uma pontuação que compõe o score geral de conservação do imóvel." },
      { pergunta: "Posso anexar fotos à vistoria?", resposta: "Sim, você pode registrar fotos para documentar cada item avaliado." },
      { pergunta: "O relatório de vistoria serve como laudo técnico?", resposta: "O relatório serve como documentação detalhada, mas laudos oficiais requerem profissional habilitado." }
    ]
  },
  {
    id: "documentacao",
    titulo: "Documentação",
    icon: <FileText className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Quais documentos são verificados no checklist?", resposta: "Documentos do imóvel (matrícula, IPTU), do proprietário (RG, CPF) e da transação (contrato, certidões)." },
      { pergunta: "Como funciona o analisador de documentos por IA?", resposta: "Você faz upload do documento e a IA identifica informações relevantes e possíveis inconsistências." },
      { pergunta: "Posso usar o checklist para qualquer tipo de transação?", resposta: "Sim, o checklist é adaptável para compra, venda, locação e outras operações imobiliárias." },
      { pergunta: "Os documentos enviados ficam armazenados?", resposta: "Os documentos são processados temporariamente e não ficam armazenados na plataforma por segurança." }
    ]
  },
  {
    id: "sofia",
    titulo: "Sofia - Assistente IA",
    icon: <Bot className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Que tipo de perguntas posso fazer à Sofia?", resposta: "Perguntas sobre mercado imobiliário, avaliações, documentação, tendências de preços e dúvidas sobre a plataforma." },
      { pergunta: "A Sofia pode analisar documentos?", resposta: "Sim, você pode enviar documentos para análise e a Sofia extrairá informações relevantes." },
      { pergunta: "As respostas da Sofia são confiáveis?", resposta: "A Sofia usa dados atualizados e base de conhecimento especializada, mas recomenda-se validar informações críticas." },
      { pergunta: "Posso usar comandos de voz?", resposta: "Sim, a Sofia aceita consultas por voz para interação hands-free." }
    ]
  },
  {
    id: "admin",
    titulo: "Recursos Administrativos",
    icon: <Settings className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Como gerenciar leads capturados?", resposta: "Acesse a seção Leads para visualizar, filtrar e acompanhar o status de cada prospect." },
      { pergunta: "Quem pode acessar o calibrador de avaliação?", resposta: "Apenas administradores têm acesso para ajustar pesos e fatores do sistema de avaliação." },
      { pergunta: "Como adicionar novos usuários?", resposta: "Administradores podem convidar novos usuários na seção Gerenciar Usuários." },
      { pergunta: "O que é rastreado no log de atividades?", resposta: "Logins, avaliações realizadas, vistorias, pesquisas, exportações e outras ações na plataforma." }
    ]
  },
  {
    id: "suporte",
    titulo: "Suporte e Ajuda",
    icon: <HelpCircle className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Como entrar em contato com o suporte?", resposta: "Envie email para contato@godoyprime.com.br ou use o chat da Sofia para dúvidas rápidas." },
      { pergunta: "Existe treinamento disponível?", resposta: "Sim, oferecemos onboarding interativo, tours guiados em cada página e manual completo em PDF." },
      { pergunta: "Como reportar um bug ou erro?", resposta: "Entre em contato pelo email de suporte descrevendo o problema e os passos para reproduzi-lo." },
      { pergunta: "Há atualizações frequentes na plataforma?", resposta: "Sim, a plataforma recebe atualizações regulares com melhorias e novas funcionalidades." }
    ]
  },
  {
    id: "dicas",
    titulo: "Dicas de Uso",
    icon: <TrendingUp className="h-4 w-4" />,
    perguntas: [
      { pergunta: "Qual a melhor forma de começar a usar a plataforma?", resposta: "Complete o onboarding, explore o dashboard e faça uma avaliação teste para conhecer o fluxo." },
      { pergunta: "Como obter avaliações mais precisas?", resposta: "Preencha todas as 26 características com atenção e use dados de mercado atualizados como referência." },
      { pergunta: "Posso usar a plataforma offline?", resposta: "Não, é necessária conexão com internet para acessar dados em tempo real e funcionalidades da IA." },
      { pergunta: "Devo atualizar minhas avaliações periodicamente?", resposta: "Sim, recomendamos revisar avaliações a cada 3-6 meses ou quando houver mudanças significativas no mercado." }
    ]
  }
];

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
    title: "Agendamento de Visitas",
    description: "Gestão completa de visitas com agendamento, fichas digitais, assinaturas e coleta de feedback.",
    icon: <CalendarCheck className="h-8 w-8" />,
    features: [
      "Agendamento de visitas",
      "Fichas de visita digitais",
      "Assinatura digital (cliente e corretor)",
      "Coleta de feedback pós-visita",
      "Relatório PDF profissional"
    ],
    route: "/visitas",
    color: "from-teal-500 to-teal-400"
  },
  {
    id: 7,
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
    id: 8,
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
    id: 9,
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
  const [showFAQ, setShowFAQ] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];

  const filteredFAQ = faqCategories.map(category => ({
    ...category,
    perguntas: category.perguntas.filter(
      p => 
        p.pergunta.toLowerCase().includes(faqSearch.toLowerCase()) ||
        p.resposta.toLowerCase().includes(faqSearch.toLowerCase())
    )
  })).filter(category => category.perguntas.length > 0);

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

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={!showFAQ ? "default" : "outline"}
            onClick={() => setShowFAQ(false)}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Tutorial
          </Button>
          <Button
            variant={showFAQ ? "default" : "outline"}
            onClick={() => setShowFAQ(true)}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Perguntas Frequentes
          </Button>
        </div>

        {!showFAQ ? (
          <>
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
          </>
        ) : (
          <>
            {/* FAQ Section */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar perguntas..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredFAQ.map((category) => (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {category.icon}
                      {category.titulo}
                      <Badge variant="secondary" className="ml-auto">
                        {category.perguntas.length} perguntas
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.perguntas.map((faq, index) => (
                        <AccordionItem key={index} value={`${category.id}-${index}`}>
                          <AccordionTrigger className="text-left text-sm hover:no-underline">
                            {faq.pergunta}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm">
                            {faq.resposta}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredFAQ.length === 0 && (
              <Card className="p-8 text-center">
                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma pergunta encontrada para "{faqSearch}"
                </p>
              </Card>
            )}

            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={handleDownloadManual}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar Manual Completo (PDF)
              </Button>
            </div>
          </>
        )}

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">8+</div>
            <div className="text-xs text-muted-foreground">Módulos</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">40+</div>
            <div className="text-xs text-muted-foreground">Perguntas FAQ</div>
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
