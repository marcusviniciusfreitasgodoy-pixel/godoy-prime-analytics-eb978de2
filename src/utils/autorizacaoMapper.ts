import type { ValuationState } from "@/types/valuation";
import { initialValuationState } from "@/types/valuation";

/**
 * Converte uma linha da tabela `valuations` (com possíveis colunas extras)
 * para um ValuationState parcial compatível com o GerarAutorizacaoDrawer.
 */
export function valuationRowToState(row: any): ValuationState {
  return {
    ...initialValuationState,
    numero: row.numero || "",
    complemento: row.complemento || "",
    nomeCondominio: row.nome_condominio || "",
    condominioSelecionado: null,
    tipoImovel: row.property_type || "",
    quartos: row.quartos || 0,
    suites: row.suites || 0,
    banheiros: row.banheiros || 0,
    vagas: row.vagas || 0,
    andar: row.andar || "",
    proprietario: row.proprietario || "",
    telefone: row.telefone || "",
    proprietario_cpf: row.proprietario_cpf || "",
    proprietario_rg: row.proprietario_rg || "",
    proprietario_rg_orgao: row.proprietario_rg_orgao || "",
    proprietario_email: row.proprietario_email || "",
    cep: row.cep || "",
    cidade: row.cidade || "Rio de Janeiro",
    valor_condominio: Number(row.valor_condominio) || 0,
    valor_iptu: Number(row.valor_iptu) || 0,
    dataAvaliacao: row.created_at ? row.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    observacoesImovel: row.observacoes_imovel || "",
    logradouro: row.logradouro || "",
    bairro: row.bairro || "",
    area_m2: row.property_area_m2 || 0,
  };
}
