import { describe, expect, it } from "bun:test";
import { consultarPagina } from "../../lib/mcp/pagination";

describe("Histórico MCP paginado", () => {
  const permitidos = Array.from({ length: 237 }, (_, id) => ({ id }));
  const build = async (from: number, to: number) => ({ data: permitidos.slice(from, to + 1), count: permitidos.length, error: null });

  it("permite percorrer todo o histórico, além dos 100 registros, sem repetir ou perder registros", async () => {
    const ids: number[] = [];
    let pagina: number | null = 1;
    while (pagina !== null) {
      const result = await consultarPagina(build, pagina, 100);
      ids.push(...result.registros.map(r => r.id));
      pagina = result.proxima_pagina;
    }
    expect(ids).toEqual(permitidos.map(r => r.id));
  });

  it("retorna o total permitido, e não o tamanho da página", async () => {
    const result = await consultarPagina(build, 2, 100);
    expect(result.total_registros).toBe(237);
    expect(result.total_paginas).toBe(3);
    expect(result.registros.length).toBe(100);
    expect(result.registros[0]?.id).toBe(100);
    expect(result.proxima_pagina).toBe(3);
  });

  it("mantém os padrões de página 1 e 20 registros", async () => {
    const result = await consultarPagina(build);
    expect(result.pagina).toBe(1);
    expect(result.limite).toBe(20);
    expect(result.registros.length).toBe(20);
  });

  it("termina na última página e trata páginas além do histórico", async () => {
    const last = await consultarPagina(build, 3, 100);
    expect(last.registros.length).toBe(37);
    expect(last.tem_proxima_pagina).toBe(false);
    expect(last.proxima_pagina).toBeNull();
    expect((await consultarPagina(build, 4, 100)).registros).toEqual([]);
  });

  it("retorna zero quando não há registros permitidos", async () => {
    const result = await consultarPagina(async () => ({ data: [], count: 0, error: null }));
    expect(result.total_registros).toBe(0);
    expect(result.total_paginas).toBe(0);
    expect(result.proxima_pagina).toBeNull();
  });

  it("não inventa total quando a contagem falha", async () => {
    await expect(consultarPagina(async () => ({ data: [], count: null, error: null }))).rejects.toThrow();
  });

  it("recusa páginas inválidas e tamanhos acima de 100", async () => {
    await expect(consultarPagina(build, 0, 20)).rejects.toThrow();
    await expect(consultarPagina(build, 1, 101)).rejects.toThrow();
  });
});