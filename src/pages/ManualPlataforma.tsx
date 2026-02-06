import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Home,
  MapPin,
  Search,
  Calculator,
  ClipboardCheck,
  CalendarCheck,
  FileText,
  Settings,
  Users,
  Brain,
  BarChart3,
  TrendingUp,
  Download,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Zap,
  Shield,
  Database,
  RefreshCw,
  FileSpreadsheet,
  History,
  Cog,
  ExternalLink,
  Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTourNavigation } from "@/hooks/useTourNavigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface ManualSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  route?: string;
  features: {
    title: string;
    description: string;
    tips?: string[];
  }[];
}

const manualSections: ManualSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    description: "Visão geral do mercado imobiliário com KPIs, gráficos de evolução e rankings de microbairros.",
    route: "/",
    features: [
      {
        title: "KPIs do Mercado",
        description: "Indicadores-chave atualizados: Preço Médio por m², Liquidez (volume de transações), Variação Anual e Bairro Mais Valorizado. Dados baseados em transações oficiais da Prefeitura do Rio de Janeiro.",
        tips: [
          "Clique nos cards para ver detalhes expandidos",
          "A variação anual compara os últimos 12 meses com os 12 meses anteriores",
        ],
      },
      {
        title: "Gráfico de Evolução",
        description: "Histórico de preços desde 2020. Alterne entre visualização Semestral ou Anual e filtre por tipologia (Apartamento vs Casa).",
        tips: [
          "Passe o mouse sobre os pontos para ver valores exatos",
          "Use o seletor de bairro no topo para mudar a região analisada",
        ],
      },
      {
        title: "Evolução por Microbairro",
        description: "Comparativo entre as microregiões. Identifique quais áreas estão se valorizando mais rapidamente.",
      },
      {
        title: "Ranking de Microbairros",
        description: "Lista ordenada por preço médio do m². Clique em um item para ver mediana, mínimo, máximo e total de transações.",
      },
      {
        title: "Exportação de Dados",
        description: "Exporte o dashboard completo em PDF, Excel ou CSV. Opção de Backup Completo com todas as transações do banco.",
        tips: [
          "Use o menu dropdown 'Exportar' no canto superior direito",
          "O backup completo pode levar alguns segundos para gerar",
        ],
      },
    ],
  },
  {
    id: "microregioes",
    title: "Microregiões",
    icon: MapPin,
    description: "Análise detalhada das microregiões com estatísticas específicas, tendências e comparativos.",
    route: "/microbairros",
    features: [
      {
        title: "Seleção de Microbairro",
        description: "Escolha uma microregião específica para ver estatísticas detalhadas: mediana, média, mínimo, máximo e número de transações.",
      },
      {
        title: "Gráfico de Tendência",
        description: "Evolução histórica do preço médio por m² da microregião selecionada.",
      },
      {
        title: "Comparativo",
        description: "Compare até 4 microregiões simultaneamente para identificar oportunidades.",
      },
    ],
  },
  {
    id: "pesquisas",
    title: "Pesquisas de Mercado",
    icon: Search,
    description: "Ferramentas de busca avançada para localizar transações por endereço ou faixa de valor.",
    route: "/pesquisas-mercado",
    features: [
      {
        title: "Busca por Localização",
        description: "Digite o nome de uma rua ou condomínio. O sistema sugere automaticamente enquanto você digita. Resultados mostram todas as transações do endereço.",
        tips: [
          "Use nomes parciais para busca mais ampla",
          "Filtre por tipologia (Apto/Casa) para resultados mais específicos",
        ],
      },
      {
        title: "Busca por Faixa de Valor",
        description: "Encontre logradouros por faixa de preço (R$ 100 mil a R$ 100 milhões). Ideal para identificar regiões dentro do orçamento do cliente.",
      },
      {
        title: "Filtros Avançados",
        description: "Refine por: bairro, tipologia, período (6 a 24 meses) e faixa de área em m².",
      },
      {
        title: "Exportação de Resultados",
        description: "Exporte os resultados filtrados em Excel ou CSV para análises externas ou apresentações.",
      },
    ],
  },
  {
    id: "avaliacao",
    title: "Avaliação Imobiliária",
    icon: Calculator,
    description: "Motor de Avaliação Godoy Prime: calcule o valor de mercado usando dados oficiais + anúncios com 26 características.",
    route: "/avaliacao-imobiliaria",
    features: [
      {
        title: "Etapa 1: Identificação",
        description: "Informe os dados do imóvel: endereço, tipo (Casa/Apartamento), metragem, quartos, suítes, vagas e dados do proprietário.",
        tips: [
          "Use o autocomplete de endereço para agilizar o preenchimento",
          "Metragem e quartos são obrigatórios",
        ],
      },
      {
        title: "Etapa 2: Localização",
        description: "Busque a rua para ver estatísticas oficiais da região. Opcionalmente, insira dados de anúncios para combinação 70% dados oficiais + 30% mercado.",
        tips: [
          "Compare os valores oficiais com anúncios atuais do mercado",
          "Se não houver transações na rua, o sistema usa dados do microbairro",
        ],
      },
      {
        title: "Etapa 3: Dados Básicos",
        description: "Confirme a área do imóvel e escolha a base de preço: apenas dados oficiais, combinada (Oficiais+Anúncios) ou valor customizado por m².",
      },
      {
        title: "Etapa 4: Questionário de Características",
        description: "26 características em 5 categorias: Posição/Vista, Conservação, Conforto, Segurança e Funcionalidade. Cada resposta ajusta o valor final em percentual.",
        tips: [
          "Marque apenas características que realmente se aplicam ao imóvel",
          "O ajuste total tem limites (cap) por categoria para evitar distorções",
        ],
      },
      {
        title: "Etapa 5: Resultados",
        description: "Três cenários de valor: Pessimista (-10%), Provável (base) e Otimista (+10%). Veja o spread percentual e o nível de confiança (Verde ≥80%, Amarelo ≥60%, Vermelho <60%).",
        tips: [
          "Confiança alta (verde): muitos dados e baixa variância",
          "Confiança média (amarela): dados suficientes mas com variância",
          "Confiança baixa (vermelha): poucos dados na região",
        ],
      },
      {
        title: "Etapa 6: Recomendação",
        description: "Recomendação final com próximos passos. Opções: Prosseguir para Vistoria Digital completa ou Gerar relatório PDF simplificado.",
      },
    ],
  },
  {
    id: "historico",
    title: "Histórico de Avaliações",
    icon: History,
    description: "Registro de todas as avaliações realizadas com filtros e exportação.",
    route: "/historico-avaliacoes",
    features: [
      {
        title: "Lista de Avaliações",
        description: "Todas as avaliações ordenadas por data. Veja endereço, área, valor final, confiança e status do PDF.",
      },
      {
        title: "Filtros",
        description: "Filtre por período, endereço ou nível de confiança para encontrar avaliações específicas.",
      },
      {
        title: "Ações",
        description: "Visualize detalhes, gere PDF ou exclua avaliações antigas.",
      },
    ],
  },
  {
    id: "vistoria",
    title: "Vistoria Digital",
    icon: ClipboardCheck,
    description: "Checklist completo para Casa (20 categorias) ou Apartamento (18 categorias) com pontuação e fotos.",
    route: "/vistoria-digital",
    features: [
      {
        title: "Seleção de Tipo",
        description: "Escolha entre Casa (~55 itens em 20 categorias) ou Apartamento (~50 itens em 18 categorias).",
      },
      {
        title: "Dados do Imóvel",
        description: "Preencha endereço (com autocomplete), tipo, metragem, cômodos, proprietário e data.",
      },
      {
        title: "Checklist de Vistoria",
        description: "Avalie cada item de 1 (Crítico) a 5 (Excelente) ou N/A. Use o ícone de câmera para adicionar fotos.",
        tips: [
          "No mobile, deslize horizontalmente para navegar entre categorias",
          "Itens críticos (nota 1 ou 2) são destacados no relatório final",
        ],
      },
      {
        title: "Score Automático",
        description: "Pontuação global (0-100) calculada em tempo real. Verde (≥80), Amarelo (≥60), Vermelho (<60).",
      },
      {
        title: "Laudo PDF",
        description: "Gere relatório profissional (5-7 páginas) com capa, resumo executivo, radar de diagnóstico, checklist completo e galeria de fotos.",
        tips: [
          "Disponível após 50% de preenchimento",
          "Inclui assinatura do avaliador e data",
        ],
      },
      {
        title: "Integração com Avaliação",
        description: "Após a vistoria, vá para Avaliação Imobiliária com todos os dados pré-preenchidos.",
      },
    ],
  },
  {
    id: "visitas",
    title: "Agendamento de Visitas",
    icon: CalendarCheck,
    description: "Gestão completa de visitas: agendamento, fichas, assinaturas digitais e feedback.",
    route: "/visitas",
    features: [
      {
        title: "Dashboard de Visitas",
        description: "Métricas: total de visitas, pendentes, taxa de conversão e média por corretor. Gráficos de evolução mensal.",
      },
      {
        title: "Novo Agendamento",
        description: "Crie visitas com: dados do cliente (nome, telefone, email), imóvel (endereço, código), data/hora e tipo de serviço.",
        tips: [
          "Tipos: Visita, Avaliação, Consultoria ou Fotografia",
          "O sistema envia lembretes automáticos por email",
        ],
      },
      {
        title: "Disponibilidade",
        description: "Gerencie sua agenda de horários. Defina dias e horários disponíveis para agendamentos.",
      },
      {
        title: "Fichas de Visita",
        description: "Registro completo: dados do visitante, declaração de intermediação e observações. Inclui assinatura digital do cliente e corretor.",
        tips: [
          "Envie link de assinatura por WhatsApp ou email",
          "Assinaturas ficam registradas com data/hora",
        ],
      },
      {
        title: "Feedback Pós-Visita",
        description: "Colete feedback do cliente: avaliação do imóvel, interesse, percepção de valor e intenção de proposta.",
      },
      {
        title: "Ranking de Corretores",
        description: "Acompanhe o desempenho da equipe por número de visitas realizadas.",
      },
      {
        title: "Relatório PDF de Feedbacks",
        description: "Exporte o dashboard analítico de feedbacks em PDF com KPIs, gráficos e análises detalhadas. Envie o relatório por email diretamente pela plataforma.",
        tips: [
          "Use o botão 'Exportar PDF' no painel de feedbacks analíticos",
          "Envie por email usando 'Enviar por Email' com destinatário personalizado",
        ],
      },
    ],
  },
  {
    id: "modo-demo",
    title: "Modo Demonstração",
    icon: Play,
    description: "Ambiente de demonstração com dados fictícios para apresentar a plataforma a clientes e parceiros.",
    route: "/apresentacao",
    features: [
      {
        title: "Página de Apresentação",
        description: "Landing page profissional em /apresentacao com visão geral dos módulos, diferenciais e botão para explorar a demonstração interativa.",
      },
      {
        title: "Demonstração Interativa",
        description: "Acesso completo a todos os módulos da plataforma com dados fictícios realistas da Barra da Tijuca, sem necessidade de login.",
        tips: [
          "Acesse /demo para navegar por todos os módulos",
          "Dados são 100% fictícios e não afetam o banco de dados real",
          "Ideal para apresentações comerciais a imobiliárias",
        ],
      },
      {
        title: "Módulos Disponíveis no Demo",
        description: "Dashboard, Microregiões, Pesquisas, Avaliação, Vistoria, Visitas, Leads, Históricos e Configurações — todos com dados simulados.",
      },
    ],
  },
  {
    id: "documentacao",
    title: "Documentação (Due Diligence)",
    icon: FileText,
    description: "Checklist completo para garantir segurança jurídica em transações imobiliárias.",
    route: "/documentacao",
    features: [
      {
        title: "Checklist Dinâmico",
        description: "Lista de documentos necessários para Vendedor e Comprador. Marque os itens conforme coleta.",
        tips: [
          "Configure o perfil (empresário, união estável) para ver documentos adicionais",
          "O progresso é salvo automaticamente no navegador",
        ],
      },
      {
        title: "Análise Inteligente de Documentos",
        description: "Use IA para analisar documentos enviados e identificar automaticamente qual item do checklist ele corresponde.",
      },
      {
        title: "Exportação PDF",
        description: "Gere checklists separados: Vendedor, Comprador ou Documentação Completa.",
      },
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Cog,
    description: "Personalize a plataforma com dados da empresa, logo e configurações do sistema.",
    route: "/configuracoes",
    features: [
      {
        title: "Dados da Empresa",
        description: "Configure: Nome da empresa, CNPJ, CRECI, telefone, email e endereço. Esses dados aparecem nos relatórios PDF.",
      },
      {
        title: "Logo da Empresa",
        description: "Faça upload do logo para personalizar cabeçalhos e relatórios.",
        tips: [
          "Formato recomendado: PNG com fundo transparente",
          "Tamanho máximo: 2MB",
        ],
      },
      {
        title: "Preview do Rodapé",
        description: "Visualize como o rodapé dos PDFs aparecerá com os dados configurados.",
      },
    ],
  },
  {
    id: "sofia",
    title: "Assistente Sofia (IA)",
    icon: MessageSquare,
    description: "Assistente de mercado com inteligência artificial para consultas e análises.",
    features: [
      {
        title: "Consultas de Mercado",
        description: "Pergunte sobre preços, tendências, comparativos entre bairros ou qualquer dúvida sobre o mercado imobiliário.",
        tips: [
          "Exemplos: 'Qual o preço médio na Barra?', 'Compare Leblon com Ipanema'",
          "Sofia usa dados reais do banco de transações oficiais",
        ],
      },
      {
        title: "Entrada por Voz",
        description: "Use o microfone para fazer perguntas por voz. Sofia responde em texto.",
      },
      {
        title: "Histórico",
        description: "Conversas anteriores ficam salvas durante a sessão.",
      },
    ],
  },
  {
    id: "dados-oficiais",
    title: "Sincronização de Dados",
    icon: Database,
    description: "Atualização de dados de transações diretamente da API da Prefeitura do Rio de Janeiro.",
    features: [
      {
        title: "Sincronização por Período",
        description: "Selecione ano e intervalo de meses para sincronizar. O sistema mostra quais meses já têm dados.",
        tips: [
          "Dados novos geralmente ficam disponíveis 30-60 dias após a transação",
          "Use 'Limpar dados do período' para substituir dados antigos",
        ],
      },
      {
        title: "Status de Meses",
        description: "Visualize badges indicando quais meses têm dados (verde) e quais estão faltando.",
      },
      {
        title: "Filtros Automáticos",
        description: "O sistema aplica: percentual transferido ≥90%, classificação Residencial/Comercial e cálculo de valor/m².",
      },
    ],
  },
];

const adminSections: ManualSection[] = [
  {
    id: "leads",
    title: "Gestão de Leads",
    icon: Users,
    description: "Visualize e gerencie leads capturados pela ferramenta de avaliação pública.",
    route: "/leads",
    features: [
      {
        title: "Lista de Leads",
        description: "Todos os leads com: nome, email, telefone, interesse, origem e data de cadastro.",
      },
      {
        title: "Detalhes do Lead",
        description: "Veja informações completas: imóvel de interesse, faixa de valor, diferenciais buscados.",
      },
      {
        title: "Status de Conversão",
        description: "Marque leads como convertidos para acompanhar taxa de sucesso.",
      },
    ],
  },
  {
    id: "usuarios",
    title: "Gestão de Usuários",
    icon: Users,
    description: "Administre usuários da plataforma, papéis e permissões.",
    route: "/usuarios",
    features: [
      {
        title: "Lista de Usuários",
        description: "Todos os usuários cadastrados com: nome, email, papel (admin/corretor) e última atividade.",
      },
      {
        title: "Estatísticas de Uso",
        description: "Veja atividades por usuário: logins, pesquisas, avaliações, vistorias e exportações.",
      },
    ],
  },
  {
    id: "base-conhecimento",
    title: "Base de Conhecimento Sofia",
    icon: Brain,
    description: "Gerencie o conhecimento que a IA Sofia usa para responder perguntas.",
    route: "/base-conhecimento",
    features: [
      {
        title: "Artigos",
        description: "Adicione, edite ou remova artigos que Sofia usa como referência.",
      },
      {
        title: "Categorias",
        description: "Organize o conhecimento por categorias: Mercado, Procedimentos, Legislação, etc.",
      },
    ],
  },
  {
    id: "calibrador",
    title: "Calibrador de Avaliação",
    icon: Settings,
    description: "Ajuste os pesos e multiplicadores do motor de avaliação.",
    route: "/calibrador-avaliacao",
    features: [
      {
        title: "Pesos por Característica",
        description: "Configure o impacto de cada característica no valor final do imóvel.",
      },
      {
        title: "Limites por Categoria",
        description: "Defina caps (limites máximos) de ajuste por categoria.",
      },
    ],
  },
  {
    id: "calibrador-vistoria",
    title: "Calibrador de Vistoria",
    icon: ClipboardCheck,
    description: "Configure os itens do checklist de inspeção para casas e apartamentos.",
    route: "/calibrador-vistoria",
    features: [
      {
        title: "Categorias por Tipo de Imóvel",
        description: "Gerencie categorias separadas para Casa (20 categorias) e Apartamento (19 categorias).",
      },
      {
        title: "Gerenciamento de Itens",
        description: "Adicione, edite ou remova itens de inspeção em cada categoria com descrição e dica opcional.",
      },
      {
        title: "Pesos Personalizados",
        description: "Ajuste o peso de cada categoria para influenciar o cálculo da nota de conservação.",
      },
    ],
  },
];

export default function ManualPlataforma() {
  const [selectedTab, setSelectedTab] = useState("funcionalidades");
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();
  const { startTour } = useTourNavigation();
  const isMobile = useIsMobile();

  const allSections = isAdmin ? [...manualSections, ...adminSections] : manualSections;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Manual da Plataforma
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1">
            Guia completo de todas as funcionalidades do Godoy Prime Analytics
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
            <Play className="h-4 w-4 mr-2" />
            Tour Rápido
          </Button>
          <Button 
            size="sm" 
            onClick={startTour}
            className="bg-primary hover:bg-primary/90"
          >
            <Play className="h-4 w-4 mr-2" />
            {isMobile ? 'Tour Completo' : 'Tour Multi-Página'}
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="funcionalidades" className="text-xs sm:text-sm py-2">
            <Zap className="h-4 w-4 mr-1.5" />
            Funcionalidades
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs sm:text-sm py-2">
            <HelpCircle className="h-4 w-4 mr-1.5" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionalidades" className="mt-4 space-y-4">
          {/* Quick Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Navegação Rápida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allSections.map((section) => (
                  <Badge
                    key={section.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => {
                      const element = document.getElementById(`section-${section.id}`);
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <section.icon className="h-3 w-3 mr-1" />
                    {section.title}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Admin Sections Separator */}
          {isAdmin && (
            <>
              <div className="space-y-4">
                {manualSections.map((section) => (
                  <Card key={section.id} id={`section-${section.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <section.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {section.description}
                            </CardDescription>
                          </div>
                        </div>
                        {section.route && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(section.route!)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {section.features.map((feature, idx) => (
                          <AccordionItem key={idx} value={`${section.id}-${idx}`}>
                            <AccordionTrigger className="text-sm font-medium text-left">
                              {feature.title}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {feature.description}
                                </p>
                                {feature.tips && feature.tips.length > 0 && (
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-medium text-foreground">💡 Dicas:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                      {feature.tips.map((tip, tipIdx) => (
                                        <li key={tipIdx}>• {tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator className="my-6" />
              
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Funcionalidades Administrativas</h2>
                <Badge variant="secondary">Admin</Badge>
              </div>

              <div className="space-y-4">
                {adminSections.map((section) => (
                  <Card key={section.id} id={`section-${section.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <section.icon className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {section.description}
                            </CardDescription>
                          </div>
                        </div>
                        {section.route && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(section.route!)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="multiple" className="w-full">
                        {section.features.map((feature, idx) => (
                          <AccordionItem key={idx} value={`${section.id}-${idx}`}>
                            <AccordionTrigger className="text-sm font-medium text-left">
                              {feature.title}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {feature.description}
                                </p>
                                {feature.tips && feature.tips.length > 0 && (
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-medium text-foreground">💡 Dicas:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                      {feature.tips.map((tip, tipIdx) => (
                                        <li key={tipIdx}>• {tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Non-admin view */}
          {!isAdmin && (
            <div className="space-y-4">
              {manualSections.map((section) => (
                <Card key={section.id} id={`section-${section.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <section.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base sm:text-lg">{section.title}</CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                      {section.route && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(section.route!)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {section.features.map((feature, idx) => (
                        <AccordionItem key={idx} value={`${section.id}-${idx}`}>
                          <AccordionTrigger className="text-sm font-medium text-left">
                            {feature.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                {feature.description}
                              </p>
                              {feature.tips && feature.tips.length > 0 && (
                                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                  <p className="text-xs font-medium text-foreground">💡 Dicas:</p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {feature.tips.map((tip, tipIdx) => (
                                      <li key={tipIdx}>• {tip}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Perguntas Frequentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    De onde vêm os dados de transações?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Os dados vêm da API pública da Prefeitura do Rio de Janeiro. Cada transação imobiliária registrada em cartório gera um registro oficial que é disponibilizado pela prefeitura. Usamos transações com percentual de transferência ≥90% para garantir dados de transações completas.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    Qual a diferença entre valor oficial e valor de mercado?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      O valor oficial representa transações reais efetivadas. Porém, em alguns casos, pode haver subdeclaração. Por isso, nosso motor combina 70% dados oficiais + 30% dados de anúncios quando disponíveis, para uma estimativa mais precisa do valor de mercado atual.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    Como funciona o nível de confiança da avaliação?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      O nível de confiança é calculado com base em: (1) Quantidade de transações na região - mais dados = maior confiança; (2) Variância dos valores - dados mais consistentes = maior confiança; (3) Recência dos dados - dados mais recentes = maior confiança. Verde (≥80%) indica alta confiabilidade, Amarelo (≥60%) média, Vermelho (&lt;60%) baixa.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    As avaliações podem ser usadas para fins bancários/jurídicos?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      As avaliações da plataforma são Pareceres Técnicos de Mercado (PTAM) e servem como referência comercial. Para fins de financiamento bancário ou processos judiciais, recomenda-se laudo formal assinado por engenheiro avaliador com ART, seguindo as normas ABNT NBR 14653.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-5">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    Com que frequência os dados são atualizados?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Os dados podem ser atualizados manualmente pelo administrador através do botão "Atualizar Dados" no header. A API da Prefeitura geralmente disponibiliza dados com 30-60 dias de atraso em relação à data da transação. Recomendamos sincronização mensal.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-demo-1">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    O que é o modo demonstração?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      É um ambiente completo da plataforma com dados fictícios realistas, acessível sem login pela rota /demo. Permite explorar todos os módulos (Dashboard, Avaliação, Vistoria, Visitas, Leads, etc.) sem afetar dados reais. Ideal para apresentações comerciais.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-demo-2">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    Como apresentar a plataforma para clientes?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Acesse /apresentacao para a landing page profissional com visão geral dos módulos e diferenciais. De lá, clique em "Explorar Demonstração" para navegar pelo /demo com dados fictícios. Você também pode compartilhar o link da apresentação diretamente com o cliente.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-6">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    Posso usar os relatórios PDF em apresentações para clientes?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Sim! Todos os PDFs gerados são profissionais e personalizados com seu logo e dados da empresa (configure em Configurações). São ideais para apresentação a proprietários, compradores e investidores.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-7">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    A plataforma funciona em celular?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Sim! A plataforma é totalmente responsiva. No mobile, algumas interfaces usam navegação por swipe (deslizar) e menus adaptados. A Vistoria Digital é especialmente otimizada para uso em campo no celular.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-8">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    O que é a Assistente Sofia?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      Sofia é uma assistente virtual com inteligência artificial treinada com dados do mercado imobiliário do Rio de Janeiro. Ela pode responder perguntas sobre preços, tendências, comparativos entre bairros e fornecer insights baseados nos dados reais de transações oficiais.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-9">
                  <AccordionTrigger className="text-sm font-medium text-left">
                    O que é o Calibrador de Vistoria?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">
                      O Calibrador de Vistoria é uma ferramenta administrativa para gerenciar os itens do checklist de inspeção. Permite adicionar, editar ou remover categorias e itens, além de ajustar os pesos de cada categoria separadamente para casas e apartamentos. Isso garante que a vistoria seja adaptada às necessidades específicas da sua imobiliária.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}