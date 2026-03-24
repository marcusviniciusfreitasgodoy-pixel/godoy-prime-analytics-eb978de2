import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useVisitas } from "@/hooks/useVisitas";
import { useCorretores } from "@/hooks/useCorretores";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useFormConfig } from "@/hooks/useFormConfig";
import { DynamicFieldRenderer } from "@/components/forms/DynamicFieldRenderer";

const acompanhanteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  cpf: z.string().trim().optional(),
});

const formSchema = z.object({
  nome_visitante: z.string().trim().min(1, "Nome do visitante é obrigatório").max(200),
  telefone_visitante: z.string().trim().min(1, "Telefone é obrigatório").max(20),
  email_visitante: z.string().trim().email("Email inválido").max(255).or(z.literal("")),
  cpf_visitante: z.string().trim().max(14).optional().or(z.literal("")),
  rg_visitante: z.string().trim().max(20).optional(),
  endereco_visitante: z.string().trim().max(500).optional(),
  acompanhantes: z.array(acompanhanteSchema).max(2).optional(),
  endereco_imovel: z.string().trim().min(1, "Endereço é obrigatório").max(500),
  condominio_edificio: z.string().trim().max(200).optional(),
  unidade_imovel: z.string().trim().max(100).optional(),
  codigo_imovel: z.string().trim().max(50).optional(),
  nome_proprietario: z.string().trim().min(1, "Nome do proprietário é obrigatório").max(200),
  valor_imovel: z.string().optional(),
  corretor_id: z.string().min(1, "Selecione um corretor"),
  data_visita: z.string().min(1, "Data/hora é obrigatória"),
  notas: z.string().trim().max(2000).optional(),
  aceita_ofertas_similares: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function NovaFichaVisita() {
  const navigate = useNavigate();
  const { createFicha } = useVisitas();
  const { corretores, isLoading: loadingCorretores } = useCorretores();
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const { activeConfig } = useFormConfig("ficha_visita");

  const customFields = activeConfig?.fields?.filter(f => !f.is_locked) || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_visitante: "",
      telefone_visitante: "",
      email_visitante: "",
      cpf_visitante: "",
      rg_visitante: "",
      endereco_visitante: "",
      acompanhantes: [],
      endereco_imovel: "",
      condominio_edificio: "",
      unidade_imovel: "",
      codigo_imovel: "",
      nome_proprietario: "",
      valor_imovel: "",
      corretor_id: "",
      data_visita: "",
      notas: "",
      aceita_ofertas_similares: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "acompanhantes",
  });

  const onSubmit = async (data: FormData) => {
    try {
      const corretor = corretores.find((c) => c.id === data.corretor_id);
      const codigo = `VIS-${Date.now().toString(36).toUpperCase()}`;
      const valorNumerico = data.valor_imovel
        ? parseFloat(data.valor_imovel.replace(/[^\d.,]/g, "").replace(",", "."))
        : null;

      await createFicha.mutateAsync({
        codigo,
        nome_visitante: data.nome_visitante,
        telefone_visitante: data.telefone_visitante,
        email_visitante: data.email_visitante || null,
        cpf_visitante: data.cpf_visitante || "",
        rg_visitante: data.rg_visitante || null,
        endereco_visitante: data.endereco_visitante || null,
        acompanhantes: data.acompanhantes && data.acompanhantes.length > 0
          ? data.acompanhantes.map(a => ({ nome: a.nome, cpf: a.cpf || undefined }))
          : null,
        endereco_imovel: data.endereco_imovel,
        condominio_edificio: data.condominio_edificio || null,
        unidade_imovel: data.unidade_imovel || null,
        codigo_imovel: data.codigo_imovel || null,
        nome_proprietario: data.nome_proprietario,
        valor_imovel: valorNumerico,
        corretor_id: data.corretor_id,
        nome_corretor: corretor?.full_name || "Corretor",
        data_visita: new Date(data.data_visita).toISOString(),
        status: "agendada",
        notas: data.notas || null,
        aceita_ofertas_similares: data.aceita_ofertas_similares,
        ...(Object.keys(customFieldValues).length > 0 ? { campos_customizados: customFieldValues } : {}),
      } as any);

      navigate("/visitas", { state: { tab: "fichas" } });
    } catch (error) {
      console.error("Erro ao criar ficha:", error);
      toast.error("Erro ao criar ficha de visita");
    }
  };

  return (
    <>
      <Helmet>
        <title>Nova Ficha de Visita | Godoy Prime Analytics</title>
      </Helmet>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visitas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Nova Ficha de Visita</h1>
            <p className="text-sm text-muted-foreground">Termo de Apresentação de Imóvel — Alto Padrão</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1) Identificação do Cliente (Visitante)</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Visitante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="nome_visitante" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cpf_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rg_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RG (opcional)</FormLabel>
                      <FormControl><Input placeholder="00.000.000-0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="telefone_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone/WhatsApp *</FormLabel>
                      <FormControl><Input placeholder="(21) 99999-9999" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="endereco_visitante" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço do Visitante (opcional)</FormLabel>
                    <FormControl><Input placeholder="Rua, número, bairro, cidade/UF" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Acompanhantes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Acompanhante(s) (opcional)</span>
                    {fields.length < 2 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ nome: "", cpf: "" })}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                    )}
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <FormField control={form.control} name={`acompanhantes.${index}.nome`} render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl><Input placeholder="Nome do acompanhante" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`acompanhantes.${index}.cpf`} render={({ field }) => (
                        <FormItem className="w-40">
                          <FormControl><Input placeholder="CPF (opcional)" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Imóvel */}
                <h3 className="text-lg font-semibold">2) Identificação do Imóvel Visitado</h3>

                <FormField control={form.control} name="endereco_imovel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço do Imóvel *</FormLabel>
                    <FormControl><Input placeholder="Rua, número, complemento" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="condominio_edificio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condomínio/Edifício</FormLabel>
                      <FormControl><Input placeholder="Nome do condomínio" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="unidade_imovel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade (apto/casa/bloco/andar)</FormLabel>
                      <FormControl><Input placeholder="Ex: Ap 1201, Bloco B" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="codigo_imovel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Interno/Anúncio</FormLabel>
                      <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nome_proprietario" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Proprietário *</FormLabel>
                      <FormControl><Input placeholder="Nome do proprietário" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="valor_imovel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Imóvel (R$)</FormLabel>
                    <FormControl><Input placeholder="Ex: 500000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />

                {/* Corretor e Data */}
                <h3 className="text-lg font-semibold">Intermediação e Agenda</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="corretor_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corretor Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCorretores ? "Carregando..." : "Selecione"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {corretores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="data_visita" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Hora da Visita *</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="notas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionais</FormLabel>
                    <FormControl><Textarea placeholder="Observações sobre a visita..." rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator />

                {/* LGPD */}
                <h3 className="text-lg font-semibold">LGPD — Autorização</h3>
                <FormField control={form.control} name="aceita_ofertas_similares" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Autorizo receber ofertas de imóveis similares</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        O(a) Cliente autoriza o envio de informações sobre imóveis similares ao visitado.
                      </p>
                    </div>
                  </FormItem>
                )} />

                {/* Campos Customizados */}
                {customFields.length > 0 && (
                  <>
                    <Separator />
                    <h3 className="text-lg font-semibold">Campos Adicionais</h3>
                    <div className="space-y-4">
                      {customFields.map((field) => (
                        <DynamicFieldRenderer
                          key={field.id}
                          field={field}
                          value={customFieldValues[field.field_id]}
                          onChange={(v) => setCustomFieldValues(prev => ({ ...prev, [field.field_id]: v }))}
                        />
                      ))}
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/visitas")}>Cancelar</Button>
                  <Button type="submit" disabled={createFicha.isPending}>
                    {createFicha.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Criar Ficha
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
