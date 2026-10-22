import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Database, Loader2 } from "lucide-react";
import type { EscrituraSmf, LinhaSmf } from "@/utils/itbiSmf";
import { janelasTrimestrais } from "../../../supabase/functions/_shared/itbiFonte";

// Carga do ITBI por escritura (planilhas da SMF), feita a partir do navegador
// do administrador. O processamento pesado (descompactar e ler a planilha, que
// passa do limite de CPU das edge functions no arquivo 2019-2024) roda aqui; a
// leitura dos bytes da SMF e toda gravação passam pela função ingest-itbi-smf,
// com o login do admin. Ver supabase/functions/_shared/itbiSmf.ts.

const FUNCAO = "ingest-itbi-smf";
const BAIRRO_BARRA = "128";
const BLOCO = 4 * 1024 * 1024; // mesmo teto de faixa da função
const LOTE = 1000;
const BAIRROS_POR_GRUPO = 12;

interface ArquivoSmf { url: string; nome: string; tamanho: number; recente: boolean }
interface Status { escrituras: number; ultima_escritura: string | null; transacoes_smf: number; transacoes_arcgis: number }

/** Anos cobertos pelo arquivo, pelo nome (PERIODO_2019_2024, 2025_diante). */
const anosDoArquivo = (nome: string): [number, number] => {
  const p = nome.match(/PERIODO_(\d{4})_(\d{4})/i);
  if (p) return [Number(p[1]), Number(p[2])];
  const d = nome.match(/(\d{4})_diante/i);
  if (d) return [Number(d[1]), 9999];
  return [0, 9999];
};

/** Corpo de erro que a função devolve (o supabase-js só diz "non-2xx"). */
const erroDaFuncao = async (error: unknown): Promise<Error> => {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.clone === "function") {
    try {
      const corpo = await ctx.clone().json();
      if (corpo?.error) return new Error(String(corpo.error));
    } catch {
      // segue com a mensagem original
    }
  }
  return error instanceof Error ? error : new Error("Falha ao chamar a função de carga.");
};

const chamar = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(FUNCAO, { body });
  if (error) throw await erroDaFuncao(error);
  if (data && typeof data === "object" && "error" in data) throw new Error(String((data as { error: unknown }).error));
  return data as T;
};

export function CargaItbiSmf() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [escopo, setEscopo] = useState<"barra" | "cidade">("barra");
  const [desde, setDesde] = useState("2019");
  const [simular, setSimular] = useState(true);
  const [rodando, setRodando] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const cancelar = useRef(false);

  const anotar = (linha: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString("pt-BR")}  ${linha}`]);

  const carregarStatus = useCallback(async () => {
    try {
      setStatus(await chamar<Status>({ acao: "status" }));
    } catch (e) {
      console.warn("[CargaItbiSmf] status indisponível:", e);
    }
  }, []);

  useEffect(() => { carregarStatus(); }, [carregarStatus]);

  const executar = async () => {
    cancelar.current = false;
    setRodando(true);
    setLog([]);
    setProgresso(0);
    const anoMin = Number(desde) || 2019;
    const somenteBarra = escopo === "barra";
    try {
      const m = await import("@/utils/itbiSmf");

      setEtapa("Consultando a página da SMF");
      const { arquivos } = await chamar<{ arquivos: ArquivoSmf[] }>({ acao: "arquivos" });
      const usar = arquivos.filter((a) => anosDoArquivo(a.nome)[1] >= anoMin);
      anotar(`Arquivos da SMF: ${usar.map((a) => `${a.nome} (${(a.tamanho / 1e6).toFixed(1)} MB)`).join(", ")}`);

      const totalBytes = usar.reduce((s, a) => s + a.tamanho, 0);
      let bytesLidos = 0;
      let gravadasTotal = 0;
      let rejeitadasTotal = 0;
      let ultimoMes = { ano: anoMin, mes: 1 };
      const geoContagem: Record<string, number> = {};

      for (const arq of usar) {
        if (cancelar.current) throw new Error("Carga cancelada.");
        setEtapa(`Lendo ${arq.nome}`);
        const ler = async (inicio: number, fim: number): Promise<Uint8Array> => {
          const { data, error } = await supabase.functions.invoke(FUNCAO, { body: { acao: "faixa", url: arq.url, inicio, fim } });
          if (error) throw await erroDaFuncao(error);
          const buf = new Uint8Array(await (data as Blob).arrayBuffer());
          bytesLidos += buf.length;
          setProgresso(Math.min(60, Math.round((bytesLidos / totalBytes) * 60)));
          return buf;
        };

        // 1. Ler a planilha uma vez, separando as linhas por bairro.
        const porBairro = new Map<string, LinhaSmf[]>();
        let lidas = 0;
        for await (const l of m.lerPlanilhaSmf(ler, arq.tamanho, {
          bairros: somenteBarra ? new Set([BAIRRO_BARRA]) : undefined,
          desde: anoMin,
        })) {
          const cod = String(parseInt(l.CD_BAIRRO, 10) || 0);
          if (!porBairro.has(cod)) porBairro.set(cod, []);
          porBairro.get(cod)!.push(l);
          lidas++;
          if (lidas % 20000 === 0) setEtapa(`Lendo ${arq.nome}: ${lidas.toLocaleString("pt-BR")} escrituras`);
        }
        anotar(`${arq.nome}: ${lidas.toLocaleString("pt-BR")} escrituras em ${porBairro.size} bairros`);

        // 2. Por grupo de bairros: normalizar, geocodificar, gravar.
        const codigos = [...porBairro.keys()].sort((a, b) => Number(a) - Number(b));
        for (let g = 0; g < codigos.length; g += BAIRROS_POR_GRUPO) {
          if (cancelar.current) throw new Error("Carga cancelada.");
          const grupo = codigos.slice(g, g + BAIRROS_POR_GRUPO);
          const linhas = grupo.flatMap((c) => porBairro.get(c) ?? []);
          let esc: EscrituraSmf[] = await m.normalizarEscrituras(linhas, arq.nome);
          setEtapa(`Geocodificando ${arq.nome}: bairros ${g + 1} a ${Math.min(g + grupo.length, codigos.length)} de ${codigos.length}`);
          esc = await m.geocodificarEscrituras(esc, async (u) => (await fetch(u)).json());
          for (const e of esc) {
            const k = (e.geo_precisao ?? "sem").split(" (")[0];
            geoContagem[k] = (geoContagem[k] ?? 0) + 1;
            if (!e.aceita) rejeitadasTotal++;
            if (e.ano > ultimoMes.ano || (e.ano === ultimoMes.ano && e.mes > ultimoMes.mes)) ultimoMes = { ano: e.ano, mes: e.mes };
          }
          if (!simular) {
            for (let i = 0; i < esc.length; i += LOTE) {
              if (cancelar.current) throw new Error("Carga cancelada.");
              await chamar({ acao: "gravar", escrituras: esc.slice(i, i + LOTE) });
              gravadasTotal += Math.min(LOTE, esc.length - i);
            }
          } else {
            gravadasTotal += esc.length;
          }
          grupo.forEach((c) => porBairro.delete(c));
          setProgresso(60 + Math.round(((g + grupo.length) / codigos.length) * 25 * (usar.indexOf(arq) + 1) / usar.length));
        }
      }

      anotar(`${simular ? "Seriam gravadas" : "Gravadas"} ${gravadasTotal.toLocaleString("pt-BR")} escrituras ` +
        `(${rejeitadasTotal.toLocaleString("pt-BR")} fora dos limites do app, guardadas mas fora da consolidação).`);
      anotar(`Geocodificação: ${Object.entries(geoContagem).map(([k, v]) => `${k} ${v.toLocaleString("pt-BR")}`).join(", ")}.`);

      // 3. Consolidar em itbi_transactions, um trimestre por chamada: com as
      // regras por prédio do cinto, um ano inteiro da cidade passa do limite
      // de tempo da função.
      if (!simular) {
        const janelas = janelasTrimestrais(anoMin, ultimoMes);
        for (let i = 0; i < janelas.length; i++) {
          if (cancelar.current) throw new Error("Carga cancelada.");
          const j = janelas[i];
          setEtapa(`Consolidando ${somenteBarra ? "a Barra da Tijuca, " : ""}${j.rotulo}`);
          const r = await chamar<{ resultado: Record<string, unknown> }>({
            acao: "consolidar", inicio: j.inicio, fim: j.fim, ...(somenteBarra ? { bairro: "BARRA DA TIJUCA" } : {}),
          });
          const cinto = r.resultado?.cinto as { alteradas?: number } | undefined;
          anotar(`Consolidação ${j.rotulo}: ${r.resultado?.escrituras_consideradas} escrituras, ` +
            `${r.resultado?.linhas_removidas} linhas antigas trocadas por ${r.resultado?.linhas_inseridas}; ` +
            `${cinto?.alteradas ?? 0} marcações do cinto alteradas.`);
          setProgresso(85 + Math.round(((i + 1) / janelas.length) * 15));
        }
        await queryClient.invalidateQueries();
      }

      setProgresso(100);
      setEtapa(simular ? "Simulação concluída: nada foi gravado" : "Carga concluída");
      toast({ title: simular ? "Simulação concluída" : "Carga do ITBI concluída", description: `${gravadasTotal.toLocaleString("pt-BR")} escrituras.` });
      await carregarStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      anotar(`ERRO: ${msg}`);
      setEtapa("Interrompido");
      toast({ title: "Carga interrompida", description: msg, variant: "destructive" });
    } finally {
      setRodando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-accent" />
          <CardTitle>ITBI por escritura (SMF)</CardTitle>
        </div>
        <CardDescription>
          Baixa as planilhas de transações da Secretaria Municipal de Fazenda, grava cada escritura e consolida a base
          que o motor de avaliação lê. Rode primeiro em simulação; a carga real substitui os meses carregados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-muted-foreground">Escrituras SMF</p><p className="font-semibold">{status.escrituras.toLocaleString("pt-BR")}</p></div>
            <div><p className="text-muted-foreground">Última escritura</p><p className="font-semibold">{status.ultima_escritura ? status.ultima_escritura.slice(0, 7) : "nenhuma"}</p></div>
            <div><p className="text-muted-foreground">Linhas da SMF na base</p><p className="font-semibold">{status.transacoes_smf.toLocaleString("pt-BR")}</p></div>
            <div><p className="text-muted-foreground">Linhas da camada antiga</p><p className="font-semibold">{status.transacoes_arcgis.toLocaleString("pt-BR")}</p></div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Abrangência</Label>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as "barra" | "cidade")} disabled={rodando}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="barra">Barra da Tijuca (piloto)</SelectItem>
                <SelectItem value="cidade">Cidade inteira</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>A partir de</Label>
            <Select value={desde} onValueChange={setDesde} disabled={rodando}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox id="simular-smf" checked={simular} onCheckedChange={(v) => setSimular(v === true)} disabled={rodando} />
            <Label htmlFor="simular-smf">Só simular (não grava)</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={executar} disabled={rodando}>
            {rodando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            {simular ? "Simular carga" : "Carregar e consolidar"}
          </Button>
          {rodando && (
            <Button variant="outline" onClick={() => { cancelar.current = true; }}>Cancelar</Button>
          )}
        </div>

        {(rodando || etapa) && (
          <div className="space-y-2">
            <Progress value={progresso} />
            <p className="text-sm text-muted-foreground">{etapa}</p>
          </div>
        )}

        {log.length > 0 && (
          <pre className="text-xs bg-muted rounded-md p-3 max-h-64 overflow-auto whitespace-pre-wrap" data-testid="log-carga-smf">
            {log.join("\n")}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
