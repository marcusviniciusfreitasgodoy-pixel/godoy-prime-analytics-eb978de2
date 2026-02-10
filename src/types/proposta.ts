export interface PropostaCompra {
  id: string;
  ficha_visita_id: string | null;
  codigo: string;
  modelo: 'simplificado' | 'completo';
  numero_proposta: string | null;
  data_hora: string;
  cidade_uf: string | null;
  nome_completo: string;
  cpf_cnpj: string;
  telefone: string;
  email: string | null;
  endereco_resumido: string;
  unidade: string | null;
  matricula: string | null;
  valor_ofertado: number | null;
  moeda: string;
  sinal_entrada: string | null;
  parcelas: string | null;
  financiamento: string | null;
  outras_condicoes: string | null;
  validade_proposta: string | null;
  forma_aceite: string;
  assinatura_proponente: string | null;
  cnh_url: string | null;
  aceite_vendedor_nome: string | null;
  aceite_vendedor_cpf: string | null;
  aceite_vendedor_assinatura: string | null;
  aceite_vendedor_data: string | null;
  status: 'pendente' | 'aceita' | 'recusada' | 'expirada';
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropostaPreFill {
  nome_completo?: string;
  cpf_cnpj?: string;
  telefone?: string;
  email?: string;
  endereco_resumido?: string;
  valor_ofertado?: number;
  ficha_visita_id?: string;
  organization_id?: string;
}
