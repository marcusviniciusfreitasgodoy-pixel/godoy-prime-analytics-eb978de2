// Leitura paginada (PostgREST). Desde a base SMF (2026-10-21) um bairro pode
// passar de 5.000 linhas na janela de 60 meses; uma única chamada com
// .limit() truncaria a amostra sem aviso. A fábrica recebe (from, to) e deve
// devolver a consulta com .range(from, to) e uma ordenação estável (inclua id).

export const PAGE_SIZE = 1000;

export async function fetchPaged<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  max: number,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const to = Math.min(from + pageSize, max) - 1;
    const { data, error } = await build(from, to);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < to - from + 1) break;
  }
  return out;
}
