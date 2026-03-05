import { useState, useEffect } from "react";

export interface LogradouroInteligencia {
  cod_logradouro: string;
  logradouro: string;
  nome_completo_oficial: string | null;
  tipologia: string | null;
  total_imoveis: number | null;
  tot_imoveis_oficial: number | null;
  area_media_unidade: number | null;
  valor_venal_medio: number | null;
  preco_real_medio_itbi: number | null;
  total_transacoes_itbi: number | null;
  desconto_venal_percentual: number | null;
}

export function useLogradouroInteligencia(logradouro: string | undefined) {
  const [data, setData] = useState<LogradouroInteligencia | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!logradouro || logradouro.length < 3) {
      setData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${projectId}.supabase.co/functions/v1/get-logradouro-inteligencia?logradouro=${encodeURIComponent(logradouro)}`;

        const res = await fetch(url, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          setData(json.data || null);
        } else {
          setData(null);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [logradouro]);

  return { data, loading };
}
