import type { KPIStatsData } from "@/hooks/useKPIStats";
import type { EvolutionData } from "@/hooks/useEvolutionData";
import type { MicrobairroRanking } from "@/hooks/useITBITransactions";
import type { FichaVisita } from "@/types/visitas";
import type { FeedbackAnalytics } from "@/hooks/useFeedbackAnalytics";

export const DEMO_KPI_STATS: KPIStatsData = {
  precoMedio: 11245,
  precoMedioApt: 11890,
  precoMedioCasa: 9720,
  liquidez: 2648,
  liquidezApt: 1985,
  liquidezCasa: 663,
  variacaoAnual: "4.72",
  variacaoAnualApt: "5.1",
  variacaoAnualCasa: "3.8",
  bairroMaisValorizado: "Orla",
  precoMedioBairro: 18450,
  precoMedioBairroApt: 19200,
  precoMedioBairroCasa: 16800,
  variacaoMensal: "0.85",
  mesReferencia: "Jan/2026",
  usandoDadosHistoricos: false,
};

export const DEMO_EVOLUTION_DATA: EvolutionData[] = [
  { mes: "S1/20", geral: 7850, apartamento: 8200, casa: 6900, variacao: 0 },
  { mes: "S2/20", geral: 7620, apartamento: 7980, casa: 6750, variacao: -2.93 },
  { mes: "S1/21", geral: 8100, apartamento: 8520, casa: 7100, variacao: 6.30 },
  { mes: "S2/21", geral: 8480, apartamento: 8900, casa: 7350, variacao: 4.69 },
  { mes: "S1/22", geral: 8950, apartamento: 9400, casa: 7800, variacao: 5.54 },
  { mes: "S2/22", geral: 9320, apartamento: 9780, casa: 8100, variacao: 4.13 },
  { mes: "S1/23", geral: 9680, apartamento: 10150, casa: 8400, variacao: 3.86 },
  { mes: "S2/23", geral: 10050, apartamento: 10550, casa: 8750, variacao: 3.82 },
  { mes: "S1/24", geral: 10420, apartamento: 10950, casa: 9050, variacao: 3.68 },
  { mes: "S2/24", geral: 10780, apartamento: 11350, casa: 9380, variacao: 3.45 },
  { mes: "S1/25", geral: 11100, apartamento: 11680, casa: 9620, variacao: 2.97 },
  { mes: "S2/25", geral: 11245, apartamento: 11890, casa: 9720, variacao: 1.31 },
];

export const DEMO_MICROBAIRRO_RANKING: MicrobairroRanking[] = [
  { microbairro: "Orla", total_transacoes: 385, preco_medio_m2: 18450, preco_min_m2: 12800, preco_max_m2: 28500, mediana_m2: 17200 },
  { microbairro: "Península", total_transacoes: 420, preco_medio_m2: 14200, preco_min_m2: 10500, preco_max_m2: 21000, mediana_m2: 13800 },
  { microbairro: "Jardim Oceânico", total_transacoes: 310, preco_medio_m2: 12800, preco_min_m2: 9200, preco_max_m2: 18500, mediana_m2: 12400 },
  { microbairro: "ABM", total_transacoes: 280, preco_medio_m2: 10950, preco_min_m2: 8100, preco_max_m2: 15200, mediana_m2: 10600 },
  { microbairro: "Parque das Rosas", total_transacoes: 245, preco_medio_m2: 10200, preco_min_m2: 7500, preco_max_m2: 14000, mediana_m2: 9800 },
  { microbairro: "Centro Metropolitano", total_transacoes: 350, preco_medio_m2: 9800, preco_min_m2: 7200, preco_max_m2: 13500, mediana_m2: 9500 },
  { microbairro: "Ayrton Senna", total_transacoes: 290, preco_medio_m2: 8900, preco_min_m2: 6500, preco_max_m2: 12800, mediana_m2: 8600 },
  { microbairro: "Eixo Américas", total_transacoes: 368, preco_medio_m2: 8450, preco_min_m2: 5800, preco_max_m2: 12000, mediana_m2: 8100 },
];

const DEMO_MICROBAIRRO_EVOLUTION_DATA = [
  { periodo: "S1/22", Orla: 15200, Península: 11800, "Jardim Oceânico": 10500, ABM: 9200, "Parque das Rosas": 8600, "Centro Metropolitano": 8100, "Ayrton Senna": 7500, "Eixo Américas": 7100 },
  { periodo: "S2/22", Orla: 15800, Península: 12200, "Jardim Oceânico": 10900, ABM: 9500, "Parque das Rosas": 8900, "Centro Metropolitano": 8400, "Ayrton Senna": 7700, "Eixo Américas": 7300 },
  { periodo: "S1/23", Orla: 16400, Península: 12700, "Jardim Oceânico": 11300, ABM: 9800, "Parque das Rosas": 9200, "Centro Metropolitano": 8700, "Ayrton Senna": 8000, "Eixo Américas": 7600 },
  { periodo: "S2/23", Orla: 17000, Península: 13200, "Jardim Oceânico": 11800, ABM: 10200, "Parque das Rosas": 9600, "Centro Metropolitano": 9100, "Ayrton Senna": 8300, "Eixo Américas": 7800 },
  { periodo: "S1/24", Orla: 17500, Península: 13600, "Jardim Oceânico": 12200, ABM: 10500, "Parque das Rosas": 9800, "Centro Metropolitano": 9400, "Ayrton Senna": 8500, "Eixo Américas": 8000 },
  { periodo: "S2/24", Orla: 18000, Península: 13900, "Jardim Oceânico": 12500, ABM: 10700, "Parque das Rosas": 10000, "Centro Metropolitano": 9600, "Ayrton Senna": 8700, "Eixo Américas": 8200 },
  { periodo: "S1/25", Orla: 18450, Península: 14200, "Jardim Oceânico": 12800, ABM: 10950, "Parque das Rosas": 10200, "Centro Metropolitano": 9800, "Ayrton Senna": 8900, "Eixo Américas": 8450 },
];

export const DEMO_MICROBAIRRO_EVOLUTION = {
  data: DEMO_MICROBAIRRO_EVOLUTION_DATA,
  microbairros: ["ABM", "Ayrton Senna", "Centro Metropolitano", "Eixo Américas", "Jardim Oceânico", "Orla", "Parque das Rosas", "Península"],
};

export const DEMO_MAP_DATA = [
  { microbairro: "Orla", total_transacoes: 385, preco_medio_m2: 18450, latitude: -23.0128, longitude: -43.3095, aproximado: false },
  { microbairro: "Península", total_transacoes: 420, preco_medio_m2: 14200, latitude: -22.9985, longitude: -43.3350, aproximado: false },
  { microbairro: "Jardim Oceânico", total_transacoes: 310, preco_medio_m2: 12800, latitude: -23.0065, longitude: -43.3195, aproximado: false },
  { microbairro: "ABM", total_transacoes: 280, preco_medio_m2: 10950, latitude: -23.0010, longitude: -43.3550, aproximado: false },
  { microbairro: "Parque das Rosas", total_transacoes: 245, preco_medio_m2: 10200, latitude: -22.9920, longitude: -43.3680, aproximado: false },
  { microbairro: "Centro Metropolitano", total_transacoes: 350, preco_medio_m2: 9800, latitude: -22.9830, longitude: -43.3870, aproximado: false },
  { microbairro: "Ayrton Senna", total_transacoes: 290, preco_medio_m2: 8900, latitude: -22.9780, longitude: -43.3750, aproximado: false },
  { microbairro: "Eixo Américas", total_transacoes: 368, preco_medio_m2: 8450, latitude: -22.9950, longitude: -43.3480, aproximado: false },
];

// Search results demo for Pesquisas de Mercado
export const DEMO_SEARCH_RESULTS = [
  { logradouro: "AV. LÚCIO COSTA", numero: "3150", tipologia: "Apartamento", area_m2: 120, valor_m2: 18200, valor_transacao: 2184000, data_transacao: "2025-11-15", total_transacoes: 3 },
  { logradouro: "AV. LÚCIO COSTA", numero: "2800", tipologia: "Apartamento", area_m2: 95, valor_m2: 17800, valor_transacao: 1691000, data_transacao: "2025-10-22", total_transacoes: 2 },
  { logradouro: "R. ÉRICO VERÍSSIMO", numero: "580", tipologia: "Apartamento", area_m2: 85, valor_m2: 12500, valor_transacao: 1062500, data_transacao: "2025-09-18", total_transacoes: 4 },
  { logradouro: "AV. DAS AMÉRICAS", numero: "12500", tipologia: "Apartamento", area_m2: 110, valor_m2: 8900, valor_transacao: 979000, data_transacao: "2025-08-05", total_transacoes: 5 },
  { logradouro: "AV. PREFEITO DULCÍDIO CARDOSO", numero: "1800", tipologia: "Casa", area_m2: 250, valor_m2: 10200, valor_transacao: 2550000, data_transacao: "2025-07-10", total_transacoes: 1 },
];

// =================== DEMO DATA: Visitas ===================

export const DEMO_FICHAS_VISITA: FichaVisita[] = [
  {
    id: "demo-fv-1", codigo: "VIS-DEMO01", nome_visitante: "Carlos Eduardo Silva", telefone_visitante: "(21) 99812-3456",
    email_visitante: "carlos.silva@email.com", cpf_visitante: "123.456.789-00", endereco_imovel: "Av. Lúcio Costa, 3150 - Bloco 2, Ap 1201",
    codigo_imovel: "LC-3150", nome_corretor: "Marcus Godoy", nome_proprietario: "Ana Maria Costa",
    data_visita: "2026-02-05T10:00:00Z", status: "realizada", corretor_id: null, notas: "Cliente muito interessado, solicitou proposta.",
    valor_imovel: 2850000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-02-04T14:00:00Z", updated_at: "2026-02-05T11:30:00Z",
  },
  {
    id: "demo-fv-2", codigo: "VIS-DEMO02", nome_visitante: "Fernanda Oliveira", telefone_visitante: "(21) 98765-4321",
    email_visitante: "fernanda.oliveira@email.com", cpf_visitante: "987.654.321-00", endereco_imovel: "R. Érico Veríssimo, 580 - Ap 802",
    codigo_imovel: "EV-580", nome_corretor: "Ricardo Almeida", nome_proprietario: "José Roberto Lima",
    data_visita: "2026-02-06T14:30:00Z", status: "agendada", corretor_id: null, notas: null,
    valor_imovel: 1250000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-02-03T09:00:00Z", updated_at: "2026-02-03T09:00:00Z",
  },
  {
    id: "demo-fv-3", codigo: "VIS-DEMO03", nome_visitante: "Roberto Mendes", telefone_visitante: "(21) 97654-8765",
    email_visitante: null, cpf_visitante: "456.789.123-00", endereco_imovel: "Av. das Américas, 12500 - Bloco 5, Ap 304",
    codigo_imovel: null, nome_corretor: "Marcus Godoy", nome_proprietario: "Claudia Souza",
    data_visita: "2026-01-28T16:00:00Z", status: "realizada", corretor_id: null, notas: "Achou o preço acima do mercado.",
    valor_imovel: 980000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-01-27T10:00:00Z", updated_at: "2026-01-28T17:00:00Z",
  },
  {
    id: "demo-fv-4", codigo: "VIS-DEMO04", nome_visitante: "Juliana Barros", telefone_visitante: "(21) 99123-7890",
    email_visitante: "juliana.b@email.com", cpf_visitante: "321.654.987-00", endereco_imovel: "Av. Prefeito Dulcídio Cardoso, 1800",
    codigo_imovel: "DC-1800", nome_corretor: "Patricia Santos", nome_proprietario: "Marcos Ferreira",
    data_visita: "2026-02-01T09:00:00Z", status: "cancelada", corretor_id: null, notas: "Cliente cancelou por motivos pessoais.",
    valor_imovel: 3200000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-01-30T08:00:00Z", updated_at: "2026-02-01T07:00:00Z",
  },
  {
    id: "demo-fv-5", codigo: "VIS-DEMO05", nome_visitante: "André Martins", telefone_visitante: "(21) 98456-1234",
    email_visitante: "andre.m@email.com", cpf_visitante: "654.321.987-00", endereco_imovel: "R. Mário Pederneiras, 220 - Ap 1502",
    codigo_imovel: "MP-220", nome_corretor: "Ricardo Almeida", nome_proprietario: "Beatriz Cardoso",
    data_visita: "2026-02-07T11:00:00Z", status: "agendada", corretor_id: null, notas: null,
    valor_imovel: 1890000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-02-04T16:00:00Z", updated_at: "2026-02-04T16:00:00Z",
  },
  {
    id: "demo-fv-6", codigo: "VIS-DEMO06", nome_visitante: "Mariana Costa", telefone_visitante: "(21) 99345-6789",
    email_visitante: "mariana.costa@email.com", cpf_visitante: "789.123.456-00", endereco_imovel: "Av. Alfredo Balthazar da Silveira, 450 - Ap 601",
    codigo_imovel: null, nome_corretor: "Marcus Godoy", nome_proprietario: "Pedro Nascimento",
    data_visita: "2026-01-22T15:00:00Z", status: "realizada", corretor_id: null, notas: "Fez proposta de R$ 1.600.000.",
    valor_imovel: 1750000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-01-20T11:00:00Z", updated_at: "2026-01-22T16:30:00Z",
  },
  {
    id: "demo-fv-7", codigo: "VIS-DEMO07", nome_visitante: "Lucas Pereira", telefone_visitante: "(21) 97890-4567",
    email_visitante: null, cpf_visitante: "111.222.333-44", endereco_imovel: "R. Rachel de Queiroz, 120 - Bloco B, Ap 903",
    codigo_imovel: "RQ-120", nome_corretor: "Patricia Santos", nome_proprietario: "Silvia Monteiro",
    data_visita: "2026-02-08T10:30:00Z", status: "agendada", corretor_id: null, notas: "Primeira visita ao imóvel.",
    valor_imovel: 1100000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-02-05T09:00:00Z", updated_at: "2026-02-05T09:00:00Z",
  },
  {
    id: "demo-fv-8", codigo: "VIS-DEMO08", nome_visitante: "Tatiana Souza", telefone_visitante: "(21) 98234-5678",
    email_visitante: "tatiana.souza@email.com", cpf_visitante: "555.666.777-88", endereco_imovel: "Av. Lúcio Costa, 2800 - Ap 2001",
    codigo_imovel: "LC-2800", nome_corretor: "Marcus Godoy", nome_proprietario: "Ricardo Gomes",
    data_visita: "2026-01-15T14:00:00Z", status: "realizada", corretor_id: null, notas: "Adorou a vista para o mar. Muito entusiasmada.",
    valor_imovel: 4500000, assinatura_visitante: null, assinatura_corretor: null, created_at: "2026-01-13T10:00:00Z", updated_at: "2026-01-15T15:30:00Z",
  },
];

export const DEMO_AGENDAMENTOS = [
  {
    id: "demo-ag-1", nome_visitante: "Fernanda Oliveira", telefone_visitante: "(21) 98765-4321",
    email_visitante: "fernanda.oliveira@email.com", endereco_imovel: "R. Érico Veríssimo, 580 - Ap 802",
    codigo_imovel: "EV-580", data_hora: "2026-02-06T14:30:00Z", data_hora_opcao2: null,
    status: "agendada" as const, tipo_servico: "visita" as const, origem: "whatsapp" as const,
    corretor_id: null, lead_id: null, notas: null, lembrete_enviado: false, lembrete_enviado_at: null,
    created_at: "2026-02-03T09:00:00Z", updated_at: "2026-02-03T09:00:00Z",
  },
  {
    id: "demo-ag-2", nome_visitante: "André Martins", telefone_visitante: "(21) 98456-1234",
    email_visitante: "andre.m@email.com", endereco_imovel: "R. Mário Pederneiras, 220 - Ap 1502",
    codigo_imovel: "MP-220", data_hora: "2026-02-07T11:00:00Z", data_hora_opcao2: "2026-02-08T15:00:00Z",
    status: "confirmada" as const, tipo_servico: "visita" as const, origem: "site" as const,
    corretor_id: null, lead_id: null, notas: "Cliente prefere horário da manhã", lembrete_enviado: true, lembrete_enviado_at: "2026-02-06T08:00:00Z",
    created_at: "2026-02-04T16:00:00Z", updated_at: "2026-02-05T10:00:00Z",
  },
  {
    id: "demo-ag-3", nome_visitante: "Lucas Pereira", telefone_visitante: "(21) 97890-4567",
    email_visitante: null, endereco_imovel: "R. Rachel de Queiroz, 120 - Bloco B, Ap 903",
    codigo_imovel: "RQ-120", data_hora: "2026-02-08T10:30:00Z", data_hora_opcao2: null,
    status: "agendada" as const, tipo_servico: "visita" as const, origem: "indicacao" as const,
    corretor_id: null, lead_id: null, notas: null, lembrete_enviado: false, lembrete_enviado_at: null,
    created_at: "2026-02-05T09:00:00Z", updated_at: "2026-02-05T09:00:00Z",
  },
  {
    id: "demo-ag-4", nome_visitante: "Carlos Eduardo Silva", telefone_visitante: "(21) 99812-3456",
    email_visitante: "carlos.silva@email.com", endereco_imovel: "Av. Lúcio Costa, 3150 - Bloco 2, Ap 1201",
    codigo_imovel: "LC-3150", data_hora: "2026-02-05T10:00:00Z", data_hora_opcao2: null,
    status: "realizada" as const, tipo_servico: "visita" as const, origem: "whatsapp" as const,
    corretor_id: null, lead_id: null, notas: "Visita realizada com sucesso", lembrete_enviado: true, lembrete_enviado_at: "2026-02-04T18:00:00Z",
    created_at: "2026-02-03T14:00:00Z", updated_at: "2026-02-05T11:00:00Z",
  },
  {
    id: "demo-ag-5", nome_visitante: "Juliana Barros", telefone_visitante: "(21) 99123-7890",
    email_visitante: "juliana.b@email.com", endereco_imovel: "Av. Prefeito Dulcídio Cardoso, 1800",
    codigo_imovel: "DC-1800", data_hora: "2026-02-01T09:00:00Z", data_hora_opcao2: null,
    status: "cancelada" as const, tipo_servico: "visita" as const, origem: "site" as const,
    corretor_id: null, lead_id: null, notas: "Cancelou por motivos pessoais", lembrete_enviado: false, lembrete_enviado_at: null,
    created_at: "2026-01-30T08:00:00Z", updated_at: "2026-02-01T07:00:00Z",
  },
];

// =================== DEMO DATA: Visitas Stats ===================

export const DEMO_VISITAS_STATS = {
  totalAgendadas: 3,
  totalRealizadas: 4,
  totalCanceladas: 1,
  realizadasMesAtual: 2,
  realizadasMesAnterior: 2,
  variacaoMensal: 0,
  taxaConversao: 50,
  avaliacaoMedia: 4.2,
  totalFeedbacks: 4,
  feedbacksPositivos: 2,
};

export const DEMO_CORRETOR_RANKING = [
  { nome: "Marcus Godoy", totalVisitas: 4, realizadas: 3, avaliacaoMedia: 4.5 },
  { nome: "Ricardo Almeida", totalVisitas: 2, realizadas: 1, avaliacaoMedia: 3.8 },
  { nome: "Patricia Santos", totalVisitas: 2, realizadas: 0, avaliacaoMedia: 0 },
];

export const DEMO_EVOLUCAO_MENSAL = [
  { mes: "Set/25", agendadas: 3, realizadas: 2, canceladas: 0 },
  { mes: "Out/25", agendadas: 5, realizadas: 4, canceladas: 1 },
  { mes: "Nov/25", agendadas: 4, realizadas: 3, canceladas: 0 },
  { mes: "Dez/25", agendadas: 6, realizadas: 5, canceladas: 1 },
  { mes: "Jan/26", agendadas: 5, realizadas: 4, canceladas: 1 },
  { mes: "Fev/26", agendadas: 3, realizadas: 1, canceladas: 0 },
];

// =================== DEMO DATA: Feedback Analytics ===================

export const DEMO_FEEDBACK_ANALYTICS: FeedbackAnalytics = {
  totalFeedbacks: 6,
  avgRating: 4.2,
  proposalRate: 50,
  justValueRate: 66.7,
  avgConexao: 3.8,
  distributionByRating: [
    { nota: "5 ★", count: 2 },
    { nota: "4 ★", count: 2 },
    { nota: "3 ★", count: 1 },
    { nota: "2 ★", count: 1 },
    { nota: "1 ★", count: 0 },
  ],
  interestDistribution: [
    { nivel: "Muito Alto", count: 2 },
    { nivel: "Alto", count: 2 },
    { nivel: "Médio", count: 1 },
    { nivel: "Baixo", count: 1 },
  ],
  valuePerception: [
    { percepcao: "Justo", count: 4 },
    { percepcao: "Acima", count: 1 },
    { percepcao: "Abaixo", count: 1 },
  ],
  monthlyTrend: [
    { mes: "set/25", mediaAvaliacao: 4.0, totalFeedbacks: 1 },
    { mes: "out/25", mediaAvaliacao: 4.5, totalFeedbacks: 2 },
    { mes: "nov/25", mediaAvaliacao: 3.5, totalFeedbacks: 1 },
    { mes: "dez/25", mediaAvaliacao: 4.0, totalFeedbacks: 1 },
    { mes: "jan/26", mediaAvaliacao: 4.8, totalFeedbacks: 1 },
    { mes: "fev/26", mediaAvaliacao: 0, totalFeedbacks: 0 },
  ],
  topEfeitosUau: [
    { efeito: "Vista panorâmica", count: 4 },
    { efeito: "Acabamento premium", count: 3 },
    { efeito: "Área de lazer", count: 3 },
    { efeito: "Iluminação natural", count: 2 },
    { efeito: "Varanda gourmet", count: 2 },
  ],
  recentFeedbacks: [
    {
      id: "demo-fb-1", avaliacao_geral: 5, nivel_interesse: "muito_alto", percepcao_valor: "justo",
      gostaria_fazer_proposta: true, conexao_imovel: 5, efeito_uau: ["Vista panorâmica", "Acabamento premium"],
      created_at: "2026-01-22T16:30:00Z",
      ficha: { codigo: "VIS-DEMO06", nome_visitante: "Mariana Costa", endereco_imovel: "Av. Alfredo Balthazar da Silveira, 450", data_visita: "2026-01-22T15:00:00Z" },
    },
    {
      id: "demo-fb-2", avaliacao_geral: 5, nivel_interesse: "muito_alto", percepcao_valor: "justo",
      gostaria_fazer_proposta: true, conexao_imovel: 5, efeito_uau: ["Vista panorâmica", "Iluminação natural", "Varanda gourmet"],
      created_at: "2026-01-15T15:30:00Z",
      ficha: { codigo: "VIS-DEMO08", nome_visitante: "Tatiana Souza", endereco_imovel: "Av. Lúcio Costa, 2800", data_visita: "2026-01-15T14:00:00Z" },
    },
    {
      id: "demo-fb-3", avaliacao_geral: 4, nivel_interesse: "alto", percepcao_valor: "justo",
      gostaria_fazer_proposta: false, conexao_imovel: 4, efeito_uau: ["Área de lazer", "Acabamento premium"],
      created_at: "2026-02-05T11:30:00Z",
      ficha: { codigo: "VIS-DEMO01", nome_visitante: "Carlos Eduardo Silva", endereco_imovel: "Av. Lúcio Costa, 3150", data_visita: "2026-02-05T10:00:00Z" },
    },
    {
      id: "demo-fb-4", avaliacao_geral: 2, nivel_interesse: "baixo", percepcao_valor: "acima",
      gostaria_fazer_proposta: false, conexao_imovel: 2, efeito_uau: null,
      created_at: "2026-01-28T17:00:00Z",
      ficha: { codigo: "VIS-DEMO03", nome_visitante: "Roberto Mendes", endereco_imovel: "Av. das Américas, 12500", data_visita: "2026-01-28T16:00:00Z" },
    },
  ],
};

// =================== DEMO DATA: Histórico de Avaliações ===================

export const DEMO_AVALIACOES = [
  {
    id: "demo-val-1", created_at: "2026-02-03T14:00:00Z", logradouro: "AV. LÚCIO COSTA", numero: "3150", bairro: "Barra da Tijuca",
    property_area_m2: 120, property_type: "Apartamento", final_value_min: 2400000, final_value_med: 2850000, final_value_max: 3200000,
    confidence_level: "green", confidence_score: 82, total_adjustment: 4.5, spread_percentage: 12,
    documentation_status: "regular", recommendation_title: "Imóvel bem posicionado",
    trend_direction: "UP", trend_percentage: 6.2, pdf_generated: true, pricing_strategies: [],
  },
  {
    id: "demo-val-2", created_at: "2026-01-28T10:00:00Z", logradouro: "R. ÉRICO VERÍSSIMO", numero: "580", bairro: "Barra da Tijuca",
    property_area_m2: 85, property_type: "Apartamento", final_value_min: 950000, final_value_med: 1100000, final_value_max: 1250000,
    confidence_level: "yellow_high", confidence_score: 65, total_adjustment: 2.1, spread_percentage: 15,
    documentation_status: "regular", recommendation_title: "Boa oportunidade",
    trend_direction: "UP", trend_percentage: 3.8, pdf_generated: false, pricing_strategies: [],
  },
  {
    id: "demo-val-3", created_at: "2026-01-15T16:00:00Z", logradouro: "AV. DAS AMÉRICAS", numero: "12500", bairro: "Barra da Tijuca",
    property_area_m2: 110, property_type: "Apartamento", final_value_min: 850000, final_value_med: 980000, final_value_max: 1100000,
    confidence_level: "yellow_medium", confidence_score: 55, total_adjustment: -1.2, spread_percentage: 18,
    documentation_status: "regular", recommendation_title: "Preço alinhado ao mercado",
    trend_direction: "STABLE", trend_percentage: 1.1, pdf_generated: true, pricing_strategies: [],
  },
  {
    id: "demo-val-4", created_at: "2026-01-05T09:00:00Z", logradouro: "AV. PREFEITO DULCÍDIO CARDOSO", numero: "1800", bairro: "Barra da Tijuca",
    property_area_m2: 250, property_type: "Casa", final_value_min: 2800000, final_value_med: 3200000, final_value_max: 3600000,
    confidence_level: "green", confidence_score: 78, total_adjustment: 6.8, spread_percentage: 10,
    documentation_status: "regular", recommendation_title: "Imóvel premium",
    trend_direction: "UP", trend_percentage: 5.4, pdf_generated: true, pricing_strategies: [],
  },
  {
    id: "demo-val-5", created_at: "2025-12-20T11:00:00Z", logradouro: "AV. ALFREDO BALTHAZAR DA SILVEIRA", numero: "450", bairro: "Barra da Tijuca",
    property_area_m2: 95, property_type: "Apartamento", final_value_min: 1500000, final_value_med: 1750000, final_value_max: 1950000,
    confidence_level: "yellow_high", confidence_score: 71, total_adjustment: 3.2, spread_percentage: 13,
    documentation_status: "regular", recommendation_title: "Valorização constante",
    trend_direction: "UP", trend_percentage: 4.6, pdf_generated: false, pricing_strategies: [],
  },
];

// =================== DEMO DATA: Histórico de Vistorias ===================

export const DEMO_VISTORIAS = [
  {
    id: "demo-vis-1", created_at: "2026-02-02T10:00:00Z", logradouro: "AV. LÚCIO COSTA", numero: "3150", complemento: "Bloco 2, Ap 1201",
    bairro: "Barra da Tijuca", nome_condominio: "Waterways", tipo_imovel: "apartamento", tipo_vistoria: "apartamento",
    area_m2: 120, quartos: 3, suites: 1, banheiros: 2, vagas: 2, final_score: 85, progress: 100, critical_count: 0,
    proprietario: "Ana Maria Costa", telefone: "(21) 99111-2222", vistoriador: "Marcus Godoy",
    data_vistoria: "2026-02-02", observacoes: "Imóvel em excelente estado", checklist_data: null,
    valor_avaliacao: 2850000, valor_ajustado: 2780000, ajuste_percentual: -2.5, pdf_generated: true, valuation_id: null,
  },
  {
    id: "demo-vis-2", created_at: "2026-01-25T14:00:00Z", logradouro: "R. ÉRICO VERÍSSIMO", numero: "580", complemento: "Ap 802",
    bairro: "Barra da Tijuca", nome_condominio: "Barra Village", tipo_imovel: "apartamento", tipo_vistoria: "apartamento",
    area_m2: 85, quartos: 2, suites: 1, banheiros: 1, vagas: 1, final_score: 72, progress: 100, critical_count: 1,
    proprietario: "José Roberto Lima", telefone: "(21) 98333-4444", vistoriador: "Ricardo Almeida",
    data_vistoria: "2026-01-25", observacoes: "Infiltração no banheiro da suíte", checklist_data: null,
    valor_avaliacao: 1100000, valor_ajustado: 1030000, ajuste_percentual: -6.4, pdf_generated: true, valuation_id: null,
  },
  {
    id: "demo-vis-3", created_at: "2026-01-10T09:00:00Z", logradouro: "AV. PREFEITO DULCÍDIO CARDOSO", numero: "1800", complemento: null,
    bairro: "Barra da Tijuca", nome_condominio: null, tipo_imovel: "casa", tipo_vistoria: "casa",
    area_m2: 250, quartos: 4, suites: 2, banheiros: 3, vagas: 3, final_score: 91, progress: 100, critical_count: 0,
    proprietario: "Marcos Ferreira", telefone: "(21) 97555-6666", vistoriador: "Marcus Godoy",
    data_vistoria: "2026-01-10", observacoes: "Casa excepcional, padrão altíssimo", checklist_data: null,
    valor_avaliacao: 3200000, valor_ajustado: 3350000, ajuste_percentual: 4.7, pdf_generated: false, valuation_id: null,
  },
  {
    id: "demo-vis-4", created_at: "2025-12-18T11:00:00Z", logradouro: "AV. DAS AMÉRICAS", numero: "12500", complemento: "Bloco 5, Ap 304",
    bairro: "Barra da Tijuca", nome_condominio: "Le Parc", tipo_imovel: "apartamento", tipo_vistoria: "apartamento",
    area_m2: 110, quartos: 3, suites: 1, banheiros: 2, vagas: 2, final_score: 45, progress: 80, critical_count: 3,
    proprietario: "Claudia Souza", telefone: "(21) 96777-8888", vistoriador: "Patricia Santos",
    data_vistoria: "2025-12-18", observacoes: "Necessita reformas significativas", checklist_data: null,
    valor_avaliacao: 980000, valor_ajustado: 850000, ajuste_percentual: -13.3, pdf_generated: true, valuation_id: null,
  },
];

// =================== DEMO DATA: Leads ===================

export const DEMO_LEADS = [
  {
    id: "demo-lead-1", nome: "Paulo Henrique Araújo", email: "paulo.araujo@email.com", telefone: "(21) 99876-5432",
    interesse: "Compra", bairro_interesse: "Barra da Tijuca", valor_interesse: 2500000, area_interesse: 120,
    quartos: 3, suites: 1, banheiros: 2, vagas: 2, objetivo: "moradia", urgencia: "ate_3_meses",
    origem: "site", convertido: false, notas: "Prefere vista mar", created_at: "2026-02-04T10:00:00Z", updated_at: "2026-02-04T10:00:00Z",
    preferencia_contato: "whatsapp", aceita_marketing: true, evaluation_count: 1,
    endereco_imovel_analise: null, diferenciais_imovel: null, valor_pedido_vendedor: null,
  },
  {
    id: "demo-lead-2", nome: "Camila Rodrigues", email: "camila.r@email.com", telefone: "(21) 98765-1234",
    interesse: "Venda", bairro_interesse: "Barra da Tijuca", valor_interesse: 1800000, area_interesse: 95,
    quartos: 2, suites: 1, banheiros: 2, vagas: 1, objetivo: "investimento", urgencia: "ate_6_meses",
    origem: "indicacao", convertido: true, notas: "Fechou contrato", created_at: "2026-01-20T14:00:00Z", updated_at: "2026-02-01T09:00:00Z",
    preferencia_contato: "email", aceita_marketing: true, evaluation_count: 2,
    endereco_imovel_analise: "R. Érico Veríssimo, 580", diferenciais_imovel: "Reformado recentemente", valor_pedido_vendedor: 1900000,
  },
  {
    id: "demo-lead-3", nome: "Thiago Mendes", email: "thiago.m@email.com", telefone: "(21) 97654-3210",
    interesse: "Compra", bairro_interesse: "Barra da Tijuca", valor_interesse: 4000000, area_interesse: 200,
    quartos: 4, suites: 2, banheiros: 3, vagas: 3, objetivo: "moradia", urgencia: "sem_pressa",
    origem: "whatsapp", convertido: false, notas: "Busca casa na Orla ou Península", created_at: "2026-02-01T16:00:00Z", updated_at: "2026-02-01T16:00:00Z",
    preferencia_contato: "whatsapp", aceita_marketing: false, evaluation_count: 0,
    endereco_imovel_analise: null, diferenciais_imovel: null, valor_pedido_vendedor: null,
  },
  {
    id: "demo-lead-4", nome: "Renata Lima", email: "renata.lima@email.com", telefone: "(21) 99234-5678",
    interesse: "Compra", bairro_interesse: "Barra da Tijuca", valor_interesse: 900000, area_interesse: 70,
    quartos: 2, suites: 0, banheiros: 1, vagas: 1, objetivo: "investimento", urgencia: "ate_3_meses",
    origem: "avaliacao_publica", convertido: false, notas: "Investidora, busca imóvel para aluguel", created_at: "2026-01-15T08:00:00Z", updated_at: "2026-01-15T08:00:00Z",
    preferencia_contato: "telefone", aceita_marketing: true, evaluation_count: 3,
    endereco_imovel_analise: null, diferenciais_imovel: null, valor_pedido_vendedor: null,
  },
  {
    id: "demo-lead-5", nome: "Gustavo Ferreira", email: "gustavo.f@email.com", telefone: "(21) 98123-4567",
    interesse: "Venda", bairro_interesse: "Barra da Tijuca", valor_interesse: 3500000, area_interesse: 180,
    quartos: 4, suites: 2, banheiros: 3, vagas: 2, objetivo: "moradia", urgencia: "ate_6_meses",
    origem: "site", convertido: false, notas: "Quer vender para mudar para o exterior", created_at: "2026-01-28T12:00:00Z", updated_at: "2026-01-28T12:00:00Z",
    preferencia_contato: "email", aceita_marketing: true, evaluation_count: 1,
    endereco_imovel_analise: "Av. Prefeito Dulcídio Cardoso, 1800", diferenciais_imovel: "Piscina, churrasqueira", valor_pedido_vendedor: 3800000,
  },
  {
    id: "demo-lead-6", nome: "Bianca Santos", email: "bianca.santos@email.com", telefone: "(21) 99567-8901",
    interesse: "Compra", bairro_interesse: "Barra da Tijuca", valor_interesse: 1500000, area_interesse: 90,
    quartos: 3, suites: 1, banheiros: 2, vagas: 1, objetivo: "moradia", urgencia: "ate_3_meses",
    origem: "indicacao", convertido: false, notas: "Casal jovem, primeiro imóvel", created_at: "2026-02-03T11:00:00Z", updated_at: "2026-02-03T11:00:00Z",
    preferencia_contato: "whatsapp", aceita_marketing: true, evaluation_count: 0,
    endereco_imovel_analise: null, diferenciais_imovel: null, valor_pedido_vendedor: null,
  },
];
