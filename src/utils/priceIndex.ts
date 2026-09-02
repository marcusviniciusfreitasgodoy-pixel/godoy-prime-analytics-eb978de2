import { supabase } from "@/integrations/supabase/client";
import type { PriceIndexPoint } from "./itbiMarketStats";

// Índice de preços (materialized view itbi_price_index). Cache em memória por
// sessão: o índice só muda quando a sincronização diária roda.
const TTL_MS = 6 * 60 * 60 * 1000;
let cache: { at: number; data: PriceIndexPoint[] | null } | null = null;

/**
 * Busca o índice trimestral. Devolve null quando a view ainda não existe no
 * banco (migration não aplicada) ou quando a leitura falha: o motor então
 * calcula sem correção temporal e registra isso nos metadados.
 */
export const fetchPriceIndex = async (): Promise<PriceIndexPoint[] | null> => {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  // A materialized view ainda não consta nos tipos gerados; acesso via cast.
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string, o: { ascending: boolean }) => Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const { data, error } = await client
    .from("itbi_price_index")
    .select("trimestre, ln_mediana, escrituras")
    .order("trimestre", { ascending: true });

  let points: PriceIndexPoint[] | null = null;
  if (error) {
    console.warn("[priceIndex] índice de preços indisponível (migration aplicada?):", error.message);
  } else {
    points = (data || [])
      .filter((r) => r.trimestre && typeof r.ln_mediana === "number")
      .map((r) => ({
        trimestre: String(r.trimestre),
        ln_mediana: Number(r.ln_mediana),
        escrituras: Number(r.escrituras) || 0,
      }));
  }

  cache = { at: Date.now(), data: points };
  return points;
};

/** Apenas para testes/depuração. */
export const resetPriceIndexCache = (): void => {
  cache = null;
};
