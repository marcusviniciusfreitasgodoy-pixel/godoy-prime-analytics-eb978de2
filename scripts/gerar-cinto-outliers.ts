// Regenera OUTLIER_LIMITS_TABLE em supabase/functions/_shared/outlierLimits.ts
// a partir do CSV da consulta 7.4 (docs/calibracao-consultas.sql).
//   bun scripts/gerar-cinto-outliers.ts docs/calibracao/<arquivo>.csv [--dry-run]
// Imprime os pares excluídos e as maiores mudanças de piso e teto.
import { readFileSync, writeFileSync } from "node:fs";
import { OUTLIER_LIMITS_TABLE } from "../supabase/functions/_shared/outlierLimits.ts";
import { calcularTabelaCinto, parseCsvCalibracao, renderizarTabela } from "../supabase/functions/_shared/outlierLimitsGen.ts";

const [csvPath, ...flags] = process.argv.slice(2);
if (!csvPath) {
  console.error("uso: bun scripts/gerar-cinto-outliers.ts <csv da consulta 7.4> [--dry-run]");
  process.exit(1);
}
const dryRun = flags.includes("--dry-run");
const alvo = new URL("../supabase/functions/_shared/outlierLimits.ts", import.meta.url).pathname;

const linhas = parseCsvCalibracao(readFileSync(csvPath, "utf8"));
const { tabela, excluidos } = calcularTabelaCinto(linhas);

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
  console.log(`  ${m.k.padEnd(40)} piso ${m.antes!.piso} → ${m.e.piso} (${pct(m.e.piso, m.antes!.piso)}); teto ${m.antes!.teto} → ${m.e.teto} (${pct(m.e.teto, m.antes!.teto)}); ${m.e.escrituras} esc., ${m.e.janela}`);
}
console.log("\nExcluídos (escrituras 3 anos / 5 anos):", excluidos.map((x) => `${x.chave} ${x.escrituras3}/${x.escrituras5}`).join("; ") || "nenhum");

if (dryRun) process.exit(0);
const fonte = readFileSync(alvo, "utf8");
const inicio = fonte.indexOf("export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {\n");
const fim = fonte.indexOf("\n};\n", inicio);
if (inicio < 0 || fim < 0) throw new Error("bloco OUTLIER_LIMITS_TABLE não encontrado em outlierLimits.ts");
const cabecalho = "export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {\n";
writeFileSync(alvo, fonte.slice(0, inicio) + cabecalho + renderizarTabela(tabela) + fonte.slice(fim));
console.log(`\n${alvo} reescrito. Rode bun run test e regenere o Apêndice B da especificação.`);
