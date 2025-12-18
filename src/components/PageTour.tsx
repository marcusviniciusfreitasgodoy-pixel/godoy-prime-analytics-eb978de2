import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

// Tour steps for different pages
export const tourConfigs: Record<string, Step[]> = {
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
