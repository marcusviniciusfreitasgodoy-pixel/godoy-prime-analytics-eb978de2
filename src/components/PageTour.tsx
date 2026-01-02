import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

// Tour steps for different pages
export const tourConfigs: Record<string, Step[]> = {
  // Microregiões
  microbairros: [
    {
      target: '[data-tour="microbairros-selector"]',
      content: 'Selecione uma microregião específica para ver estatísticas detalhadas: mediana, média, mínimo, máximo e número de transações.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📍 Seleção de Microbairro',
    },
    {
      target: '[data-tour="microbairros-stats"]',
      content: 'Estatísticas detalhadas da microregião: preço médio, mediana, valores mínimo e máximo, e total de transações nos últimos 24 meses.',
      placement: 'bottom',
      title: '📊 Estatísticas',
    },
    {
      target: '[data-tour="microbairros-chart"]',
      content: 'Evolução histórica do preço médio por m² da microregião selecionada. Compare com outras áreas para identificar oportunidades.',
      placement: 'top',
      title: '📈 Gráfico de Evolução',
    },
  ],

  // Pesquisas de Mercado
  pesquisas: [
    {
      target: '[data-tour="pesquisas-tabs"]',
      content: 'Duas formas de busca: Localização (por rua/condomínio) e Transações (por faixa de valor). Escolha a que melhor atende sua necessidade.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📍 Abas de Pesquisa',
    },
    {
      target: '[data-tour="pesquisas-localizacao"]',
      content: 'Busque por nome de rua ou condomínio. Sistema sugere automaticamente enquanto você digita. Filtre por tipologia, área e período.',
      placement: 'bottom',
      title: '🔍 Busca por Localização',
    },
    {
      target: '[data-tour="pesquisas-transacoes"]',
      content: 'Encontre logradouros por faixa de valor (R$ 100 mil a R$ 100 milhões). Ideal para identificar regiões dentro do seu orçamento.',
      placement: 'bottom',
      title: '💰 Busca por Transações',
    },
    {
      target: '[data-tour="pesquisas-filtros"]',
      content: 'Refine sua busca: bairro, tipologia (Apto/Casa), período (6 a 24 meses) e faixa de área (m²).',
      placement: 'top',
      title: '⚙️ Filtros Avançados',
    },
    {
      target: '[data-tour="pesquisas-export"]',
      content: 'Exporte os resultados em Excel ou CSV para análises externas ou apresentações aos clientes.',
      placement: 'left',
      title: '📥 Exportar Resultados',
    },
  ],

  // Avaliação Imobiliária
  avaliacao: [
    {
      target: '[data-tour="avaliacao-progress"]',
      content: 'A avaliação segue 6 etapas sequenciais: Identificação, Localização, Dados Básicos, 26 Características, Resultados e Recomendação.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 Progresso da Avaliação',
    },
    {
      target: '[data-tour="avaliacao-step0"]',
      content: 'Informe os dados do imóvel: endereço, tipo (Casa/Apartamento), metragem, quartos, vagas e dados do proprietário.',
      placement: 'bottom',
      title: '📝 Etapa 1: Identificação',
    },
    {
      target: '[data-tour="avaliacao-step1"]',
      content: 'Busque a rua para ver estatísticas ITBI da região. Você pode inserir dados de anúncios para combinação 70% ITBI + 30% mercado.',
      placement: 'bottom',
      title: '📍 Etapa 2: Localização',
    },
    {
      target: '[data-tour="avaliacao-step2"]',
      content: 'Confirme a área do imóvel e escolha a base de preço: apenas ITBI, combinada (ITBI+Anúncios) ou valor customizado.',
      placement: 'bottom',
      title: '📐 Etapa 3: Dados Básicos',
    },
    {
      target: '[data-tour="avaliacao-step3"]',
      content: '26 características em 5 categorias: Posição/Vista, Conservação, Conforto, Segurança e Funcionalidade. Cada resposta ajusta o valor final.',
      placement: 'top',
      title: '✅ Etapa 4: Características',
    },
    {
      target: '[data-tour="avaliacao-step4"]',
      content: 'Três cenários de valor: Pessimista, Provável e Otimista. Veja o spread percentual e o nível de confiança (Verde/Amarelo/Vermelho).',
      placement: 'top',
      title: '💰 Etapa 5: Resultados',
    },
    {
      target: '[data-tour="avaliacao-step5"]',
      content: 'Recomendação final com próximos passos. Escolha entre prosseguir para Vistoria Digital completa ou gerar relatório simplificado.',
      placement: 'top',
      title: '📋 Etapa 6: Recomendação',
    },
  ],

  // Histórico de Avaliações
  historico: [
    {
      target: '[data-tour="historico-list"]',
      content: 'Todas as avaliações realizadas, ordenadas por data. Veja endereço, área, valor final, confiança e status do PDF.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📋 Lista de Avaliações',
    },
    {
      target: '[data-tour="historico-filtros"]',
      content: 'Filtre por período, endereço ou nível de confiança para encontrar avaliações específicas.',
      placement: 'bottom',
      title: '🔍 Filtros',
    },
    {
      target: '[data-tour="historico-acoes"]',
      content: 'Ações disponíveis: visualizar detalhes, gerar/baixar PDF ou excluir a avaliação.',
      placement: 'left',
      title: '⚙️ Ações',
    },
  ],

  // Vistoria Digital
  vistoria: [
    {
      target: '[data-tour="vistoria-tipo"]',
      content: 'Badge indica o tipo de vistoria selecionado: Casa (20 categorias, ~55 itens) ou Apartamento (18 categorias, ~50 itens).',
      disableBeacon: true,
      placement: 'bottom',
      title: '🏠 Tipo de Imóvel',
    },
    {
      target: '[data-tour="vistoria-score"]',
      content: 'Pontuação global (0-100) calculada automaticamente com base nas avaliações. Verde (≥80), Amarelo (≥60), Vermelho (<60). Mostra também quantidade de itens críticos e fotos.',
      placement: 'bottom',
      title: '⭐ Score e Progresso',
    },
    {
      target: '[data-tour="vistoria-dados"]',
      content: 'Preencha os dados de identificação: endereço (com autocomplete), tipo, metragem, cômodos, proprietário e data da vistoria.',
      placement: 'top',
      title: '📝 Dados do Imóvel',
    },
    {
      target: '[data-tour="vistoria-checklist"]',
      content: 'Avalie cada item de 1 (Crítico) a 5 (Excelente) ou N/A. Clique no ícone de câmera para adicionar fotos. No mobile, deslize para navegar entre categorias.',
      placement: 'top',
      title: '✅ Checklist de Vistoria',
    },
    {
      target: '[data-tour="vistoria-pdf"]',
      content: 'Gere o laudo PDF profissional (5-7 páginas) com capa, resumo executivo, radar de diagnóstico, checklist e galeria de fotos. Disponível após 50% de preenchimento.',
      placement: 'left',
      title: '📄 Gerar Laudo PDF',
    },
    {
      target: '[data-tour="vistoria-avaliacao"]',
      content: 'Após a vistoria, vá para Avaliação Imobiliária com todos os dados pré-preenchidos para calcular o valor de mercado baseado em ITBI.',
      placement: 'left',
      title: '💰 Ir para Avaliação',
    },
  ],

  // Visitas - Agendamento e Gestão
  visitas: [
    {
      target: '[data-tour="visitas-kpis"]',
      content: 'Métricas principais: total de visitas, agendamentos pendentes, taxa de conversão e média de visitas por corretor. Atualizadas em tempo real.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 KPIs de Visitas',
    },
    {
      target: '[data-tour="visitas-nova"]',
      content: 'Crie um novo agendamento de visita. Preencha dados do cliente, imóvel, data/hora e tipo de serviço (visita, avaliação, consultoria ou fotografia).',
      placement: 'bottom',
      title: '➕ Nova Visita',
    },
    {
      target: '[data-tour="visitas-disponibilidade"]',
      content: 'Gerencie sua disponibilidade de horários. Defina dias e horários disponíveis para agendamentos automáticos.',
      placement: 'bottom',
      title: '📅 Disponibilidade',
    },
    {
      target: '[data-tour="visitas-tabs"]',
      content: 'Navegue entre: Dashboard (gráficos e métricas), Agendamentos (próximas visitas), Fichas (visitas realizadas) e Ranking (desempenho dos corretores).',
      placement: 'bottom',
      title: '🗂️ Abas de Navegação',
    },
    {
      target: '[data-tour="visitas-dashboard"]',
      content: 'Visualize a evolução mensal de visitas e o ranking dos corretores por número de atendimentos.',
      placement: 'top',
      title: '📈 Dashboard',
    },
    {
      target: '[data-tour="visitas-agendamentos"]',
      content: 'Lista de visitas agendadas com status (Agendada, Confirmada, Realizada, Cancelada). Clique em um card para ver detalhes ou converter em ficha.',
      placement: 'top',
      title: '📋 Agendamentos',
    },
    {
      target: '[data-tour="visitas-fichas"]',
      content: 'Fichas de visita preenchidas com dados completos do cliente, imóvel e declaração de intermediação. Inclui assinaturas digitais e feedback.',
      placement: 'top',
      title: '📝 Fichas de Visita',
    },
    {
      target: '[data-tour="visitas-ranking"]',
      content: 'Ranking dos corretores por número de visitas realizadas. Identifique os top performers da equipe.',
      placement: 'top',
      title: '🏆 Ranking',
    },
  ],

  // Ficha de Visita Individual
  fichaVisita: [
    {
      target: '[data-tour="ficha-header"]',
      content: 'Código único da ficha, status atual e data de criação. Use o seletor ao lado para alterar o status (Agendada → Confirmada → Realizada).',
      disableBeacon: true,
      placement: 'bottom',
      title: '📋 Identificação da Ficha',
    },
    {
      target: '[data-tour="ficha-export-pdf"]',
      content: 'Gere o PDF profissional da ficha com todos os dados, declaração de intermediação e assinaturas. Ideal para arquivamento e comprovação.',
      placement: 'bottom',
      title: '📄 Exportar PDF',
    },
    {
      target: '[data-tour="ficha-imovel"]',
      content: 'Dados completos do imóvel: endereço, código interno, valor de referência e nome do proprietário. Clique em "Editar" para alterar.',
      placement: 'right',
      title: '🏠 Dados do Imóvel',
    },
    {
      target: '[data-tour="ficha-visitante"]',
      content: 'Informações do cliente visitante: nome completo, CPF, telefone e email. Essenciais para a declaração de intermediação.',
      placement: 'right',
      title: '👤 Dados do Visitante',
    },
    {
      target: '[data-tour="ficha-observacoes"]',
      content: 'Campo livre para anotações sobre a visita: impressões do cliente, pontos de interesse, objeções levantadas, etc.',
      placement: 'top',
      title: '📝 Observações',
    },
    {
      target: '[data-tour="ficha-assinaturas"]',
      content: 'Assinaturas digitais do visitante e corretor. Use o canvas para assinar diretamente ou envie o link para assinatura remota.',
      placement: 'top',
      title: '✍️ Assinaturas Digitais',
    },
    {
      target: '[data-tour="ficha-info"]',
      content: 'Resumo: data/hora da visita, corretor responsável e status das assinaturas (verde = assinado).',
      placement: 'left',
      title: '📅 Informações da Visita',
    },
    {
      target: '[data-tour="ficha-assinatura-digital"]',
      content: 'Links para assinatura remota: envie via WhatsApp ou email para que cliente e corretor assinem pelo celular, sem necessidade de estar presencial.',
      placement: 'left',
      title: '📲 Links de Assinatura',
    },
    {
      target: '[data-tour="ficha-feedback"]',
      content: 'Link para coleta de feedback pós-visita. O cliente avalia o imóvel, informa interesse e pode registrar observações. Envie por email diretamente.',
      placement: 'left',
      title: '⭐ Feedback do Cliente',
    },
  ],

  // Documentação / Due Diligence
  documentacao: [
    {
      target: '[data-tour="documentacao-progress"]',
      content: 'Barra de progresso mostra quantos documentos já foram coletados. Acompanhe o andamento da due diligence em tempo real.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 Progresso',
    },
    {
      target: '[data-tour="documentacao-analyzer"]',
      content: 'Use IA para analisar documentos enviados. O sistema identifica automaticamente qual item do checklist corresponde ao documento.',
      placement: 'bottom',
      title: '🤖 Análise Inteligente',
    },
    {
      target: '[data-tour="documentacao-perfil-vendedor"]',
      content: 'Configure o perfil do vendedor: marque se é empresário/PJ ou está em união estável para adicionar documentos específicos ao checklist.',
      placement: 'bottom',
      title: '👤 Perfil do Vendedor',
    },
    {
      target: '[data-tour="documentacao-perfil-comprador"]',
      content: 'Configure o perfil do comprador: comunhão total de bens ou união estável adiciona campos para qualificação do cônjuge.',
      placement: 'bottom',
      title: '👥 Perfil do Comprador',
    },
    {
      target: '[data-tour="documentacao-checklist"]',
      content: 'Marque os documentos conforme forem coletados. Use as tooltips (?) para ver explicações detalhadas de cada documento.',
      placement: 'top',
      title: '✅ Checklist',
    },
    {
      target: '[data-tour="documentacao-export"]',
      content: 'Exporte PDFs separados: Checklist do Vendedor, Checklist do Comprador ou Documentação Completa.',
      placement: 'left',
      title: '📄 Exportar PDF',
    },
  ],

  // Configurações
  configuracoes: [
    {
      target: '[data-tour="config-logo"]',
      content: 'Faça upload do logo da empresa. Ele aparecerá nos cabeçalhos de todos os PDFs gerados pela plataforma.',
      disableBeacon: true,
      placement: 'bottom',
      title: '🖼️ Logo da Empresa',
    },
    {
      target: '[data-tour="config-dados"]',
      content: 'Configure os dados da empresa: Nome, CNPJ, CRECI, telefone, email e endereço. Esses dados aparecem nos rodapés dos relatórios.',
      placement: 'top',
      title: '📝 Dados da Empresa',
    },
    {
      target: '[data-tour="config-preview"]',
      content: 'Visualize em tempo real como o rodapé dos PDFs aparecerá com os dados configurados.',
      placement: 'top',
      title: '👁️ Preview do Rodapé',
    },
  ],

  // Leads (Admin)
  leads: [
    {
      target: '[data-tour="leads-stats"]',
      content: 'Estatísticas gerais: total de leads, convertidos, taxa de conversão e leads na última semana.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 Estatísticas',
    },
    {
      target: '[data-tour="leads-list"]',
      content: 'Lista de todos os leads capturados. Veja nome, email, telefone, interesse, origem e data.',
      placement: 'top',
      title: '📋 Lista de Leads',
    },
    {
      target: '[data-tour="leads-detail"]',
      content: 'Clique em um lead para ver detalhes completos: imóvel de interesse, faixa de valor, diferenciais buscados.',
      placement: 'left',
      title: '🔍 Detalhes',
    },
  ],

  // Usuários (Admin)
  usuarios: [
    {
      target: '[data-tour="usuarios-list"]',
      content: 'Todos os usuários da plataforma com nome, email, papel (admin/corretor/gerente) e última atividade.',
      disableBeacon: true,
      placement: 'bottom',
      title: '👥 Lista de Usuários',
    },
    {
      target: '[data-tour="usuarios-stats"]',
      content: 'Estatísticas de uso por usuário: logins, pesquisas realizadas, avaliações, vistorias e exportações.',
      placement: 'top',
      title: '📊 Estatísticas de Uso',
    },
  ],
};

interface PageTourProps {
  page: keyof typeof tourConfigs;
  run: boolean;
  onFinish: () => void;
}

export function PageTour({ page, run, onFinish }: PageTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = tourConfigs[page] || [];

  useEffect(() => {
    if (run) {
      setStepIndex(0);
    }
  }, [run]);

  const handleCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      onFinish();
    }
    
    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  if (steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      stepIndex={stepIndex}
      callback={handleCallback}
      scrollToFirstStep
      disableScrolling={false}
      styles={{
        options: {
          primaryColor: '#D4AF37',
          textColor: '#0C2340',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: '#D4AF37',
          color: '#0C2340',
          fontWeight: 600,
        },
        buttonBack: {
          color: '#0C2340',
        },
        buttonSkip: {
          color: '#666',
        },
        tooltip: {
          borderRadius: '8px',
          padding: '16px',
        },
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: 700,
          marginBottom: '8px',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular Tour',
      }}
    />
  );
}

// Reusable tour button component
interface TourButtonProps {
  onClick: () => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function TourButton({ onClick, className, size = "sm" }: TourButtonProps) {
  return (
    <Button variant="outline" size={size} onClick={onClick} className={className}>
      <HelpCircle className="h-4 w-4 mr-2" />
      Tour
    </Button>
  );
}
