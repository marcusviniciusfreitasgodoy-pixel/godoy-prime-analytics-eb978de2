import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from "react-joyride";
import { useIsMobile } from "@/hooks/use-mobile";

// ==================== DESKTOP TOUR STEPS ====================
const desktopTourSteps: Step[] = [
  // Painel Principal - Visão Geral
  {
    target: '[data-tour="kpis"]',
    content: 'Indicadores principais do mercado: Preço Médio por metro quadrado, Volume de vendas, Variação Anual e Região mais valorizada. Dados baseados em vendas oficiais da Prefeitura do RJ.',
    disableBeacon: true,
    placement: 'bottom',
    title: '📊 Indicadores do Mercado',
  },
  {
    target: '[data-tour="bairro-selector"]',
    content: 'Selecione o bairro para análise. Todos os gráficos e indicadores serão atualizados para mostrar dados da região escolhida.',
    placement: 'bottom',
    title: '🗺️ Seletor de Bairro',
  },
  {
    target: '[data-tour="evolution-chart"]',
    content: 'Gráfico de evolução histórica do mercado desde 2020. Alterne entre visualização Semestral ou Anual e veja tendências por tipo de imóvel (Apartamento ou Casa).',
    placement: 'top',
    title: '📈 Evolução de Preços',
  },
  {
    target: '[data-tour="microbairro-chart"]',
    content: 'Evolução comparativa entre as regiões. Identifique quais áreas estão valorizando mais rapidamente.',
    placement: 'top',
    title: '🗺️ Evolução por Região',
  },
  {
    target: '[data-tour="microbairro-ranking"]',
    content: 'Lista das regiões por preço médio do metro quadrado. Clique em uma região para ver detalhes como valor mediano, mínimo, máximo e total de vendas.',
    placement: 'top',
    title: '🏆 Lista de Regiões',
  },
  {
    target: '[data-tour="transaction-map"]',
    content: 'Mapa interativo com vendas geolocalizadas. Clique em um marcador para ver detalhes da venda. Use o zoom para explorar regiões específicas.',
    placement: 'top',
    title: '🗺️ Mapa de Vendas',
  },
  
  // Navegação Principal
  {
    target: '[data-tour="nav-microregioes"]',
    content: 'Análise detalhada por rua e condomínio. Compare até 5 ruas, veja evolução de preços e indicadores de tendência.',
    placement: 'right',
    title: '📍 Análise de Regiões',
  },
  {
    target: '[data-tour="nav-pesquisas"]',
    content: 'Pesquise por localização (rua ou condomínio) ou por faixa de preço (de R$ 100 mil a R$ 100 milhões). Baixe resultados em planilha.',
    placement: 'right',
    title: '🔍 Pesquisas de Mercado',
  },
  {
    target: '[data-tour="nav-avaliacao"]',
    content: 'Motor de Avaliação: 6 etapas, mais de 30 características, 3 cenários de valor. Base combinada de dados oficiais e anúncios. Gera relatório profissional para impressão.',
    placement: 'right',
    title: '🧮 Avaliação de Imóveis',
  },
  {
    target: '[data-tour="nav-historico"]',
    content: 'Histórico de todas as avaliações realizadas. Filtre por data, endereço ou nível de confiança. Gere novamente relatórios e acompanhe sua produtividade.',
    placement: 'right',
    title: '📋 Histórico de Avaliações',
  },
  {
    target: '[data-tour="nav-vistoria"]',
    content: 'Vistoria de Imóveis: Casa (55 itens, 20 categorias) ou Apartamento (50 itens, 18 categorias). Nota de 0 a 100, fotos por item, relatório com gráfico de diagnóstico.',
    placement: 'right',
    title: '📝 Vistoria de Imóveis',
  },
  {
    target: '[data-tour="nav-historico-vistorias"]',
    content: 'Histórico de vistorias realizadas. Veja nota, tipo de imóvel, data e gere novamente relatórios a qualquer momento.',
    placement: 'right',
    title: '📋 Histórico de Vistorias',
  },
  {
    target: '[data-tour="nav-visitas"]',
    content: 'Gestão completa: agende, crie fichas com código único, colete assinaturas na tela, envie formulário de opinião. Painel com indicadores, comparativo entre corretores e exportação de relatórios analíticos de feedbacks em PDF.',
    placement: 'right',
    title: '📅 Agenda de Visitas',
  },
  {
    target: '[data-tour="nav-documentacao"]',
    content: 'Lista de Documentos separada Vendedor e Comprador. Perfis especiais (Empresa, União Estável). Analise documentos com a assistente virtual.',
    placement: 'right',
    title: '📚 Documentação',
  },
  {
    target: '[data-tour="nav-crm"]',
    content: 'Pipeline CRM com quadro Kanban de 8 estágios. Gerencie leads, acompanhe conversões e receba notificações automáticas.',
    placement: 'right',
    title: '📋 CRM / Pipeline',
  },
  {
    target: '[data-tour="nav-configuracoes"]',
    content: 'Configure dados da empresa (nome, CNPJ, CRECI), envie o logotipo e personalize todos os relatórios gerados.',
    placement: 'right',
    title: '⚙️ Configurações',
  },
  
  // Assistente Sofia
  {
    target: '[data-tour="sofia-assistant"]',
    content: 'Sofia é sua assistente de mercado com inteligência artificial. Pergunte sobre preços, tendências, comparativos. Aceita voz e analisa documentos!',
    placement: 'left',
    title: '🤖 Assistente Sofia',
  },
  
  // Exportação
  {
    target: '[data-tour="export-button"]',
    content: 'Baixe dados em planilha ou relatório para impressão. Inclui opção de cópia completa com todas as vendas para análises externas.',
    placement: 'bottom',
    title: '📥 Baixar Dados',
  },
  
  // Sincronização Dados Oficiais (admin)
  {
    target: '[data-tour="sync-itbi"]',
    content: 'Sincronize dados de vendas oficiais diretamente da Prefeitura. Selecione ano e mês e atualize a base de dados.',
    placement: 'bottom',
    title: '🔄 Atualizar Dados',
  },
  
  // Manual
  {
    target: '[data-tour="nav-onboarding"]',
    content: 'Manual completo com 11 módulos, mais de 60 perguntas frequentes e tutoriais guiados. Baixe o material ou reinicie este tour a qualquer momento!',
    placement: 'right',
    title: '📖 Manual e Tutorial',
  },
];

// ==================== MOBILE TOUR STEPS ====================
const mobileTourSteps: Step[] = [
  // Passo 1: Introdução Mobile
  {
    target: 'body',
    content: 'Bem-vindo ao Godoy Prime! 📱 Este tour foi adaptado para seu dispositivo móvel. Vamos conhecer as principais funcionalidades.',
    disableBeacon: true,
    placement: 'center',
    title: '🚀 Tour Mobile',
  },
  
  // Passo 2: Menu Hambúrguer
  {
    target: '[data-tour="mobile-menu"]',
    content: 'Toque aqui para abrir o menu de navegação. No menu você encontra todas as seções: Avaliações, Vistorias, Pesquisas e muito mais.',
    placement: 'bottom',
    title: '☰ Menu de Navegação',
  },
  
  // Passo 3: KPIs (cards adaptados)
  {
    target: '[data-tour="kpis"]',
    content: 'Indicadores do mercado em tempo real. Deslize os cards para ver: Preço Médio, Liquidez, Variação Anual e Região mais valorizada.',
    placement: 'bottom',
    title: '📊 Indicadores',
  },
  
  // Passo 4: Seletor de Bairro
  {
    target: '[data-tour="bairro-selector"]',
    content: 'Selecione o bairro para análise. Todos os dados serão filtrados para a região escolhida.',
    placement: 'bottom',
    title: '🗺️ Escolha o Bairro',
  },
  
  // Passo 5: Gráficos (scroll)
  {
    target: '[data-tour="evolution-chart"]',
    content: 'Role para baixo para ver os gráficos de evolução. Toque no gráfico para alternar entre visualização Semestral e Anual.',
    placement: 'top',
    title: '📈 Gráficos',
  },
  
  // Passo 6: Ranking
  {
    target: '[data-tour="microbairro-ranking"]',
    content: 'Lista das regiões mais valorizadas. Toque em uma região para expandir e ver detalhes.',
    placement: 'top',
    title: '🏆 Ranking de Regiões',
  },
  
  // Passo 7: Assistente Sofia
  {
    target: '[data-tour="sofia-assistant"]',
    content: 'Sofia é sua assistente de IA! Toque para abrir e pergunte sobre preços, tendências ou análises. Use o microfone para comandos de voz.',
    placement: 'top',
    title: '🤖 Assistente Sofia',
  },
  
  // Passo 8: Próximos Passos
  {
    target: 'body',
    content: 'Explore o menu para acessar:\n\n• 🧮 Avaliação de Imóveis\n• 📝 Vistoria Digital\n• 📅 Agenda de Visitas\n• 🔍 Pesquisas de Mercado\n\nO manual completo está disponível em "Manual / Tour".',
    placement: 'center',
    title: '✨ Próximos Passos',
  },
];

// Filter steps to only include those with existing targets
const getVisibleSteps = (steps: Step[]): Step[] => {
  return steps.filter(step => {
    const target = step.target as string;
    // 'body' target is always available
    if (target === 'body') return true;
    const element = document.querySelector(target);
    return element !== null;
  });
};

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
}

export function GuidedTour({ run, onFinish }: GuidedTourProps) {
  const isMobile = useIsMobile();
  const [visibleSteps, setVisibleSteps] = useState<Step[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Prepare steps when tour starts
  useEffect(() => {
    if (run) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const baseSteps = isMobile ? mobileTourSteps : desktopTourSteps;
        const steps = getVisibleSteps(baseSteps);
        console.log(`[GuidedTour] ${isMobile ? 'Mobile' : 'Desktop'} mode: ${steps.length} of ${baseSteps.length} steps visible`);
        setVisibleSteps(steps);
        setIsReady(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
      setVisibleSteps([]);
    }
  }, [run, isMobile]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, type } = data;
    
    console.log('[GuidedTour] Callback:', { status, action, type });
    
    // Handle finish or skip
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      console.log('[GuidedTour] Tour finished or skipped');
      setIsReady(false);
      onFinish();
      return;
    }
    
    // Handle close button
    if (action === ACTIONS.CLOSE) {
      console.log('[GuidedTour] Tour closed');
      setIsReady(false);
      onFinish();
      return;
    }
    
    // Handle errors - skip to next step if target not found
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.log('[GuidedTour] Target not found, continuing...');
    }
  }, [onFinish]);

  // Don't render until ready
  if (!run || !isReady || visibleSteps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={visibleSteps}
      run={isReady}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose={false}
      spotlightClicks
      callback={handleCallback}
      scrollToFirstStep
      disableScrolling={false}
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          primaryColor: '#D4AF37',
          textColor: '#0C2340',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          zIndex: 10000,
          // Mobile: tooltip mais largo
          width: isMobile ? 300 : 380,
        },
        buttonNext: {
          backgroundColor: '#D4AF37',
          color: '#0C2340',
          fontWeight: 600,
          padding: isMobile ? '10px 16px' : '8px 12px',
          fontSize: isMobile ? '14px' : '13px',
        },
        buttonBack: {
          color: '#0C2340',
          padding: isMobile ? '10px 16px' : '8px 12px',
        },
        buttonSkip: {
          color: '#666',
          fontSize: isMobile ? '14px' : '13px',
        },
        tooltip: {
          borderRadius: '12px',
          padding: isMobile ? '20px' : '16px',
          maxWidth: isMobile ? '90vw' : '400px',
        },
        tooltipTitle: {
          fontSize: isMobile ? '18px' : '16px',
          fontWeight: 700,
          marginBottom: '10px',
        },
        tooltipContent: {
          fontSize: isMobile ? '15px' : '14px',
          lineHeight: '1.5',
        },
        spotlight: {
          borderRadius: '8px',
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
