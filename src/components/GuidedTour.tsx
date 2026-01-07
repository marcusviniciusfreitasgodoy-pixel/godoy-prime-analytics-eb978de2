import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const tourSteps: Step[] = [
  // Dashboard - Visão Geral
  {
    target: '[data-tour="kpis"]',
    content: 'Indicadores-chave do mercado: Preço Médio/m², Liquidez (volume de transações), Variação Anual e Bairro Mais Valorizado. Dados baseados em transações oficiais da Prefeitura do RJ.',
    disableBeacon: true,
    placement: 'bottom',
    title: '📊 KPIs do Mercado',
  },
  {
    target: '[data-tour="bairro-selector"]',
    content: 'Selecione o bairro para análise. Todos os gráficos e KPIs serão atualizados para mostrar dados da região escolhida.',
    placement: 'bottom',
    title: '🗺️ Seletor de Bairro',
  },
  {
    target: '[data-tour="evolution-chart"]',
    content: 'Gráfico de evolução histórica do mercado desde 2020. Alterne entre visualização Semestral ou Anual e veja tendências por tipologia (Apartamento vs Casa).',
    placement: 'top',
    title: '📈 Evolução de Preços',
  },
  {
    target: '[data-tour="microbairro-chart"]',
    content: 'Evolução comparativa entre os microbairros da região. Identifique quais áreas estão se valorizando mais rapidamente.',
    placement: 'top',
    title: '🗺️ Evolução por Microbairro',
  },
  {
    target: '[data-tour="microbairro-ranking"]',
    content: 'Ranking dos microbairros por preço médio do m². Clique em um microbairro para ver detalhes como mediana, mínimo, máximo e total de transações.',
    placement: 'top',
    title: '🏆 Ranking de Microbairros',
  },
  
  // Navegação Principal
  {
    target: '[data-tour="nav-microregioes"]',
    content: 'Análise detalhada das microregiões. Veja estatísticas específicas, tendências e comparativos entre diferentes áreas.',
    placement: 'right',
    title: '📍 Microregiões',
  },
  {
    target: '[data-tour="nav-pesquisas"]',
    content: 'Ferramentas de pesquisa avançadas: busque por rua/condomínio (Localização) ou encontre microbairros por faixa de valor (Transações). Exporte resultados em PDF, Excel ou CSV.',
    placement: 'right',
    title: '🔍 Pesquisas de Mercado',
  },
  {
    target: '[data-tour="nav-avaliacao"]',
    content: 'Motor de Avaliação Godoy Prime: calcule o valor de mercado usando 70% dados oficiais + 30% anúncios. 6 etapas com 26 características geram 3 cenários de valor com nível de confiança.',
    placement: 'right',
    title: '🧮 Avaliação Imobiliária',
  },
  {
    target: '[data-tour="nav-historico"]',
    content: 'Histórico de todas as avaliações realizadas. Filtre por data, endereço ou nível de confiança. Acompanhe sua produtividade e revise avaliações anteriores.',
    placement: 'right',
    title: '📋 Histórico de Avaliações',
  },
  {
    target: '[data-tour="nav-vistoria"]',
    content: 'Vistoria Digital 3.1: checklist completo para Casa (20 categorias) ou Apartamento (18 categorias) com pontuação 1-5. Gera laudo PDF profissional com radar de diagnóstico.',
    placement: 'right',
    title: '📝 Vistoria Digital',
  },
  {
    target: '[data-tour="nav-visitas"]',
    content: 'Gestão completa de visitas: agende, acompanhe, registre fichas com assinatura digital, colete feedbacks e gere relatórios. Dashboard com KPIs e ranking de corretores.',
    placement: 'right',
    title: '📅 Agendamento de Visitas',
  },
  {
    target: '[data-tour="nav-documentacao"]',
    content: 'Checklist de Due Diligence para transações imobiliárias. Marque documentos coletados, exporte PDFs separados para Vendedor/Comprador e use IA para analisar documentos.',
    placement: 'right',
    title: '📚 Documentação',
  },
  {
    target: '[data-tour="nav-configuracoes"]',
    content: 'Configure dados da empresa (nome, CNPJ, CRECI), faça upload do logo e personalize os relatórios PDF gerados pela plataforma.',
    placement: 'right',
    title: '⚙️ Configurações',
  },
  
  // Assistente Sofia
  {
    target: '[data-tour="sofia-assistant"]',
    content: 'Sofia é sua assistente de mercado com IA. Pergunte sobre preços, tendências, comparativos entre bairros. Aceita entrada por voz e responde com dados oficiais!',
    placement: 'left',
    title: '🤖 Assistente Sofia',
  },
  
  // Exportação
  {
    target: '[data-tour="export-button"]',
    content: 'Exporte dados em Excel, CSV ou PDF. Inclui opção de Backup Completo com todas as transações do banco de dados para análises externas.',
    placement: 'bottom',
    title: '📥 Exportar Dados',
  },
  
  // Sincronização Dados Oficiais (admin)
  {
    target: '[data-tour="sync-itbi"]',
    content: 'Sincronize dados de transações oficiais diretamente da API da Prefeitura do RJ. Selecione ano e meses específicos, visualize meses faltantes e atualize o banco de dados.',
    placement: 'bottom',
    title: '🔄 Atualizar Dados',
  },
  
  // Manual
  {
    target: '[data-tour="nav-onboarding"]',
    content: 'Acesse o Manual completo da plataforma com explicações detalhadas de cada funcionalidade, dicas de uso e FAQ. Você pode reiniciar este tour a qualquer momento!',
    placement: 'right',
    title: '📖 Manual e Tour',
  },
];

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
}

export function GuidedTour({ run, onFinish }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

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

  return (
    <Joyride
      steps={tourSteps}
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
