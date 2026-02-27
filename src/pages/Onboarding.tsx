import { useState, useMemo } from 'react';
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
  CalendarCheck,
  Target,
  Map,
  History,
  UserCog,
  BarChart2,
  Shield,
  Briefcase
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportManualPDF } from '@/utils/manualPdfExport';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';

type UserRole = 'admin' | 'gerente' | 'corretor';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  route: string;
  color: string;
  roles: UserRole[]; // Quais roles podem ver este step
  category: 'operacional' | 'gestao' | 'admin'; // Categoria do módulo
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
  roles: UserRole[]; // Quais roles podem ver esta categoria
}

// FAQs com filtro por role
const faqCategories: FAQCategory[] = [
  {
    id: "geral",
    titulo: "Geral",
    icon: <HelpCircle className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "O que é o Godoy Prime Analytics?", resposta: "É uma plataforma de inteligência para o mercado imobiliário que oferece análise de dados de vendas, avaliações automatizadas, vistorias digitais, estratégias de preço e assistente virtual para profissionais do mercado da Barra da Tijuca." },
      { pergunta: "Quem pode usar a plataforma?", resposta: "Corretores de imóveis, avaliadores, gestores imobiliários e empresas do setor imobiliário." },
      { pergunta: "A plataforma funciona no celular?", resposta: "Sim, funciona em computadores, tablets e celulares. Você pode adicionar na tela inicial do celular para acesso rápido." },
      { pergunta: "Preciso instalar algum programa?", resposta: "Não, a plataforma funciona diretamente no navegador de internet, sem necessidade de instalação." },
      { pergunta: "De onde vêm os dados da plataforma?", resposta: "Os dados são de vendas oficiais registradas na Prefeitura do Rio de Janeiro, atualizados mensalmente." },
      { pergunta: "O que é o modo demonstração?", resposta: "É um ambiente com dados fictícios que permite explorar todos os módulos da plataforma sem login. Acesse /apresentacao para a página profissional ou /demo para navegar diretamente." },
      { pergunta: "Como exportar o relatório de feedbacks?", resposta: "No módulo Agenda de Visitas, acesse o painel de Feedbacks Analíticos e clique em 'Exportar PDF' ou 'Enviar por Email' para gerar o relatório com KPIs e gráficos." }
    ]
  },
  {
    id: "dashboard",
    titulo: "Painel Principal e Indicadores",
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Com que frequência os dados são atualizados?", resposta: "Os dados são atualizados mensalmente com as vendas oficiais registradas na Prefeitura do Rio de Janeiro." },
      { pergunta: "O que significa o valor mediano por metro quadrado?", resposta: "É o valor do meio quando todos os preços são colocados em ordem. Representa melhor o mercado porque não é afetado por valores muito altos ou muito baixos." },
      { pergunta: "Como funciona a lista de regiões?", resposta: "As regiões são ordenadas pelo preço por metro quadrado, permitindo ver quais áreas são mais valorizadas." },
      { pergunta: "Posso baixar os gráficos do painel?", resposta: "Sim, você pode baixar relatórios completos em formato para impressão e dados em planilha." },
      { pergunta: "Como funciona o mapa de vendas?", resposta: "O mapa mostra a localização das vendas oficiais, permitindo ver os padrões de preços em cada região." }
    ]
  },
  {
    id: "pesquisas",
    titulo: "Pesquisas de Mercado",
    icon: <FileSearch className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Quais filtros estão disponíveis nas pesquisas?", resposta: "Localização (bairro, rua), faixa de preço (de R$ 100 mil a R$ 100 milhões), período (6 a 24 meses), tamanho e tipo de imóvel." },
      { pergunta: "Posso salvar minhas pesquisas?", resposta: "O histórico de pesquisas é salvo automaticamente para você consultar depois." },
      { pergunta: "Qual o período máximo de dados disponíveis?", resposta: "Os dados cobrem mais de 5 anos de vendas oficiais registradas." },
      { pergunta: "Como baixar os resultados das pesquisas?", resposta: "Use os botões de baixar para gerar planilhas com todos os dados encontrados." },
      { pergunta: "Posso pesquisar por condomínio específico?", resposta: "Sim, na aba de localização você pode buscar por nome do condomínio ou da rua." }
    ]
  },
  {
    id: "microbairros",
    titulo: "Análise de Regiões",
    icon: <MapPin className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "O que são as micro-regiões?", resposta: "São subdivisões dos bairros baseadas em padrões de preço e localização, permitindo análises mais detalhadas." },
      { pergunta: "Como comparar ruas diferentes?", resposta: "Use a ferramenta de comparação para adicionar até 5 ruas e ver o gráfico comparativo de preços." },
      { pergunta: "O que significa o indicador de tendência?", resposta: "Mostra se os preços estão subindo, estáveis ou caindo nos últimos períodos." },
      { pergunta: "Como funciona a análise por condomínio?", resposta: "Busque pelo nome do condomínio para ver estatísticas específicas: valor mediano, médio, mínimo, máximo e quantidade de vendas." }
    ]
  },
  {
    id: "avaliacao",
    titulo: "Avaliação de Imóveis",
    icon: <Calculator className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Quantas características são avaliadas?", resposta: "São mais de 30 características divididas em 5 categorias: Posição e Vista, Conservação, Conforto, Segurança e Funcionalidade. O número exato varia conforme o tipo de imóvel (Casa ou Apartamento)." },
      { pergunta: "O que são os 3 cenários de valor?", resposta: "São três estimativas: Conservador (valor mínimo), Provável (valor mais esperado) e Otimista (valor máximo)." },
      { pergunta: "Como é calculado o nível de confiança?", resposta: "Baseado na quantidade de vendas disponíveis na região e na consistência das características avaliadas. Verde (alto), Amarelo (médio), Vermelho (baixo)." },
      { pergunta: "Posso gerar um relatório para impressão?", resposta: "Sim, ao final da avaliação você pode gerar um relatório profissional de 5 a 7 páginas com gráficos e análises." },
      { pergunta: "As avaliações ficam salvas?", resposta: "Sim, todas as avaliações são salvas no histórico e podem ser consultadas ou atualizadas depois." },
      { pergunta: "O que é a base de preço combinada?", resposta: "É a mistura de 70% de dados oficiais de vendas com 30% de preços de anúncios para uma estimativa mais equilibrada." }
    ]
  },
  {
    id: "precificacao",
    titulo: "Estratégia de Preço",
    icon: <Target className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "O que é a Estratégia de Preço?", resposta: "É um módulo que calcula 3 estratégias de preço (Atração, Mercado, Valorização) baseado em 9 perguntas sobre o imóvel." },
      { pergunta: "Quais são as 3 estratégias disponíveis?", resposta: "Atração (venda rápida, preço menor), Mercado (equilibrada, preço de referência) e Valorização (maximização, preço maior)." },
      { pergunta: "Como o sistema recomenda uma estratégia?", resposta: "Baseado nas respostas às 9 perguntas sobre tempo no mercado, concorrência, prioridade do vendedor, etc." },
      { pergunta: "O que é o Plano de Ajuste?", resposta: "É um cronograma de reduções programadas caso o imóvel não venda no prazo inicial." },
      { pergunta: "Posso ver o valor líquido ao vendedor?", resposta: "Sim, para cada estratégia você vê o preço de anúncio, comissão estimada e valor que sobra para o vendedor." }
    ]
  },
  {
    id: "vistoria",
    titulo: "Vistoria de Imóveis",
    icon: <ClipboardCheck className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Qual a diferença entre vistoria de casa e apartamento?", resposta: "Casas têm lista com 55 itens (20 categorias) incluindo área externa, enquanto apartamentos têm 50 itens (18 categorias)." },
      { pergunta: "Como funciona a nota de conservação?", resposta: "Cada item é avaliado de 1 (Crítico) a 5 (Bom). A nota geral (0 a 100) é calculada automaticamente." },
      { pergunta: "Posso adicionar fotos à vistoria?", resposta: "Sim, você pode tirar fotos para documentar cada item avaliado. As fotos aparecem no relatório." },
      { pergunta: "O relatório de vistoria serve como laudo técnico?", resposta: "O relatório é uma documentação detalhada. Laudos técnicos oficiais precisam de engenheiro ou arquiteto habilitado." },
      { pergunta: "Posso vincular a vistoria a uma avaliação?", resposta: "Sim, ao concluir a vistoria você pode ir direto para a Avaliação com os dados já preenchidos." }
    ]
  },
  {
    id: "visitas",
    titulo: "Agenda de Visitas",
    icon: <CalendarCheck className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Como agendar uma visita?", resposta: "Clique em Nova Visita, preencha dados do cliente, imóvel, data e hora, e tipo de atendimento (visita, avaliação, consultoria, fotos)." },
      { pergunta: "O que é a ficha de visita?", resposta: "É um documento com código único contendo dados do imóvel, cliente, declaração de trabalho exclusivo e espaço para assinaturas." },
      { pergunta: "Como funciona a assinatura na tela?", resposta: "Você pode assinar diretamente na tela ou enviar um link por mensagem para que o cliente assine pelo celular." },
      { pergunta: "Como coletar opinião após a visita?", resposta: "Envie o formulário de opinião ao cliente. Ele avalia o imóvel, informa interesse e pode deixar observações." },
      { pergunta: "O que mostra o Painel de Visitas?", resposta: "Indicadores de volume, taxa de sucesso, gráfico de evolução mensal e comparativo entre corretores." },
      { pergunta: "Como gerenciar minha disponibilidade?", resposta: "Acesse Gerenciar Disponibilidade para definir dias e horários disponíveis para agendamentos." }
    ]
  },
  {
    id: "documentacao",
    titulo: "Documentação",
    icon: <FileText className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Quais documentos são verificados na lista?", resposta: "Documentos do imóvel (matrícula, IPTU), do vendedor (RG, CPF, certidões) e do comprador (RG, CPF, comprovantes)." },
      { pergunta: "Como funciona a análise de documentos pela assistente?", resposta: "Envie o documento e a assistente identifica qual item da lista corresponde e extrai informações importantes." },
      { pergunta: "O que são os perfis especiais?", resposta: "Configurações que adicionam documentos extras: Empresa (contrato social), União Estável (declaração), Comunhão de Bens (cônjuge)." },
      { pergunta: "Posso baixar listas separadas?", resposta: "Sim, você pode baixar lista separada para Vendedor, Comprador ou Completa." }
    ]
  },
  {
    id: "sofia",
    titulo: "Sofia - Assistente Virtual",
    icon: <Bot className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Que tipo de perguntas posso fazer à Sofia?", resposta: "Perguntas sobre preços de mercado, tendências, comparativos entre regiões, documentação e dúvidas sobre a plataforma." },
      { pergunta: "A Sofia pode analisar documentos?", resposta: "Sim, você pode enviar documentos para análise e a Sofia extrai informações importantes automaticamente." },
      { pergunta: "As respostas da Sofia são confiáveis?", resposta: "A Sofia usa dados oficiais e conhecimento especializado. Recomenda-se confirmar informações importantes com fontes oficiais." },
      { pergunta: "Posso usar comandos de voz?", resposta: "Sim, a Sofia aceita consultas por voz para você não precisar digitar." },
      { pergunta: "A Sofia funciona em todas as páginas?", resposta: "Sim, ela está disponível no canto inferior direito de todas as páginas da plataforma." }
    ]
  },
  {
    id: "historicos",
    titulo: "Históricos e Registros",
    icon: <History className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Onde vejo minhas avaliações anteriores?", resposta: "No menu Histórico de Avaliações você encontra todas as avaliações realizadas com filtros por data." },
      { pergunta: "Onde vejo minhas vistorias anteriores?", resposta: "No menu Histórico de Vistorias você encontra todas as vistorias com nota, tipo e data." },
      { pergunta: "Posso gerar novamente um relatório antigo?", resposta: "Sim, você pode gerar novamente relatórios de avaliações e vistorias anteriores a qualquer momento." },
      { pergunta: "Por quanto tempo os dados ficam salvos?", resposta: "Os dados ficam salvos permanentemente enquanto sua conta estiver ativa." }
    ]
  },
  {
    id: "gestao-equipe",
    titulo: "Gestão de Equipe",
    icon: <Users className="h-4 w-4" />,
    roles: ['gerente', 'admin'],
    perguntas: [
      { pergunta: "Como acompanhar o desempenho dos corretores?", resposta: "O Ranking de Corretores mostra a pontuação de cada corretor baseada em visitas realizadas, avaliações e feedbacks positivos." },
      { pergunta: "Como ver as visitas de toda a equipe?", resposta: "No módulo de Visitas você pode visualizar todas as visitas da equipe, filtrar por corretor e período." },
      { pergunta: "Posso ver relatórios consolidados da equipe?", resposta: "Sim, os indicadores do Dashboard mostram dados consolidados de toda a equipe quando você tem permissão de gerente." },
      { pergunta: "Como atribuir uma visita a outro corretor?", resposta: "Na ficha de visita você pode alterar o corretor responsável, desde que tenha permissão de gerente." }
    ]
  },
  {
    id: "admin",
    titulo: "Recursos de Administração",
    icon: <Settings className="h-4 w-4" />,
    roles: ['admin'],
    perguntas: [
      { pergunta: "Como gerenciar contatos capturados?", resposta: "Acesse a seção de Contatos para ver, filtrar e acompanhar o andamento de cada interessado." },
      { pergunta: "Quem pode acessar o ajuste de avaliação?", resposta: "Apenas administradores podem ajustar os pesos e fatores do sistema de avaliação." },
      { pergunta: "Como adicionar novos usuários?", resposta: "Administradores podem convidar novos usuários na seção Gerenciar Usuários." },
      { pergunta: "O que é registrado no histórico de atividades?", resposta: "Acessos, avaliações, vistorias, pesquisas, downloads e outras ações na plataforma." },
      { pergunta: "Como personalizar os relatórios da empresa?", resposta: "Em Configurações, envie o logotipo e configure dados da empresa (CNPJ, CRECI, contato)." }
    ]
  },
  {
    id: "suporte",
    titulo: "Suporte e Ajuda",
    icon: <HelpCircle className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Como entrar em contato com o suporte?", resposta: "Envie email para contato@godoyprime.com.br, mensagem no (21) 99725-0515 ou use a assistente Sofia." },
      { pergunta: "Existe treinamento disponível?", resposta: "Sim, oferecemos tutorial interativo, guias em cada página, manual para impressão e roteiros de vídeo." },
      { pergunta: "Como reportar um problema ou erro?", resposta: "Entre em contato pelo suporte descrevendo o problema, página onde ocorreu e passos para reproduzir." },
      { pergunta: "Há atualizações frequentes na plataforma?", resposta: "Sim, a plataforma recebe melhorias e novas funcionalidades regularmente." }
    ]
  },
  {
    id: "dicas",
    titulo: "Dicas de Uso",
    icon: <TrendingUp className="h-4 w-4" />,
    roles: ['corretor', 'gerente', 'admin'],
    perguntas: [
      { pergunta: "Qual a melhor forma de começar a usar a plataforma?", resposta: "Complete o tutorial, explore o painel principal, faça uma pesquisa de mercado e depois uma avaliação teste." },
      { pergunta: "Como obter avaliações mais precisas?", resposta: "Preencha todas as características com atenção, use base combinada e verifique as vendas da região." },
      { pergunta: "Posso usar a plataforma sem internet?", resposta: "Não, é necessária conexão com internet para acessar dados atualizados e funcionalidades da assistente." },
      { pergunta: "Devo atualizar minhas avaliações periodicamente?", resposta: "Sim, recomendamos revisar avaliações a cada 3 a 6 meses ou quando houver mudanças no mercado." },
      { pergunta: "Qual o fluxo ideal para captação?", resposta: "Vistoria, depois Avaliação, depois Estratégia de Preço e Ficha de Visita para maior eficiência." }
    ]
  }
];

// Steps de onboarding com filtro por role
const allOnboardingSteps: OnboardingStep[] = [
  // === MÓDULOS OPERACIONAIS (CORRETOR) ===
  {
    id: 1,
    title: "Painel Principal",
    description: "Visão geral do mercado imobiliário com indicadores, gráficos de evolução, lista de regiões e mapa de vendas.",
    icon: <BarChart3 className="h-8 w-8" />,
    features: [
      "Indicadores em tempo real (valor mediano, volume, variação anual)",
      "Gráfico de evolução semestral ou anual",
      "Lista de regiões por preço e volume de vendas",
      "Mapa de vendas com localização geográfica",
      "Baixar relatórios e planilhas"
    ],
    route: "/",
    color: "from-primary to-primary/70",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 2,
    title: "Análise de Regiões",
    description: "Análise detalhada por rua e condomínio, com comparação entre locais e indicadores de tendência.",
    icon: <MapPin className="h-8 w-8" />,
    features: [
      "Pesquisa por rua com sugestões automáticas",
      "Pesquisa por nome do condomínio",
      "Comparação de até 5 ruas ao mesmo tempo",
      "Gráfico de evolução por rua",
      "Separação entre Apartamentos e Casas"
    ],
    route: "/microbairros",
    color: "from-blue-500 to-blue-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 3,
    title: "Pesquisas de Mercado",
    description: "Ferramenta de busca avançada com filtros por localização, preço, período e tamanho.",
    icon: <FileSearch className="h-8 w-8" />,
    features: [
      "Aba Localização: busca por rua ou condomínio",
      "Aba por Valor: busca por faixa de preço",
      "Filtros por período (6 a 24 meses) e tipo",
      "Filtros por faixa de tamanho em metros quadrados",
      "Baixar em planilha"
    ],
    route: "/pesquisas-mercado",
    color: "from-green-500 to-green-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 4,
    title: "Avaliação de Imóveis",
    description: "Sistema de avaliação em 6 etapas com mais de 30 características e geração de relatório profissional.",
    icon: <Calculator className="h-8 w-8" />,
    features: [
      "Etapa 0: Identificação do imóvel e proprietário",
      "Etapa 1-2: Localização e dados básicos",
      "Etapa 3: Mais de 30 características em 5 categorias",
      "Etapa 4: Valores conservador, provável e otimista",
      "Etapa 5: Recomendação e relatório para impressão"
    ],
    route: "/avaliacao-imobiliaria",
    color: "from-yellow-500 to-yellow-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 5,
    title: "Estratégia de Preço",
    description: "Diagnóstico de 9 perguntas que gera 3 estratégias de preço: Atração, Mercado e Valorização.",
    icon: <Target className="h-8 w-8" />,
    features: [
      "9 perguntas sobre a situação do imóvel",
      "Estratégia Atração (venda rápida)",
      "Estratégia Mercado (equilibrada)",
      "Estratégia Valorização (máximo valor)",
      "Plano de Ajuste programado"
    ],
    route: "/avaliacao-imobiliaria",
    color: "from-indigo-500 to-indigo-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 6,
    title: "Vistoria de Imóveis",
    description: "Lista completa para inspeção técnica com registro de fotos e nota de conservação.",
    icon: <ClipboardCheck className="h-8 w-8" />,
    features: [
      "55 itens para Casas (20 categorias)",
      "50 itens para Apartamentos (18 categorias)",
      "Nota de conservação de 0 a 100",
      "Registro de fotos por item",
      "Relatório com gráfico de diagnóstico"
    ],
    route: "/vistoria-digital",
    color: "from-orange-500 to-orange-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 7,
    title: "Agenda de Visitas",
    description: "Gestão completa de visitas com fichas, assinaturas na tela e coleta de opinião do cliente.",
    icon: <CalendarCheck className="h-8 w-8" />,
    features: [
      "Agendamento com data e hora flexível",
      "Ficha de visita com código único",
      "Assinatura na tela ou por link remoto",
      "Coleta de opinião após a visita",
      "Painel com indicadores e comparativo",
      "Relatório PDF de feedbacks analíticos"
    ],
    route: "/visitas",
    color: "from-teal-500 to-teal-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 8,
    title: "Documentação",
    description: "Lista de documentos para transações imobiliárias com análise pela assistente virtual.",
    icon: <FileText className="h-8 w-8" />,
    features: [
      "Lista separada Vendedor e Comprador",
      "Perfis especiais (Empresa, União Estável)",
      "Análise de documentos pela assistente",
      "Acompanhamento de documentação coletada",
      "Baixar relatório por parte ou completo"
    ],
    route: "/documentacao",
    color: "from-purple-500 to-purple-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 9,
    title: "Mapa de Vendas",
    description: "Visualização geográfica das vendas oficiais com detalhes por localização.",
    icon: <Map className="h-8 w-8" />,
    features: [
      "Mapa interativo com marcadores",
      "Agrupamento de vendas por região",
      "Detalhes ao clicar em cada ponto",
      "Filtros por período e tipo",
      "Integração com dados do painel"
    ],
    route: "/",
    color: "from-emerald-500 to-emerald-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 10,
    title: "Sofia - Assistente Virtual",
    description: "Assistente inteligente para consultas sobre mercado imobiliário e uso da plataforma.",
    icon: <Bot className="h-8 w-8" />,
    features: [
      "Conversa em tempo real",
      "Consultas por voz (sem precisar digitar)",
      "Análise de documentos enviados",
      "Base de conhecimento especializada",
      "Disponível em todas as páginas"
    ],
    route: "/",
    color: "from-pink-500 to-pink-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 11,
    title: "Avaliação Pública",
    description: "Ferramenta de captação de leads através de avaliações rápidas para clientes externos.",
    icon: <Briefcase className="h-8 w-8" />,
    features: [
      "Formulário simplificado para clientes",
      "Captura automática de dados de contato",
      "Estimativa rápida de valor",
      "Integração com lista de leads",
      "Link compartilhável"
    ],
    route: "/avaliacao-publica",
    color: "from-cyan-500 to-cyan-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 22,
    title: "CRM / Pipeline",
    description: "Pipeline visual Kanban com 8 estágios para gerenciar leads, acompanhar conversões e otimizar o funil de vendas.",
    icon: <Briefcase className="h-8 w-8" />,
    features: [
      "Quadro Kanban com arrastar e soltar",
      "8 estágios de conversão configuráveis",
      "Métricas de funil e conversão",
      "Histórico de atividades por lead",
      "Notas e acompanhamento de interações"
    ],
    route: "/pipeline-crm",
    color: "from-violet-500 to-violet-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  {
    id: 23,
    title: "Propostas Digitais",
    description: "Crie propostas de compra com modelos simplificado e completo, aceite eletrônico e histórico completo.",
    icon: <FileSearch className="h-8 w-8" />,
    features: [
      "Modelo simplificado e completo",
      "Assinatura digital do proponente",
      "Aceite eletrônico do vendedor",
      "Vinculação com ficha de visita",
      "Histórico de propostas por imóvel"
    ],
    route: "/proposta-publica",
    color: "from-emerald-600 to-emerald-400",
    roles: ['corretor', 'gerente', 'admin'],
    category: 'operacional'
  },
  
  // === MODO DEMONSTRAÇÃO ===
  {
    id: 21,
    title: "Modo Demonstração",
    description: "Apresente a plataforma a clientes e parceiros com dados fictícios realistas, sem necessidade de login.",
    icon: <Search className="h-8 w-8" />,
    features: [
      "Página de apresentação profissional (/apresentacao)",
      "Acesso completo sem login em /demo",
      "Dados fictícios realistas da Barra da Tijuca",
      "Todos os módulos disponíveis para explorar",
      "Ideal para reuniões comerciais com imobiliárias"
    ],
    route: "/apresentacao",
    color: "from-cyan-500 to-cyan-400",
    roles: ['admin'],
    category: 'admin'
  },

  // === MÓDULOS DE GESTÃO (GERENTE) ===
  {
    id: 12,
    title: "Ranking de Corretores",
    description: "Acompanhe o desempenho da equipe com métricas de visitas, avaliações e feedbacks.",
    icon: <BarChart2 className="h-8 w-8" />,
    features: [
      "Pontuação por visitas realizadas",
      "Ranking por avaliações geradas",
      "Taxa de feedbacks positivos",
      "Comparativo mensal de desempenho",
      "Filtro por período"
    ],
    route: "/visitas",
    color: "from-amber-500 to-amber-400",
    roles: ['gerente', 'admin'],
    category: 'gestao'
  },
  {
    id: 13,
    title: "Gestão de Visitas da Equipe",
    description: "Visualize e gerencie todas as visitas da equipe em um só lugar.",
    icon: <Users className="h-8 w-8" />,
    features: [
      "Visão consolidada de todas as visitas",
      "Filtro por corretor responsável",
      "Reatribuição de visitas",
      "Acompanhamento de status",
      "Indicadores de produtividade"
    ],
    route: "/visitas",
    color: "from-rose-500 to-rose-400",
    roles: ['gerente', 'admin'],
    category: 'gestao'
  },
  {
    id: 14,
    title: "Relatórios de Equipe",
    description: "Relatórios consolidados de desempenho e produtividade da equipe.",
    icon: <TrendingUp className="h-8 w-8" />,
    features: [
      "Volume de avaliações por corretor",
      "Taxa de conversão de visitas",
      "Comparativo entre períodos",
      "Exportação para planilha",
      "Gráficos de evolução"
    ],
    route: "/",
    color: "from-lime-500 to-lime-400",
    roles: ['gerente', 'admin'],
    category: 'gestao'
  },
  
  // === MÓDULOS DE ADMINISTRAÇÃO (ADMIN) ===
  {
    id: 15,
    title: "Gestão de Usuários",
    description: "Adicione, edite e gerencie os usuários da plataforma com diferentes níveis de acesso.",
    icon: <UserCog className="h-8 w-8" />,
    features: [
      "Criar novos usuários",
      "Atribuir roles (Corretor, Gerente, Admin)",
      "Ativar/desativar contas",
      "Histórico de atividades por usuário",
      "Redefinição de senhas"
    ],
    route: "/usuarios",
    color: "from-violet-500 to-violet-400",
    roles: ['admin'],
    category: 'admin'
  },
  {
    id: 16,
    title: "Gestão de Leads",
    description: "Acompanhe e gerencie todos os contatos capturados pela plataforma.",
    icon: <Briefcase className="h-8 w-8" />,
    features: [
      "Lista de leads com filtros",
      "Status de acompanhamento",
      "Origem do lead (avaliação pública, etc)",
      "Atribuição a corretores",
      "Exportação de contatos"
    ],
    route: "/leads",
    color: "from-sky-500 to-sky-400",
    roles: ['admin'],
    category: 'admin'
  },
  {
    id: 17,
    title: "Base de Conhecimento",
    description: "Gerencie o conhecimento da assistente Sofia com documentos e informações personalizadas.",
    icon: <Bot className="h-8 w-8" />,
    features: [
      "Upload de documentos de referência",
      "Edição de respostas padrão",
      "Treinamento da assistente",
      "Histórico de conversas",
      "Métricas de uso"
    ],
    route: "/base-conhecimento",
    color: "from-fuchsia-500 to-fuchsia-400",
    roles: ['admin'],
    category: 'admin'
  },
  {
    id: 18,
    title: "Calibrador de Avaliação",
    description: "Ajuste os pesos e fatores do sistema de avaliação de imóveis.",
    icon: <Settings className="h-8 w-8" />,
    features: [
      "Ajuste de pesos por característica",
      "Fatores de ajuste regionais",
      "Teste de calibração",
      "Histórico de alterações",
      "Restauração de padrões"
    ],
    route: "/calibrador-avaliacao",
    color: "from-red-500 to-red-400",
    roles: ['admin'],
    category: 'admin'
  },
  {
    id: 19,
    title: "Calibrador de Vistoria",
    description: "Configure os itens do checklist de inspeção para casas e apartamentos.",
    icon: <ClipboardCheck className="h-8 w-8" />,
    features: [
      "Gerenciar categorias de inspeção",
      "Adicionar ou remover itens do checklist",
      "Ajustar pesos por categoria",
      "Configuração separada para casa e apartamento",
      "Edição de descrições e dicas"
    ],
    route: "/calibrador-vistoria",
    color: "from-orange-500 to-orange-400",
    roles: ['admin'],
    category: 'admin'
  },
  {
    id: 20,
    title: "Configurações da Empresa",
    description: "Personalize os relatórios com logotipo e dados da empresa.",
    icon: <Shield className="h-8 w-8" />,
    features: [
      "Upload do logotipo",
      "Dados da empresa (CNPJ, CRECI)",
      "Informações de contato",
      "Personalização de relatórios",
      "Configurações gerais"
    ],
    route: "/configuracoes",
    color: "from-slate-500 to-slate-400",
    roles: ['admin'],
    category: 'admin'
  }
];

// Helper para obter a mensagem de boas-vindas por role
const getWelcomeMessage = (role: UserRole): { title: string; subtitle: string } => {
  switch (role) {
    case 'admin':
      return {
        title: 'Bem-vindo, Administrador!',
        subtitle: 'Explore todas as funcionalidades da plataforma, incluindo gestão de usuários e configurações avançadas'
      };
    case 'gerente':
      return {
        title: 'Bem-vindo, Gerente!',
        subtitle: 'Acompanhe o desempenho da equipe e acesse todas as ferramentas operacionais'
      };
    default:
      return {
        title: 'Bem-vindo ao Godoy Prime Analytics',
        subtitle: 'Conheça todas as funcionalidades da plataforma para potencializar seu trabalho'
      };
  }
};

// Helper para obter badge por role
const getRoleBadge = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return { label: 'Administrador', variant: 'destructive' as const };
    case 'gerente':
      return { label: 'Gerente', variant: 'secondary' as const };
    default:
      return { label: 'Corretor', variant: 'outline' as const };
  }
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { role: userRole } = useAuthContext();
  const { isDemo } = useDemo();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showFAQ, setShowFAQ] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');

  // Determinar o role efetivo (admin no demo para mostrar tudo)
  const effectiveRole: UserRole = isDemo ? 'admin' : (userRole as UserRole) || 'corretor';

  // Filtrar steps baseado no role do usuário
  const onboardingSteps = useMemo(() => {
    return allOnboardingSteps.filter(step => step.roles.includes(effectiveRole));
  }, [effectiveRole]);

  // Filtrar FAQs baseado no role do usuário
  const filteredFAQByRole = useMemo(() => {
    return faqCategories.filter(category => category.roles.includes(effectiveRole));
  }, [effectiveRole]);

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const step = onboardingSteps[currentStep];

  const filteredFAQ = filteredFAQByRole.map(category => ({
    ...category,
    perguntas: category.perguntas.filter(
      p => 
        p.pergunta.toLowerCase().includes(faqSearch.toLowerCase()) ||
        p.resposta.toLowerCase().includes(faqSearch.toLowerCase())
    )
  })).filter(category => category.perguntas.length > 0);

  const totalFAQCount = filteredFAQByRole.reduce((acc, cat) => acc + cat.perguntas.length, 0);
  
  // Contagem de módulos por categoria
  const moduleCountByCategory = useMemo(() => {
    const operacional = onboardingSteps.filter(s => s.category === 'operacional').length;
    const gestao = onboardingSteps.filter(s => s.category === 'gestao').length;
    const admin = onboardingSteps.filter(s => s.category === 'admin').length;
    return { operacional, gestao, admin };
  }, [onboardingSteps]);

  const welcomeMessage = getWelcomeMessage(effectiveRole);
  const roleBadge = getRoleBadge(effectiveRole);

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

  // Helper para obter a cor de fundo por categoria
  const getCategoryBadge = (category: 'operacional' | 'gestao' | 'admin') => {
    switch (category) {
      case 'operacional':
        return { label: 'Operacional', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'gestao':
        return { label: 'Gestão', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
      case 'admin':
        return { label: 'Administração', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    }
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
          <div className="flex justify-center mb-3">
            <Badge variant={roleBadge.variant} className="text-sm">
              {roleBadge.label}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {welcomeMessage.title}
          </h1>
          <p className="text-muted-foreground">
            {welcomeMessage.subtitle}
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
                <div className="flex justify-center gap-2 mb-2">
                  <Badge className={getCategoryBadge(step.category).className}>
                    {getCategoryBadge(step.category).label}
                  </Badge>
                </div>
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

        {/* Quick Stats - Agora mostra por categoria */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{onboardingSteps.length}</div>
            <div className="text-xs text-muted-foreground">Módulos Disponíveis</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{moduleCountByCategory.operacional}</div>
            <div className="text-xs text-muted-foreground">Operacionais</div>
          </Card>
          {moduleCountByCategory.gestao > 0 && (
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{moduleCountByCategory.gestao}</div>
              <div className="text-xs text-muted-foreground">Gestão</div>
            </Card>
          )}
          {moduleCountByCategory.admin > 0 && (
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{moduleCountByCategory.admin}</div>
              <div className="text-xs text-muted-foreground">Administração</div>
            </Card>
          )}
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{totalFAQCount}+</div>
            <div className="text-xs text-muted-foreground">Perguntas FAQ</div>
          </Card>
        </div>
      </div>
    </>
  );
}
