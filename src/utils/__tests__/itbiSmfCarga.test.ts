import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  anosDoArquivo,
  BAIRROS_POR_GRUPO,
  gruposDeBairros,
  LOTE_GRAVACAO,
  ultimoMesDe,
} from "../../../supabase/functions/_shared/itbiSmfCarga.ts";

describe("etapas comuns da carga do ITBI SMF", () => {
  it("anos do arquivo pelo nome da SMF", () => {
    expect(anosDoArquivo("ITBI_TRANSACOES_PERIODO_2019_2024.xlsx")).toEqual([2019, 2024]);
    expect(anosDoArquivo("ITBI_TRANSACOES_2025_diante-7-1.xlsx")).toEqual([2025, 9999]);
    expect(anosDoArquivo("ITBI_TRANSACOES_PERIODO_2011_2018.xlsx")).toEqual([2011, 2018]);
  });
  it("só os arquivos que alcançam o ano inicial entram na carga mensal", () => {
    const nomes = ["ITBI_TRANSACOES_PERIODO_2011_2018.xlsx", "ITBI_TRANSACOES_PERIODO_2019_2024.xlsx", "ITBI_TRANSACOES_2025_diante-7-1.xlsx"];
    expect(nomes.filter((n) => anosDoArquivo(n)[1] >= 2026)).toEqual(["ITBI_TRANSACOES_2025_diante-7-1.xlsx"]);
    expect(nomes.filter((n) => anosDoArquivo(n)[1] >= 2024)).toHaveLength(2);
  });
  it("bairros em ordem numérica, em grupos de 12 (define os ids; não mudar)", () => {
    expect(BAIRROS_POR_GRUPO).toBe(12);
    const codigos = Array.from({ length: 30 }, (_, i) => String(30 - i)); // fora de ordem
    const grupos = gruposDeBairros(codigos);
    expect(grupos.map((g) => g.length)).toEqual([12, 12, 6]);
    expect(grupos[0][0]).toBe("1");
    expect(grupos[2].at(-1)).toBe("30");
    // ordem numérica, não alfabética: "100" vem depois de "20"
    expect(gruposDeBairros(["100", "20", "3"])).toEqual([["3", "20", "100"]]);
  });
  it("último mês das escrituras", () => {
    expect(ultimoMesDe([{ ano: 2026, mes: 3 }, { ano: 2026, mes: 9 }, { ano: 2025, mes: 12 }], { ano: 2026, mes: 1 })).toEqual({ ano: 2026, mes: 9 });
    expect(ultimoMesDe([], { ano: 2026, mes: 1 })).toEqual({ ano: 2026, mes: 1 });
  });
  it("lote de gravação igual ao limite da função", () => {
    const funcao = readFileSync(join(import.meta.dir, "../../../supabase/functions/ingest-itbi-smf/index.ts"), "utf8");
    expect(funcao).toContain(`const MAX_LOTE = ${LOTE_GRAVACAO};`);
  });
  it("painel e carga agendada usam o mesmo módulo", () => {
    const painel = readFileSync(join(import.meta.dir, "../../components/admin/CargaItbiSmf.tsx"), "utf8");
    const script = readFileSync(join(import.meta.dir, "../../../scripts/itbi-smf/carga-mensal.ts"), "utf8");
    for (const fonte of [painel, script]) {
      expect(fonte).toContain("gruposDeBairros(");
      expect(fonte).toContain("prepararGrupo(");
      expect(fonte).toContain("lerPorBairro(");
      expect(fonte).not.toContain("BAIRROS_POR_GRUPO =");
    }
  });
  it("a função aceita o segredo da carga agendada e informa o último arquivo recente", () => {
    const funcao = readFileSync(join(import.meta.dir, "../../../supabase/functions/ingest-itbi-smf/index.ts"), "utf8");
    expect(funcao).toContain('Deno.env.get("ITBI_CARGA_SECRET")');
    expect(funcao).toContain("ultimo_arquivo_recente");
    const config = readFileSync(join(import.meta.dir, "../../../supabase/config.toml"), "utf8");
    expect(config).toMatch(/\[functions\.ingest-itbi-smf\]\s*\nverify_jwt = false/);
  });
});
