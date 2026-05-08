import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Save, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/hooks/useAuth";
import { AutorizacaoDocumentoPreview } from "./AutorizacaoDocumentoPreview";
import { useCreateAutorizacao, useEnviarAutorizacao } from "@/hooks/useAutorizacoes";
import { isValidCPF, maskCPF } from "@/utils/cpfValidator";
import type { AutorizacaoFormData, TipoGestao } from "@/types/autorizacao";
import type { ValuationState } from "@/types/valuation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ValuationState;
  valuationId: string;
}

export function GerarAutorizacaoDrawer({ open, onOpenChange, state, valuationId }: Props) {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { user } = useAuth();
  const createMut = useCreateAutorizacao();
  const enviarMut = useEnviarAutorizacao();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<AutorizacaoFormData>(() => ({
    proprietario_nome: state.proprietario || "",
    proprietario_cpf: state.proprietario_cpf || "",
    proprietario_rg: state.proprietario_rg || "",
    proprietario_rg_orgao: state.proprietario_rg_orgao || "",
    proprietario_telefone: state.telefone || "",
    proprietario_email: state.proprietario_email || "",
    endereco: state.logradouro || "",
    numero: state.numero || "",
    complemento: state.complemento || "",
    bairro: state.bairro || "",
    cidade: state.cidade || "Rio de Janeiro",
    cep: state.cep || "",
    valor_condominio: state.valor_condominio ? String(state.valor_condominio) : "",
    valor_iptu: state.valor_iptu ? String(state.valor_iptu) : "",
    vagas: state.vagas || 0,
    quartos: state.quartos || 0,
    valor_avaliacao: "",
    valor_venda: "",
    tipo_gestao: "com_exclusiva" as TipoGestao,
    prazo_dias: 90,
    percentual_honorarios: 5,
  }));

  const update = <K extends keyof AutorizacaoFormData>(k: K, v: AutorizacaoFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.proprietario_nome.trim()) e.proprietario_nome = "Obrigatório";
    if (!isValidCPF(form.proprietario_cpf)) e.proprietario_cpf = "CPF inválido";
    if (!form.proprietario_email.includes("@")) e.proprietario_email = "E-mail inválido";
    if (!form.endereco.trim()) e.endereco = "Obrigatório";
    if (!form.bairro.trim()) e.bairro = "Obrigatório";
    if (!Number(form.valor_avaliacao)) e.valor_avaliacao = "Informe valor > 0";
    if (!Number(form.valor_venda)) e.valor_venda = "Informe valor > 0";
    return e;
  }, [form]);

  const buildPayload = () => ({
    organization_id: organization?.id,
    valuation_id: valuationId,
    created_by: user?.id,
    proprietario_nome: form.proprietario_nome.trim(),
    proprietario_cpf: form.proprietario_cpf.replace(/\D/g, ""),
    proprietario_rg: form.proprietario_rg || null,
    proprietario_rg_orgao: form.proprietario_rg_orgao || null,
    proprietario_telefone: form.proprietario_telefone || null,
    proprietario_email: form.proprietario_email.trim().toLowerCase(),
    endereco: form.endereco,
    numero: form.numero || null,
    complemento: form.complemento || null,
    bairro: form.bairro,
    cidade: form.cidade || "Rio de Janeiro",
    cep: form.cep || null,
    valor_condominio: Number(form.valor_condominio) || null,
    valor_iptu: Number(form.valor_iptu) || null,
    vagas: form.vagas || null,
    quartos: form.quartos || null,
    valor_avaliacao: Number(form.valor_avaliacao),
    valor_venda: Number(form.valor_venda),
    tipo_gestao: form.tipo_gestao,
    prazo_dias: form.prazo_dias,
    percentual_honorarios: form.percentual_honorarios,
    corretor_nome: (user?.user_metadata as any)?.full_name || user?.email || null,
    corretor_creci: organization?.creci || null,
    status: "rascunho" as const,
  });

  const handleSalvarRascunho = async () => {
    if (!organization?.id) {
      toast.error("Organização não identificada");
      return;
    }
    if (Object.keys(errors).length > 0) {
      toast.error("Preencha os campos obrigatórios", { description: Object.values(errors).join(", ") });
      return;
    }
    setSubmitting(true);
    try {
      await createMut.mutateAsync(buildPayload());
      toast.success("Rascunho salvo");
      onOpenChange(false);
      navigate("/autorizacoes-captacao");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnviar = async () => {
    if (!organization?.id) {
      toast.error("Organização não identificada");
      return;
    }
    if (Object.keys(errors).length > 0) {
      toast.error("Preencha os campos obrigatórios", { description: Object.values(errors).join(", ") });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createMut.mutateAsync(buildPayload());
      await enviarMut.mutateAsync(created.id);
      onOpenChange(false);
      navigate("/autorizacoes-captacao");
    } finally {
      setSubmitting(false);
    }
  };

  const previewData: AutorizacaoFormData = form;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[860px] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Gerar Autorização de Captação
          </SheetTitle>
          <SheetDescription>
            Revise os dados, defina os valores contratuais e envie ao proprietário para assinatura digital.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-3">
            <TabsContent value="dados" className="space-y-4 pr-3">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Proprietário</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nome completo *</Label>
                      <Input value={form.proprietario_nome} onChange={(e) => update("proprietario_nome", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">E-mail *</Label>
                      <Input type="email" value={form.proprietario_email} onChange={(e) => update("proprietario_email", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">CPF *</Label>
                      <Input value={form.proprietario_cpf} onChange={(e) => update("proprietario_cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <Label className="text-xs">Telefone (WhatsApp)</Label>
                      <Input value={form.proprietario_telefone} onChange={(e) => update("proprietario_telefone", e.target.value)} placeholder="(21) 99999-9999" />
                    </div>
                    <div>
                      <Label className="text-xs">RG</Label>
                      <Input value={form.proprietario_rg} onChange={(e) => update("proprietario_rg", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Órgão Emissor</Label>
                      <Input value={form.proprietario_rg_orgao} onChange={(e) => update("proprietario_rg_orgao", e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Imóvel</h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Endereço *</Label>
                      <Input value={form.endereco} onChange={(e) => update("endereco", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Número</Label>
                      <Input value={form.numero} onChange={(e) => update("numero", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Complemento</Label>
                      <Input value={form.complemento} onChange={(e) => update("complemento", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">CEP</Label>
                      <Input value={form.cep} onChange={(e) => update("cep", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Bairro *</Label>
                      <Input value={form.bairro} onChange={(e) => update("bairro", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Cidade</Label>
                      <Input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Quartos</Label>
                      <Input type="number" value={form.quartos || ""} onChange={(e) => update("quartos", Number(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Vagas</Label>
                      <Input type="number" value={form.vagas || ""} onChange={(e) => update("vagas", Number(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Condomínio (R$/mês)</Label>
                      <Input inputMode="numeric" value={form.valor_condominio} onChange={(e) => update("valor_condominio", e.target.value.replace(/[^\d]/g, ""))} />
                    </div>
                    <div>
                      <Label className="text-xs">IPTU (R$/ano)</Label>
                      <Input inputMode="numeric" value={form.valor_iptu} onChange={(e) => update("valor_iptu", e.target.value.replace(/[^\d]/g, ""))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/40">
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Valores Contratuais</h4>
                  <p className="text-xs text-muted-foreground">
                    Estes campos são obrigatoriamente preenchidos pelo corretor. O Valor de Avaliação é a referência técnica;
                    o Valor de Venda Autorizado é o que será divulgado ao mercado.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Valor de Avaliação (R$) *</Label>
                      <Input
                        inputMode="numeric"
                        value={form.valor_avaliacao}
                        onChange={(e) => update("valor_avaliacao", e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor de Venda Autorizado (R$) *</Label>
                      <Input
                        inputMode="numeric"
                        value={form.valor_venda}
                        onChange={(e) => update("valor_venda", e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">Termos da Autorização</h4>
                  <div>
                    <Label className="text-xs">Tipo de Gestão</Label>
                    <ToggleGroup type="single" value={form.tipo_gestao} onValueChange={(v) => v && update("tipo_gestao", v as TipoGestao)} className="justify-start mt-1">
                      <ToggleGroupItem value="com_exclusiva">Com Exclusividade</ToggleGroupItem>
                      <ToggleGroupItem value="sem_exclusiva">Sem Exclusividade</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Prazo (dias)</Label>
                      <ToggleGroup type="single" value={String(form.prazo_dias)} onValueChange={(v) => v && update("prazo_dias", Number(v))} className="justify-start mt-1">
                        {[30, 60, 90, 120].map((d) => (
                          <ToggleGroupItem key={d} value={String(d)}>{d}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    <div>
                      <Label className="text-xs">Honorários (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        max="10"
                        value={form.percentual_honorarios}
                        onChange={(e) => update("percentual_honorarios", Number(e.target.value) || 5)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="pr-3">
              <AutorizacaoDocumentoPreview
                data={previewData}
                corretorNome={(user?.user_metadata as any)?.full_name || user?.email || null}
                corretorCreci={organization?.creci || null}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="border-t pt-3 mt-3 flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" onClick={handleSalvarRascunho} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Rascunho
          </Button>
          <Button onClick={handleEnviar} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar para Assinatura
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}