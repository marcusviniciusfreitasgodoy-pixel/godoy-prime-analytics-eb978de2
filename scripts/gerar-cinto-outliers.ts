// Regenera OUTLIER_LIMITS_TABLE em supabase/functions/_shared/outlierLimits.ts
// a partir do CSV da consulta 7.4 (docs/calibracao-consultas.sql).
//   bun scripts/gerar-cinto-outliers.ts docs/calibracao/<arquivo>.csv [--dry-run]
// Imprime os pares excluídos e as maiores mudanças de piso e teto.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { OUTLIER_LIMITS_TABLE } from "../supabase/functions/_shared/outlierLimits.ts";
import { calcularTabelaCinto, calcularDefaultsCinto, parseCsvCidade, parseCsvCalibracao, renderizarConstantes, renderizarTabela, renderizarSqlCinto } from "../supabase/functions/_shared/outlierLimitsGen.ts";

const [csvPath, cidadePath, ...flags] = process.argv.slice(2);
if (!csvPath || !cidadePath) {
  console.error("uso: bun run cinto <csv 7.4> <csv 7.4b> [--dry-run | --candidate=<arquivo temporário>]");
  process.exit(1);
}
const dryRun = flags.includes("--dry-run");
const alvo = new URL("../supabase/functions/_shared/outlierLimits.ts", import.meta.url).pathname;

const linhas = parseCsvCalibracao(readFileSync(csvPath, "utf8"));
const { tabela, excluidos } = calcularTabelaCinto(linhas);
const cidade = parseCsvCidade(readFileSync(cidadePath, "utf8"));
const defaults = calcularDefaultsCinto(tabela, cidade);
const candidate = flags.find((x) => x.startsWith("--candidate="))?.slice("--candidate=".length);

const pct = (a: number, b: number) => (b === 0 ? "n/d" : `${(((a - b) / b) * 100).toFixed(1)} %`);
const mudancas = Object.entries(tabela).map(([k, e]) => {
  const antes = OUTLIER_LIMITS_TABLE[k];
  return { k, e, antes, dTeto: antes ? Math.abs(e.teto - antes.teto) / antes.teto : 1 };
});
mudancas.sort((a, b) => b.dTeto - a.dTeto);

console.log(`${Object.keys(tabela).length} pares na tabela (antes: ${Object.keys(OUTLIER_LIMITS_TABLE).length}); ${excluidos.length} pares excluídos por amostra.`);
console.log("\nPares novos:", mudancas.filter((m) => !m.antes).map((m) => m.k).join(", ") || "nenhum");
console.log("Pares que saíram:", Object.keys(OUTLIER_LIMITS_TABLE).filter((k) => !tabela[k]).join(", ") || "nenhum");
console.log("\nMaiores mudanças de teto:");
for (const m of mudancas.filter((x) => x.antes).slice(0, 15)) {
  if (!m.antes) continue;
  console.log(`  ${m.k.padEnd(40)} piso ${m.antes.piso} → ${m.e.piso} (${pct(m.e.piso, m.antes.piso)}); teto ${m.antes.teto} → ${m.e.teto} (${pct(m.e.teto, m.antes.teto)}); ${m.e.escrituras} esc., ${m.e.janela}`);
}
console.log("\nExcluídos (escrituras 3 anos / 5 anos):", excluidos.map((x) => `${x.chave} ${x.escrituras3}/${x.escrituras5}`).join("; ") || "nenhum");

console.log(`\nFaixa da cidade ${defaults.pisoCidade} / ${defaults.tetoCidade}; fatores do índice em 5 anos ${defaults.fator} (piso) e ${defaults.fatorMin} (teto); sem bairro, em preço da época: piso ${defaults.minimo}, teto ${defaults.maximo} (${defaults.tetoResidencial} em preço de hoje).`);

if (dryRun) process.exit(0);
const data = new Date().toISOString().slice(0, 10);
mkdirSync(new URL("../docs/calibracao/", import.meta.url), { recursive: true });
const sqlPath = new URL(`../docs/calibracao/cinto-${data}.sql`, import.meta.url);
writeFileSync(sqlPath, renderizarSqlCinto(tabela, cidade, data));
console.log(`SQL de carga da itbi_cinto (não executado): ${sqlPath.pathname}`);

const fonte = readFileSync(alvo, "utf8");
const inicio = fonte.indexOf("export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {\n");
const fim = fonte.indexOf("\n};\n", inicio);
if (inicio < 0 || fim < 0) throw new Error("bloco OUTLIER_LIMITS_TABLE não encontrado em outlierLimits.ts");
const cabecalho = "export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {\n";
let novaFonte = fonte.slice(0, inicio) + cabecalho + renderizarTabela(tabela) + fonte.slice(fim);

const marcaIni = "// <cinto:constantes> (gerado por bun run cinto; não editar)\n";
const marcaFim = "// </cinto:constantes>";
const i0 = novaFonte.indexOf(marcaIni), i1 = novaFonte.indexOf(marcaFim);
if (i0 < 0 || i1 < 0) throw new Error("marcadores <cinto:constantes> não encontrados em outlierLimits.ts");
const nome = (u: string) => u.split("/").pop() ?? u;
novaFonte = novaFonte.slice(0, i0 + marcaIni.length) + renderizarConstantes(defaults, {
  data, pares: Object.keys(tabela).length, excluidos: excluidos.length,
  csv74: nome(csvPath), csv74b: nome(cidadePath), escrituras: cidade.escrituras,
}) + "\n" + novaFonte.slice(i1);

const destino = candidate || alvo;
writeFileSync(destino, novaFonte);
console.log(`${candidate ? "Candidato (não aplicado)" : "Tabela e constantes aplicadas"}: ${destino}. Rode bun run test e atualize o Apêndice B.`);
