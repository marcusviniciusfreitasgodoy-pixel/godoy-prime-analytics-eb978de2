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
  {
    target: '[data-tour="transaction-map"]',
    content: 'Mapa interativo com transações geolocalizadas. Clique em um marcador para ver detalhes da transação. Use zoom para explorar regiões específicas.',
    placement: 'top',
    title: '🗺️ Mapa de Transações',
  },
  
  // Navegação Principal
  {
    target: '[data-tour="nav-microregioes"]',
    content: 'Análise detalhada por logradouro e condomínio. Compare até 5 ruas, veja evolução de preços e indicadores de tendência.',
    placement: 'right',
    title: '📍 Microregiões',
  },
  {
    target: '[data-tour="nav-pesquisas"]',
    content: 'Pesquise por localização (rua/condomínio) ou por faixa de valor (R$ 100 mil a R$ 100 mi). Exporte resultados em Excel ou CSV.',
    placement: 'right',
    title: '🔍 Pesquisas de Mercado',
  },
  {
    target: '[data-tour="nav-avaliacao"]',
    content: 'Motor de Avaliação: 6 etapas, 26 características, 3 cenários de valor. Base combinada 70% dados oficiais + 30% anúncios. Gera laudo PDF profissional.',
    placement: 'right',
    title: '🧮 Avaliação Imobiliária',
  },
  {
    target: '[data-tour="nav-precificacao"]',
    content: 'Estratégia de Precificação: 9 perguntas diagnósticas geram 3 estratégias (Atração, Mercado, Premium) com preço de anúncio, comissão e líquido ao vendedor.',
    placement: 'right',
    title: '🎯 Estratégia de Precificação',
  },
  {
    target: '[data-tour="nav-historico"]',
    content: 'Histórico de todas as avaliações realizadas. Filtre por data, endereço ou nível de confiança. Regenere PDFs e acompanhe sua produtividade.',
    placement: 'right',
    title: '📋 Histórico de Avaliações',
  },
  {
    target: '[data-tour="nav-vistoria"]',
    content: 'Vistoria Digital: Casa (55+ itens, 20 categorias) ou Apartamento (50+ itens, 18 categorias). Score 0-100, fotos por item, laudo PDF com radar.',
    placement: 'right',
    title: '📝 Vistoria Digital',
  },
  {
    target: '[data-tour="nav-historico-vistorias"]',
    content: 'Histórico de vistorias realizadas. Veja score, tipo de imóvel, data e regenere laudos PDF a qualquer momento.',
    placement: 'right',
    title: '📋 Histórico de Vistorias',
  },
  {
    target: '[data-tour="nav-visitas"]',
    content: 'Gestão completa: agende, crie fichas com código único, colete assinaturas digitais, envie feedback. Dashboard com KPIs e ranking de corretores.',
    placement: 'right',
    title: '📅 Agendamento de Visitas',
  },
  {
    target: '[data-tour="nav-documentacao"]',
    content: 'Checklist de Due Diligence separado Vendedor/Comprador. Perfis condicionais (PJ, União Estável). Analise documentos com IA.',
    placement: 'right',
    title: '📚 Documentação',
  },
  {
    target: '[data-tour="nav-configuracoes"]',
    content: 'Configure dados da empresa (nome, CNPJ, CRECI), faça upload do logo e personalize todos os PDFs gerados.',
    placement: 'right',
    title: '⚙️ Configurações',
  },
  
  // Assistente Sofia
  {
    target: '[data-tour="sofia-assistant"]',
    content: 'Sofia é sua assistente IA de mercado. Pergunte sobre preços, tendências, comparativos. Aceita voz e analisa documentos!',
    placement: 'left',
    title: '🤖 Assistente Sofia',
  },
  
  // Exportação
  {
    target: '[data-tour="export-button"]',
    content: 'Exporte dados em Excel, CSV ou PDF. Inclui opção de Backup Completo com todas as transações para análises externas.',
    placement: 'bottom',
    title: '📥 Exportar Dados',
  },
  
  // Sincronização Dados Oficiais (admin)
  {
    target: '[data-tour="sync-itbi"]',
    content: 'Sincronize dados de transações ITBI diretamente da API da Prefeitura. Selecione ano/mês e atualize o banco de dados.',
    placement: 'bottom',
    title: '🔄 Atualizar Dados',
  },
  
  // Manual
  {
    target: '[data-tour="nav-onboarding"]',
    content: 'Manual completo com 11 módulos, 60+ FAQs e tours guiados. Baixe o PDF ou reinicie este tour a qualquer momento!',
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
