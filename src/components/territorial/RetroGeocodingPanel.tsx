import { useEffect, useState } from "react";
import { Loader2, MapPin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BairroStat {
  bairro: string;
  sem_geom: number;
}

const PRIORIDADE = [
  "BARRA DA TIJUCA",
  "RECREIO DOS BANDEIRANTES",
  "COPACABANA",
  "TIJUCA",
  "CENTRO",
  "BOTAFOGO",
  "JACAREPAGUÁ",
  "IPANEMA",
  "LEBLON",
  "CAMPO GRANDE",
];

export function RetroGeocodingPanel() {
  const { toast } = useToast();
  const [stats, setStats] = useState<BairroStat[]>([]);
  const [totalSemGeom, setTotalSemGeom] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; bairro: string } | null>(null);

  const carregarStats = async () => {
    setLoading(true);
    try {
      // Fetch up to 5000 pending rows and aggregate client-side (avoids RPC dep)
      const { data, error } = await supabase
        .from("itbi_transactions")
        .select("bairro")
        .is("geom", null)
        .is("geocodificado_via", null)
        .limit(5000);
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const b = r.bairro || "(sem bairro)";
        counts[b] = (counts[b] || 0) + 1;
      });
      const arr = Object.entries(counts)
        .map(([bairro, sem_geom]) => ({ bairro, sem_geom }))
        .sort((a, b) => {
          const pa = PRIORIDADE.indexOf(a.bairro);
          const pb = PRIORIDADE.indexOf(b.bairro);
          if (pa !== -1 && pb !== -1) return pa - pb;
          if (pa !== -1) return -1;
          if (pb !== -1) return 1;
          return b.sem_geom - a.sem_geom;
        })
        .slice(0, 15);
      setStats(arr);
      setTotalSemGeom((data || []).length);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarStats();
  }, []);

  const geocodificarBairro = async (bairro: string) => {
    setRunning(bairro);
    setProgress({ done: 0, bairro });
    let total = 0;
    let iter = 0;
    const MAX_ITER = 30;
    try {
      while (iter < MAX_ITER) {
        iter++;
        const { data, error } = await supabase.functions.invoke(
          "geocodificar-itbi-transactions",
          { body: { bairro, limite: 500 } }
        );
        if (error) throw error;
        total += (data?.geocodificados ?? 0) + (data?.erros ?? 0);
        setProgress({ done: total, bairro });
        if (data?.completo) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      toast({
        title: "Geocodificação concluída",
        description: `${bairro}: ${total} registros processados em ${iter} lotes.`,
      });
      carregarStats();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geocodificação Retroativa ITBI
          </p>
          <p className="text-[11px] text-muted-foreground">
            {loading
              ? "Carregando..."
              : `${totalSemGeom.toLocaleString("pt-BR")} transações sem coordenadas (top 15 bairros — amostra de 5.000)`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={carregarStats} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      {progress && (
        <div className="border border-border rounded-lg p-3 space-y-1 bg-muted/30">
          <p className="text-xs">
            Geocodificando <strong>{progress.bairro}</strong> — {progress.done} processados...
          </p>
          <Progress value={Math.min(100, (progress.done / 500) * 10)} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {stats.map((s) => (
          <div
            key={s.bairro}
            className="flex items-center justify-between border border-border rounded px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{s.bairro}</p>
              <p className="text-[10px] text-muted-foreground">
                {s.sem_geom.toLocaleString("pt-BR")} sem geom
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={running !== null}
              onClick={() => geocodificarBairro(s.bairro)}
              className="gap-1 shrink-0"
            >
              {running === s.bairro ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Geocodificar
            </Button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Cada lote processa 500 registros (~50s). Cada bairro pode levar vários minutos. Custo
        aproximado: $5 por 1.000 geocodificações via Google Maps API.
      </p>
    </div>
  );
}