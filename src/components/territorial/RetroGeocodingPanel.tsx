import { useEffect, useState } from "react";
import { Loader2, MapPin, Play, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeoStatus {
  total: number;
  com_geom: number;
  sem_geom: number;
  ruas_sem_geom: number;
  com_erro: number;
}

export function RetroGeocodingPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState<GeoStatus | null>(null);
  const [pendentes, setPendentes] = useState<Array<{ logradouro: string; bairro: string; registros: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<"backfill" | "google" | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: st, error: stErr }, { data: pend }] = await Promise.all([
        supabase.rpc("itbi_geocoding_status"),
        supabase.rpc("itbi_logradouros_pendentes", { p_limite: 15, p_bairro: null }),
      ]);
      if (stErr) throw stErr;
      setStatus(st as unknown as GeoStatus);
      setPendentes((pend as any[]) ?? []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const rodarBackfill = async () => {
    setRunning("backfill");
    setProgresso("Vinculando transações à base de logradouros já geolocalizada...");
    try {
      const { data, error } = await supabase.rpc("backfill_itbi_geom_from_logradouros");
      if (error) throw error;
      const r = data as any;
      toast({
        title: "Vinculação concluída",
        description: `${(r?.total_atualizados ?? 0).toLocaleString("pt-BR")} transações receberam coordenadas. Restam ${(r?.restantes_sem_geom ?? 0).toLocaleString("pt-BR")}.`,
      });
      await carregar();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRunning(null);
      setProgresso(null);
    }
  };

  const rodarGoogle = async () => {
    setRunning("google");
    let lote = 0;
    let ruas = 0;
    let registros = 0;
    try {
      while (lote < 40) {
        lote++;
        setProgresso(`Lote ${lote}: geocodificando ruas pendentes (${ruas} ruas, ${registros} registros)...`);
        const { data, error } = await supabase.functions.invoke("geocodificar-itbi-logradouros", {
          body: { limite: 60 },
        });
        if (error) throw error;
        ruas += data?.ruas_geocodificadas ?? 0;
        registros += data?.registros_atualizados ?? 0;
        if (data?.completo || (data?.ruas_geocodificadas === 0 && data?.erros === 0)) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
      toast({
        title: "Geocodificação concluída",
        description: `${ruas} ruas geocodificadas, ${registros.toLocaleString("pt-BR")} transações atualizadas em ${lote} lotes.`,
      });
      await carregar();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRunning(null);
      setProgresso(null);
    }
  };

  const pct = status && status.total > 0 ? Math.round((status.com_geom / status.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geocodificação Retroativa ITBI
          </p>
          <p className="text-[11px] text-muted-foreground">
            {loading || !status
              ? "Carregando..."
              : `${status.com_geom.toLocaleString("pt-BR")} de ${status.total.toLocaleString("pt-BR")} transações com coordenadas (${pct}%) — ${status.ruas_sem_geom.toLocaleString("pt-BR")} ruas pendentes`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={carregar} disabled={loading || running !== null}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </div>

      <Progress value={pct} />

      {progresso && (
        <div className="border border-border rounded-lg p-3 bg-muted/30">
          <p className="text-xs flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progresso}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Button variant="outline" onClick={rodarBackfill} disabled={running !== null} className="gap-2">
          {running === "backfill" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Vincular pela base de logradouros (sem custo)
        </Button>
        <Button onClick={rodarGoogle} disabled={running !== null} className="gap-2">
          {running === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Geocodificar ruas restantes (Google)
        </Button>
      </div>

      {pendentes.length > 0 && (
        <div className="border border-border rounded-lg p-3 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            Ruas pendentes com maior volume
          </p>
          {pendentes.map((p) => (
            <div key={`${p.logradouro}-${p.bairro}`} className="flex items-center justify-between text-[11px]">
              <span className="truncate">
                {p.logradouro} <span className="text-muted-foreground">· {p.bairro}</span>
              </span>
              <span className="text-muted-foreground shrink-0 ml-2">{p.registros} reg.</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        A vinculação pela base de logradouros é gratuita e instantânea. A geocodificação Google roda por rua
        (não por registro), então o custo cai de milhares para poucas centenas de chamadas.
      </p>
    </div>
  );
}
