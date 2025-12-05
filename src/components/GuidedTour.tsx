import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

const tourSteps: Step[] = [
  {
    target: '[data-tour="kpis"]',
    content: 'Aqui você encontra os indicadores-chave do mercado: Preço Médio/m², Liquidez, Variação Anual e o Bairro Mais Valorizado.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="evolution-chart"]',
    content: 'Gráfico de evolução histórica do mercado. Use as abas para ver por tipologia ou variação percentual.',
    placement: 'top',
  },
  {
    target: '[data-tour="microbairro-ranking"]',
    content: 'Ranking dos microbairros por preço médio do m². Identifique rapidamente as regiões mais valorizadas.',
    placement: 'top',
  },
  {
    target: '[data-tour="search-tools"]',
    content: 'Ferramentas de busca avançadas com três módulos especializados para análise do mercado imobiliário.',
    placement: 'top',
  },
  {
    target: '[data-tour="tab-localizacao"]',
    content: 'Busca por Localização: pesquise ruas ou condomínios e veja estatísticas como mediana, média e desvio padrão do m². Filtre por tipologia, finalidade, área e período.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-transacoes"]',
    content: 'Busca por Transações: encontre microbairros por faixa de valor, bairro, tipologia e área. Ideal para identificar regiões com maior liquidez.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-valuation"]',
    content: 'IA Valuation: calcule o valor estimado de um imóvel com base na localização, área, características e condições. Gera preço mínimo, justo e máximo.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="advanced-report"]',
    content: 'Relatório Avançado: pesquise transações com filtros detalhados (valor, área, tipologia, ano, bairro, logradouro) e exporte resultados em PDF, Excel ou CSV.',
    placement: 'top',
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
