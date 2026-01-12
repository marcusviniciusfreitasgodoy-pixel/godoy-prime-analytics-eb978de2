import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

// Tour steps for different pages
export const tourConfigs: Record<string, Step[]> = {
  // Microregiões
  microbairros: [
    {
      target: '[data-tour="microbairros-search"]',
      content: 'Pesquise por nome do logradouro. O sistema sugere automaticamente enquanto você digita.',
      disableBeacon: true,
      placement: 'bottom',
      title: '🔍 Busca por Logradouro',
    },
    {
      target: '[data-tour="microbairros-condominio"]',
      content: 'Ou pesquise por nome do condomínio para ver estatísticas específicas daquele empreendimento.',
      placement: 'bottom',
      title: '🏢 Busca por Condomínio',
    },
    {
      target: '[data-tour="microbairros-selector"]',
      content: 'Selecione uma microregião específica para ver estatísticas detalhadas: mediana, média, mínimo, máximo e número de transações.',
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
      target: '[data-tour="microbairros-compare"]',
      content: 'Compare até 5 logradouros simultaneamente. Adicione ruas para ver gráfico comparativo de evolução de preços.',
      placement: 'bottom',
      title: '📈 Comparar Logradouros',
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
      content: 'Informe os dados do imóvel: endereço, tipo (Casa/Apartamento), e dados do proprietário (nome, telefone, objetivo).',
      placement: 'bottom',
      title: '📝 Etapa 0: Identificação',
    },
    {
      target: '[data-tour="avaliacao-step1"]',
      content: 'Busque a rua para ver estatísticas oficiais ITBI. Opcionalmente insira dados de anúncios para base combinada (70% + 30%).',
      placement: 'bottom',
      title: '📍 Etapa 1: Localização',
    },
    {
      target: '[data-tour="avaliacao-step2"]',
      content: 'Confirme a área, quartos, suítes, banheiros, vagas. Escolha a base de preço: Oficial, Combinada ou Customizada.',
      placement: 'bottom',
      title: '📐 Etapa 2: Dados Básicos',
    },
    {
      target: '[data-tour="avaliacao-step3"]',
      content: '26 características em 5 categorias: Posição/Vista, Conservação, Conforto, Segurança e Funcionalidade. Cada resposta ajusta o valor.',
      placement: 'top',
      title: '✅ Etapa 3: Características',
    },
    {
      target: '[data-tour="avaliacao-step4"]',
      content: 'Três cenários de valor: Pessimista, Provável e Otimista. Veja spread percentual e nível de confiança (Verde/Amarelo/Vermelho).',
      placement: 'top',
      title: '💰 Etapa 4: Resultados',
    },
    {
      target: '[data-tour="avaliacao-step5"]',
      content: 'Recomendação final. Prossiga para Vistoria Digital, Estratégia de Precificação ou gere laudo PDF profissional.',
      placement: 'top',
      title: '📋 Etapa 5: Recomendação',
    },
  ],

  // Estratégia de Precificação
  precificacao: [
    {
      target: '[data-tour="precificacao-diagnostico"]',
      content: 'Responda 9 perguntas diagnósticas sobre o imóvel: tempo no mercado, concorrência, prioridade, horizonte de tempo, etc.',
      disableBeacon: true,
      placement: 'bottom',
      title: '🎯 Diagnóstico',
    },
    {
      target: '[data-tour="precificacao-estrategias"]',
      content: '3 estratégias calculadas: Atração (venda rápida, -5% a -10%), Mercado (equilibrada) e Premium (maximização, +5% a +10%).',
      placement: 'top',
      title: '📊 Estratégias',
    },
    {
      target: '[data-tour="precificacao-recomendacao"]',
      content: 'O sistema recomenda automaticamente a estratégia ideal baseado nas suas respostas ao diagnóstico.',
      placement: 'top',
      title: '⭐ Recomendação',
    },
    {
      target: '[data-tour="precificacao-detalhes"]',
      content: 'Para cada estratégia: preço de anúncio, comissão estimada, líquido ao vendedor e prêmio/desconto sobre valor de referência.',
      placement: 'top',
      title: '💰 Detalhes Financeiros',
    },
    {
      target: '[data-tour="precificacao-ajuste"]',
      content: 'Plano de Ajuste: cronograma de reduções programadas caso o imóvel não venda no prazo inicial.',
      placement: 'top',
      title: '📉 Plano de Ajuste',
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
      content: 'Ações disponíveis: visualizar detalhes, regenerar PDF, prosseguir para Precificação ou excluir.',
      placement: 'left',
      title: '⚙️ Ações',
    },
  ],

  // Histórico de Vistorias
  historicoVistorias: [
    {
      target: '[data-tour="historico-vistorias-list"]',
      content: 'Todas as vistorias realizadas. Veja endereço, tipo (Casa/Apto), score de conservação e data.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📋 Lista de Vistorias',
    },
    {
      target: '[data-tour="historico-vistorias-score"]',
      content: 'Score de conservação (0-100): Verde (≥80 Excelente), Amarelo (≥60 Bom), Vermelho (<60 Atenção).',
      placement: 'bottom',
      title: '⭐ Score',
    },
    {
      target: '[data-tour="historico-vistorias-acoes"]',
      content: 'Ações: visualizar detalhes, regenerar laudo PDF ou prosseguir para Avaliação Imobiliária.',
      placement: 'left',
      title: '⚙️ Ações',
    },
  ],

  // Vistoria Digital
  vistoria: [
    {
      target: '[data-tour="vistoria-tipo"]',
      content: 'Selecione o tipo: Casa (20 categorias, ~55 itens) ou Apartamento (18 categorias, ~50 itens).',
      disableBeacon: true,
      placement: 'bottom',
      title: '🏠 Tipo de Imóvel',
    },
    {
      target: '[data-tour="vistoria-score"]',
      content: 'Pontuação global (0-100) calculada automaticamente. Verde (≥80), Amarelo (≥60), Vermelho (<60). Mostra itens críticos e fotos.',
      placement: 'bottom',
      title: '⭐ Score e Progresso',
    },
    {
      target: '[data-tour="vistoria-dados"]',
      content: 'Preencha identificação: endereço (autocomplete), tipo, metragem, cômodos, proprietário e data.',
      placement: 'top',
      title: '📝 Dados do Imóvel',
    },
    {
      target: '[data-tour="vistoria-checklist"]',
      content: 'Avalie cada item: OK (5), Atenção (3), Crítico (1), Não Verificado ou N/A. Clique na câmera para adicionar fotos.',
      placement: 'top',
      title: '✅ Checklist de Vistoria',
    },
    {
      target: '[data-tour="vistoria-pdf"]',
      content: 'Gere laudo PDF (5-7 páginas): capa, resumo executivo, radar de diagnóstico, checklist e galeria de fotos. Disponível após 50%.',
      placement: 'left',
      title: '📄 Gerar Laudo PDF',
    },
    {
      target: '[data-tour="vistoria-avaliacao"]',
      content: 'Após a vistoria, prossiga para Avaliação Imobiliária com dados pré-preenchidos.',
      placement: 'left',
      title: '💰 Ir para Avaliação',
    },
  ],

  // Visitas - Agendamento e Gestão
  visitas: [
    {
      target: '[data-tour="visitas-kpis"]',
      content: 'KPIs principais: total de visitas, agendamentos pendentes, taxa de conversão e média por corretor. Tempo real.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 KPIs de Visitas',
    },
    {
      target: '[data-tour="visitas-nova"]',
      content: 'Crie agendamento: dados do cliente, imóvel, data/hora e tipo (visita, avaliação, consultoria, fotografia).',
      placement: 'bottom',
      title: '➕ Nova Visita',
    },
    {
      target: '[data-tour="visitas-disponibilidade"]',
      content: 'Gerencie sua disponibilidade de horários. Defina dias e horários para agendamentos automáticos.',
      placement: 'bottom',
      title: '📅 Disponibilidade',
    },
    {
      target: '[data-tour="visitas-tabs"]',
      content: 'Navegue: Dashboard (gráficos), Agendamentos (próximas), Fichas (realizadas) e Ranking (desempenho).',
      placement: 'bottom',
      title: '🗂️ Abas',
    },
    {
      target: '[data-tour="visitas-dashboard"]',
      content: 'Evolução mensal de visitas e ranking dos corretores por atendimentos realizados.',
      placement: 'top',
      title: '📈 Dashboard',
    },
    {
      target: '[data-tour="visitas-agendamentos"]',
      content: 'Lista com status (Agendada, Confirmada, Realizada, Cancelada). Clique para detalhes ou converter em ficha.',
      placement: 'top',
      title: '📋 Agendamentos',
    },
    {
      target: '[data-tour="visitas-fichas"]',
      content: 'Fichas completas: dados do cliente, imóvel, declaração de intermediação, assinaturas e feedback.',
      placement: 'top',
      title: '📝 Fichas de Visita',
    },
    {
      target: '[data-tour="visitas-ranking"]',
      content: 'Ranking dos corretores por número de visitas. Identifique top performers.',
      placement: 'top',
      title: '🏆 Ranking',
    },
  ],

  // Ficha de Visita Individual
  fichaVisita: [
    {
      target: '[data-tour="ficha-header"]',
      content: 'Código único, status atual e data. Use seletor para alterar status (Agendada → Confirmada → Realizada).',
      disableBeacon: true,
      placement: 'bottom',
      title: '📋 Identificação',
    },
    {
      target: '[data-tour="ficha-export-pdf"]',
      content: 'Gere PDF profissional com dados, declaração e assinaturas. Ideal para arquivamento.',
      placement: 'bottom',
      title: '📄 Exportar PDF',
    },
    {
      target: '[data-tour="ficha-imovel"]',
      content: 'Dados do imóvel: endereço, código, valor e proprietário. Clique em "Editar" para alterar.',
      placement: 'right',
      title: '🏠 Dados do Imóvel',
    },
    {
      target: '[data-tour="ficha-visitante"]',
      content: 'Dados do cliente: nome, CPF, telefone e email. Essenciais para declaração.',
      placement: 'right',
      title: '👤 Dados do Visitante',
    },
    {
      target: '[data-tour="ficha-observacoes"]',
      content: 'Anotações da visita: impressões, pontos de interesse, objeções levantadas.',
      placement: 'top',
      title: '📝 Observações',
    },
    {
      target: '[data-tour="ficha-assinaturas"]',
      content: 'Assinaturas digitais do visitante e corretor. Canvas para assinar ou envie link remoto.',
      placement: 'top',
      title: '✍️ Assinaturas Digitais',
    },
    {
      target: '[data-tour="ficha-info"]',
      content: 'Resumo: data/hora, corretor responsável, status das assinaturas (verde = assinado).',
      placement: 'left',
      title: '📅 Informações',
    },
    {
      target: '[data-tour="ficha-assinatura-digital"]',
      content: 'Links para assinatura remota via WhatsApp ou email. Cliente assina pelo celular.',
      placement: 'left',
      title: '📲 Links de Assinatura',
    },
    {
      target: '[data-tour="ficha-feedback"]',
      content: 'Link de feedback pós-visita. Cliente avalia imóvel e informa interesse.',
      placement: 'left',
      title: '⭐ Feedback',
    },
  ],

  // Documentação / Due Diligence
  documentacao: [
    {
      target: '[data-tour="documentacao-progress"]',
      content: 'Barra de progresso mostra documentos coletados. Acompanhe due diligence em tempo real.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 Progresso',
    },
    {
      target: '[data-tour="documentacao-analyzer"]',
      content: 'IA analisa documentos enviados. Identifica automaticamente qual item do checklist corresponde.',
      placement: 'bottom',
      title: '🤖 Análise Inteligente',
    },
    {
      target: '[data-tour="documentacao-perfil-vendedor"]',
      content: 'Perfil do vendedor: marque PJ ou União Estável para adicionar documentos específicos.',
      placement: 'bottom',
      title: '👤 Perfil do Vendedor',
    },
    {
      target: '[data-tour="documentacao-perfil-comprador"]',
      content: 'Perfil do comprador: comunhão de bens ou união estável adiciona campos do cônjuge.',
      placement: 'bottom',
      title: '👥 Perfil do Comprador',
    },
    {
      target: '[data-tour="documentacao-checklist"]',
      content: 'Marque documentos coletados. Use tooltips (?) para explicações detalhadas.',
      placement: 'top',
      title: '✅ Checklist',
    },
    {
      target: '[data-tour="documentacao-export"]',
      content: 'Exporte PDFs separados: Vendedor, Comprador ou Documentação Completa.',
      placement: 'left',
      title: '📄 Exportar PDF',
    },
  ],

  // Configurações
  configuracoes: [
    {
      target: '[data-tour="config-logo"]',
      content: 'Upload do logo da empresa. Aparecerá nos cabeçalhos de todos os PDFs.',
      disableBeacon: true,
      placement: 'bottom',
      title: '🖼️ Logo da Empresa',
    },
    {
      target: '[data-tour="config-dados"]',
      content: 'Dados da empresa: Nome, CNPJ, CRECI, telefone, email e endereço. Aparecem nos rodapés.',
      placement: 'top',
      title: '📝 Dados da Empresa',
    },
    {
      target: '[data-tour="config-preview"]',
      content: 'Visualize em tempo real como o rodapé dos PDFs aparecerá.',
      placement: 'top',
      title: '👁️ Preview do Rodapé',
    },
  ],

  // Leads (Admin)
  leads: [
    {
      target: '[data-tour="leads-stats"]',
      content: 'Estatísticas: total de leads, convertidos, taxa de conversão e leads na última semana.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 Estatísticas',
    },
    {
      target: '[data-tour="leads-list"]',
      content: 'Lista de leads capturados: nome, email, telefone, interesse, origem e data.',
      placement: 'top',
      title: '📋 Lista de Leads',
    },
    {
      target: '[data-tour="leads-detail"]',
      content: 'Clique para detalhes: imóvel de interesse, faixa de valor, diferenciais buscados.',
      placement: 'left',
      title: '🔍 Detalhes',
    },
  ],

  // Usuários (Admin)
  usuarios: [
    {
      target: '[data-tour="usuarios-list"]',
      content: 'Usuários da plataforma: nome, email, papel (admin/corretor/gerente) e última atividade.',
      disableBeacon: true,
      placement: 'bottom',
      title: '👥 Lista de Usuários',
    },
    {
      target: '[data-tour="usuarios-stats"]',
      content: 'Estatísticas de uso: logins, pesquisas, avaliações, vistorias e exportações.',
      placement: 'top',
      title: '📊 Estatísticas de Uso',
    },
  ],

  // Base de Conhecimento
  baseConhecimento: [
    {
      target: '[data-tour="base-categorias"]',
      content: 'Categorias de conhecimento: Plataforma, Mercado, Avaliação, Documentação, etc.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📚 Categorias',
    },
    {
      target: '[data-tour="base-artigos"]',
      content: 'Artigos que a Sofia usa para responder perguntas. Adicione conteúdo personalizado.',
      placement: 'top',
      title: '📝 Artigos',
    },
    {
      target: '[data-tour="base-adicionar"]',
      content: 'Adicione novos artigos para treinar a Sofia com conhecimento específico da sua empresa.',
      placement: 'left',
      title: '➕ Adicionar Artigo',
    },
  ],

  // Calibrador de Avaliação
  calibrador: [
    {
      target: '[data-tour="calibrador-categorias"]',
      content: 'Categorias de características: Posição/Vista, Conservação, Conforto, Segurança, Funcionalidade.',
      disableBeacon: true,
      placement: 'bottom',
      title: '📊 Categorias',
    },
    {
      target: '[data-tour="calibrador-pesos"]',
      content: 'Ajuste os pesos de cada característica. Valores maiores = maior impacto no valor final.',
      placement: 'top',
      title: '⚖️ Pesos',
    },
    {
      target: '[data-tour="calibrador-caps"]',
      content: 'Configure limites mínimo e máximo para cada categoria. Evita ajustes extremos.',
      placement: 'top',
      title: '🎚️ Limites',
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
        skip: 'Pular',
      }}
    />
  );
}

interface TourButtonProps {
  onClick: () => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function TourButton({ onClick, className, size = "sm" }: TourButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      className={className}
    >
      <HelpCircle className="h-4 w-4 mr-1" />
      Tour
    </Button>
  );
}
