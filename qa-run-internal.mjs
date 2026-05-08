import { writeFileSync } from "node:fs";
import { generateAutorizacaoPdf } from "./tmp-autExport.mjs";

const base = {
  codigo:"AUT-2026-0001", created_at:"2026-05-08T14:00:00Z",
  proprietario_nome:"João Carlos da Silva Santos", proprietario_cpf:"123.456.789-00",
  proprietario_rg:"12.345.678-9", proprietario_rg_orgao:"DETRAN/RJ",
  proprietario_telefone:"(21) 99876-5432", proprietario_email:"joao.santos@email.com.br",
  endereco:"Avenida Lúcio Costa", numero:"3600", complemento:"Bloco 2 / Apto 1502",
  bairro:"Barra da Tijuca", cidade:"Rio de Janeiro", cep:"22630-011",
  valor_condominio:2850, valor_iptu:8400, quartos:4, vagas:2,
  valor_avaliacao:3200000, valor_venda:3450000,
  tipo_gestao:"com_exclusiva", prazo_dias:90, percentual_honorarios:5,
  corretor_nome:"Marcus V. F. Godoy", corretor_creci:"CRECI-RJ 12345-J",
};
const tinySig="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAUCAYAAABxRRDxAAAAOklEQVR42u3OQQ0AAAjEMM6/aDDBHkkr2u7awKAQQgghhBBCCCGEEEIIIYQQQgghhBBCCCH4awOXJgABnSqmHwAAAABJRU5ErkJggg==";

async function w(name, data, opts) {
  const blob = await generateAutorizacaoPdf(data, opts || {});
  const ab = await blob.arrayBuffer();
  writeFileSync(`/tmp/${name}.pdf`, Buffer.from(ab));
}
await w("v3-a-rascunho", base);
await w("v3-b-assinada", {...base, assinatura_proprietario:tinySig, assinatura_corretor:tinySig, data_assinatura_proprietario:"2026-05-08T14:30:00Z", ip_assinatura_proprietario:"187.45.122.10", data_vencimento:"2026-08-06"}, {baseUrl:"https://godoy-prime-analytics.lovable.app"});
await w("v3-c-watermark", {...base, tipo_gestao:"sem_exclusiva", proprietario_nome:"Maria Aparecida de Oliveira Cavalcanti Albuquerque Junior", percentual_honorarios:6.5, prazo_dias:120}, {watermark:"PRÉ-VISUALIZAÇÃO"});
console.log("OK");
