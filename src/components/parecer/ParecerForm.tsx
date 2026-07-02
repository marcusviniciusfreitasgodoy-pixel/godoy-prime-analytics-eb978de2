import { ParecerTecnico, findForbidden, NivelRisco, GrauNBR, Comparativo } from "@/lib/parecer/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PhotoUploader } from "./PhotoUploader";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

interface Props {
  data: ParecerTecnico;
  onChange: (patch: Partial<ParecerTecnico>) => void;
  parecerId?: string;
}

function Field({ label, children, warning }: { label: string; children: React.ReactNode; warning?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {warning && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" /> Termo proibido: {warning}
        </div>
      )}
    </div>
  );
}

function checkText(v: string) {
  const found = findForbidden(v);
  return found.length ? found.join(", ") : undefined;
}

export function ParecerForm({ data, onChange, parecerId }: Props) {
  const set = <K extends keyof ParecerTecnico>(k: K, v: ParecerTecnico[K]) => onChange({ [k]: v } as any);

  const addComparativo = () =>
    set("comparativos", [
      ...data.comparativos,
      { endereco: "", area: "", valor: "", valor_m2: "", fonte: "", ajuste: "" } as Comparativo,
    ]);
  const updateComparativo = (i: number, patch: Partial<Comparativo>) =>
    set("comparativos", data.comparativos.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeComparativo = (i: number) => set("comparativos", data.comparativos.filter((_, idx) => idx !== i));

  const addArg = () => set("argumentos", [...data.argumentos, ""]);
  const updateArg = (i: number, v: string) => set("argumentos", data.argumentos.map((a, idx) => (idx === i ? v : a)));
  const removeArg = (i: number) => set("argumentos", data.argumentos.filter((_, idx) => idx !== i));

  return (
    <Accordion type="multiple" defaultValue={["doc", "imovel"]} className="space-y-2">
      <AccordionItem value="doc">
        <AccordionTrigger className="text-sm">Documento</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <Field label="Referencia do documento"><Input value={data.referencia_documento} onChange={(e) => set("referencia_documento", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de emissao"><Input type="date" value={data.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} /></Field>
            <Field label="Data de referencia"><Input type="date" value={data.data_referencia} onChange={(e) => set("data_referencia", e.target.value)} /></Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sumario">
        <AccordionTrigger className="text-sm">1. Sumario Executivo</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <Field label="Objetivo" warning={checkText(data.objetivo)}><Textarea rows={2} value={data.objetivo} onChange={(e) => set("objetivo", e.target.value)} /></Field>
          <Field label="Finalidade" warning={checkText(data.finalidade)}><Textarea rows={2} value={data.finalidade} onChange={(e) => set("finalidade", e.target.value)} /></Field>
          <Field label="Pressupostos" warning={checkText(data.pressupostos)}><Textarea rows={3} value={data.pressupostos} onChange={(e) => set("pressupostos", e.target.value)} /></Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="imovel">
        <AccordionTrigger className="text-sm">2. Identificacao do Imovel</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <Field label="Endereco"><Input value={data.endereco_imovel} onChange={(e) => set("endereco_imovel", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bairro"><Input value={data.bairro} onChange={(e) => set("bairro", e.target.value)} /></Field>
            <Field label="Tipologia"><Input value={data.tipologia} onChange={(e) => set("tipologia", e.target.value)} /></Field>
            <Field label="Area privativa (m2)"><Input value={data.area_privativa} onChange={(e) => set("area_privativa", e.target.value)} /></Field>
            <Field label="Area total (m2)"><Input value={data.area_total} onChange={(e) => set("area_total", e.target.value)} /></Field>
            <Field label="Quartos"><Input value={data.quartos} onChange={(e) => set("quartos", e.target.value)} /></Field>
            <Field label="Suites"><Input value={data.suites} onChange={(e) => set("suites", e.target.value)} /></Field>
            <Field label="Vagas"><Input value={data.vagas} onChange={(e) => set("vagas", e.target.value)} /></Field>
            <Field label="Ano de construcao"><Input value={data.ano_construcao} onChange={(e) => set("ano_construcao", e.target.value)} /></Field>
          </div>
          <Field label="Condominio"><Input value={data.condominio} onChange={(e) => set("condominio", e.target.value)} /></Field>
          <Field label="Matricula"><Input value={data.matricula} onChange={(e) => set("matricula", e.target.value)} /></Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="regiao">
        <AccordionTrigger className="text-sm">3. Diagnostico da Regiao</AccordionTrigger>
        <AccordionContent className="pt-2">
          <Field label="Diagnostico" warning={checkText(data.diagnostico_regiao)}>
            <Textarea rows={8} value={data.diagnostico_regiao} onChange={(e) => set("diagnostico_regiao", e.target.value)} />
          </Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="metod">
        <AccordionTrigger className="text-sm">4. Fundamentacao e Metodologia</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <Field label="Tipo de tratamento">
            <Select value={data.tipo_tratamento} onValueChange={(v) => set("tipo_tratamento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Tratamento por fatores">Tratamento por fatores</SelectItem>
                <SelectItem value="Tratamento cientifico por regressao">Tratamento cientifico por regressao</SelectItem>
                <SelectItem value="Tratamento por homogeneizacao">Tratamento por homogeneizacao</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fundamentacao metodologica" warning={checkText(data.fundamentacao_metodologica)}>
            <Textarea rows={6} value={data.fundamentacao_metodologica} onChange={(e) => set("fundamentacao_metodologica", e.target.value)} />
          </Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="amostra">
        <AccordionTrigger className="text-sm">5. Amostra e Comparativos</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {data.comparativos.map((c, i) => (
            <div key={i} className="border rounded p-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">Comparativo {i + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => removeComparativo(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <Input placeholder="Endereco" value={c.endereco} onChange={(e) => updateComparativo(i, { endereco: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Area" value={c.area} onChange={(e) => updateComparativo(i, { area: e.target.value })} />
                <Input placeholder="Valor" value={c.valor} onChange={(e) => updateComparativo(i, { valor: e.target.value })} />
                <Input placeholder="Valor/m2" value={c.valor_m2} onChange={(e) => updateComparativo(i, { valor_m2: e.target.value })} />
                <Input placeholder="Fonte" value={c.fonte} onChange={(e) => updateComparativo(i, { fonte: e.target.value })} />
              </div>
              <Input placeholder="Ajuste" value={c.ajuste} onChange={(e) => updateComparativo(i, { ajuste: e.target.value })} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addComparativo}><Plus className="h-3 w-3 mr-1" />Adicionar comparativo</Button>
          <Field label="Tratamento da amostra"><Textarea rows={4} value={data.tratamento_amostra} onChange={(e) => set("tratamento_amostra", e.target.value)} /></Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="vistoria">
        <AccordionTrigger className="text-sm">6. Vistoria Presencial</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <Field label="Estado de conservacao"><Input value={data.estado_conservacao} onChange={(e) => set("estado_conservacao", e.target.value)} /></Field>
          <Field label="Padrao de acabamento"><Input value={data.padrao_acabamento} onChange={(e) => set("padrao_acabamento", e.target.value)} /></Field>
          <Field label="Vista"><Input value={data.vista} onChange={(e) => set("vista", e.target.value)} /></Field>
          <Field label="Posicao solar"><Input value={data.posicao_solar} onChange={(e) => set("posicao_solar", e.target.value)} /></Field>
          <Field label="Reformas e benfeitorias"><Textarea rows={3} value={data.reformas} onChange={(e) => set("reformas", e.target.value)} /></Field>
          <Field label="Observacoes do perito" warning={checkText(data.observacoes_perito)}><Textarea rows={4} value={data.observacoes_perito} onChange={(e) => set("observacoes_perito", e.target.value)} /></Field>
          <div>
            <Label className="text-xs mb-2 block">Fotos da vistoria</Label>
            <PhotoUploader parecerId={parecerId} fotos={data.fotos} onChange={(fotos) => set("fotos", fotos)} />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="riscos">
        <AccordionTrigger className="text-sm">7. Analise de Riscos</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          {(["estrutural", "documental", "condominial"] as const).map((k) => {
            const textKey = `riscos_${k === "estrutural" ? "estruturais" : k === "documental" ? "documentais" : "condominiais"}` as keyof ParecerTecnico;
            const nivelKey = `nivel_${k}` as keyof ParecerTecnico;
            return (
              <div key={k} className="border rounded p-2 space-y-2">
                <Label className="text-xs capitalize">Riscos {k === "estrutural" ? "estruturais" : k === "documental" ? "documentais" : "condominiais"}</Label>
                <Textarea rows={3} value={data[textKey] as string} onChange={(e) => onChange({ [textKey]: e.target.value } as any)} />
                <Select value={data[nivelKey] as NivelRisco} onValueChange={(v) => onChange({ [nivelKey]: v as NivelRisco } as any)}>
                  <SelectTrigger><SelectValue placeholder="Nivel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixo">Baixo</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="resultado">
        <AccordionTrigger className="text-sm">8. Resultado e Enquadramento NBR</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor de mercado (R$)"><Input value={data.valor_mercado} onChange={(e) => set("valor_mercado", e.target.value)} /></Field>
            <Field label="Valor por m2 (R$)"><Input value={data.valor_m2_apurado} onChange={(e) => set("valor_m2_apurado", e.target.value)} /></Field>
          </div>
          <Field label="Intervalo de valor"><Input value={data.intervalo_valor} onChange={(e) => set("intervalo_valor", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grau de Fundamentacao">
              <Select value={data.grau_fundamentacao} onValueChange={(v) => set("grau_fundamentacao", v as GrauNBR)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["I", "II", "III"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Grau de Precisao">
              <Select value={data.grau_precisao} onValueChange={(v) => set("grau_precisao", v as GrauNBR)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["I", "II", "III"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="neg">
        <AccordionTrigger className="text-sm">9. Estrategia de Negociacao</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Faixa de abertura"><Input value={data.faixa_abertura} onChange={(e) => set("faixa_abertura", e.target.value)} /></Field>
            <Field label="Valor-alvo"><Input value={data.valor_alvo} onChange={(e) => set("valor_alvo", e.target.value)} /></Field>
            <Field label="Piso"><Input value={data.piso_negociacao} onChange={(e) => set("piso_negociacao", e.target.value)} /></Field>
          </div>
          <Label className="text-xs">Argumentos tecnicos</Label>
          {data.argumentos.map((a, i) => (
            <div key={i} className="flex gap-2">
              <Textarea rows={2} value={a} onChange={(e) => updateArg(i, e.target.value)} />
              <Button size="icon" variant="ghost" onClick={() => removeArg(i)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addArg}><Plus className="h-3 w-3 mr-1" />Adicionar argumento</Button>
          <Field label="Alavancagem para o comprador"><Textarea rows={4} value={data.alavancagem} onChange={(e) => set("alavancagem", e.target.value)} /></Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="concl">
        <AccordionTrigger className="text-sm">10. Conclusao</AccordionTrigger>
        <AccordionContent className="pt-2">
          <Textarea rows={8} value={data.conclusao} onChange={(e) => set("conclusao", e.target.value)} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
