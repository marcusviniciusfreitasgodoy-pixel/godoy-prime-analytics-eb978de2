import { describe, expect, it } from "bun:test";
import { fetchPaged } from "../../../supabase/functions/_shared/fetchPaged";

const fonte = (n: number) => Array.from({ length: n }, (_, i) => i);
const build = (rows: number[]) => async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null });

describe("fetchPaged", () => {
  it("lê mais de 5.000 linhas (Barra, 60 meses: 5.744)", async () => {
    expect((await fetchPaged(build(fonte(5744)), 30000)).length).toBe(5744);
  });
  it("respeita o teto", async () => {
    expect((await fetchPaged(build(fonte(3500)), 2000)).length).toBe(2000);
  });
});
