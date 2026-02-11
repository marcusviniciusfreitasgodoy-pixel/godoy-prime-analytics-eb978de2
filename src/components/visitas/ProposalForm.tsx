import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { CNHUpload } from "./CNHUpload";
import { PublicSignatureCanvas } from "./PublicSignatureCanvas";
import { usePropostas } from "@/hooks/usePropostas";
import { PropostaPreFill } from "@/types/proposta";
import { Loader2, Send, AlertTriangle } from "lucide-react";

const proposalSchema = z.object({
  nome_completo: z.string().min(3, "Nome obrigatório"),
  cpf_cnpj: z.string().min(11, "CPF/CNPJ obrigatório"),
  telefone: z.string().min(10, "Telefone obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco_resumido: z.string().min(5, "Endereço obrigatório"),
  unidade: z.string().optional(),
  matricula: z.string().optional(),
  valor_ofertado: z.string().min(1, "Valor obrigatório"),
  sinal_entrada: z.string().optional(),
  parcelas: z.string().optional(),
  financiamento: z.string().optional(),
  outras_condicoes: z.string().optional(),
  cidade_uf: z.string().optional(),
  numero_proposta: z.string().optional(),
  validade_proposta: z.string().optional(),
  forma_aceite: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface ProposalFormProps {
  preFill?: PropostaPreFill;
  onSuccess?: () => void;
  standalone?: boolean;
}

export function ProposalForm({ preFill, onSuccess, standalone = false }: ProposalFormProps) {
  const { createProposta, uploadCNH } = usePropostas();
  const modelo = 'completo';
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [cnhUrl, setCnhUrl] = useState<string | null>(null);
  const [isUploadingCNH, setIsUploadingCNH] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const codigo = `PROP-${Date.now().toString(36).toUpperCase()}`;

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      nome_completo: preFill?.nome_completo || "",
      cpf_cnpj: preFill?.cpf_cnpj || "",
      telefone: preFill?.telefone || "",
      email: preFill?.email || "",
      endereco_resumido: preFill?.endereco_resumido || "",
      valor_ofertado: preFill?.valor_ofertado ? `R$ ${preFill.valor_ofertado.toLocaleString("pt-BR")}` : "",
      forma_aceite: "assinatura",
    },
  });

  const handleCNHUpload = async (file: File) => {
    setIsUploadingCNH(true);
    try {
      const url = await uploadCNH(file, codigo);
      setCnhUrl(url);
    } catch {
      // toast handled in hook
    } finally {
      setIsUploadingCNH(false);
    }
  };

  const onSubmit = async (data: ProposalFormData) => {
    if (!modelo) return;
    if (!assinatura) return;

    const valorNum = data.valor_ofertado
      ? parseFloat(data.valor_ofertado.replace(/\D/g, ""))
      : null;

    await createProposta.mutateAsync({
      codigo,
      modelo,
      ficha_visita_id: preFill?.ficha_visita_id || null,
      organization_id: preFill?.organization_id || null,
      nome_completo: data.nome_completo,
      cpf_cnpj: data.cpf_cnpj,
      telefone: data.telefone,
      email: data.email || null,
      endereco_resumido: data.endereco_resumido,
      unidade: data.unidade || null,
      matricula: data.matricula || null,
      valor_ofertado: valorNum,
      sinal_entrada: data.sinal_entrada || null,
      parcelas: data.parcelas || null,
      financiamento: data.financiamento || null,
      outras_condicoes: data.outras_condicoes || null,
      cidade_uf: data.cidade_uf || null,
      numero_proposta: data.numero_proposta || null,
      validade_proposta: data.validade_proposta || null,
      forma_aceite: data.forma_aceite || "assinatura",
      assinatura_proponente: assinatura,
      cnh_url: cnhUrl,
    });

    setSubmitted(true);
    onSuccess?.();
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Send className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-xl font-bold">Proposta Enviada!</h3>
          <p className="text-muted-foreground">
            Sua proposta foi registrada com sucesso. O corretor entrará em contato em breve.
          </p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 overflow-hidden">
        {/* Identificação do Proponente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação do Proponente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="nome_completo" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo / Razão social *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="cpf_cnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF / CNPJ *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone / WhatsApp *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Identificação do Imóvel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação do Imóvel</CardTitle>
            <CardDescription>Apenas referência — sem detalhes de área, quartos ou vagas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="endereco_resumido" render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço (logradouro + nº + bairro) *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="unidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade (apto/casa/lote)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="matricula" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula (se disponível)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
            </div>
          </CardContent>
        </Card>

        {/* Valor e Condições */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valor Ofertado e Condições de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="valor_ofertado" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor total ofertado *</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onChange={field.onChange} placeholder="R$ 0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sinal_entrada" render={({ field }) => (
              <FormItem>
                <FormLabel>Sinal / Entrada (valor e data/prazo)</FormLabel>
                <FormControl><Input placeholder="Ex: R$ 50.000 na assinatura do compromisso" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="parcelas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas (quantidade, valores e vencimentos)</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Ex: 12x de R$ 10.000, vencimento dia 15" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="financiamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financiamento bancário</FormLabel>
                    <FormControl><Input placeholder="Ex: Financiamento CEF sujeito a aprovação" {...field} /></FormControl>
                  </FormItem>
                )} />
            <FormField control={form.control} name="outras_condicoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Outras condições (permuta, etc.)</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle className="text-lg">Validade e Aceite</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="cidade_uf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade/UF</FormLabel>
                    <FormControl><Input placeholder="Rio de Janeiro/RJ" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="validade_proposta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade da proposta</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="forma_aceite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de aceite do vendedor</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="assinatura" id="aceite-assinatura" />
                        <label htmlFor="aceite-assinatura" className="text-sm cursor-pointer">
                          Assinatura neste documento
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="escrito" id="aceite-escrito" />
                        <label htmlFor="aceite-escrito" className="text-sm cursor-pointer">
                          Aceite por escrito (e-mail/WhatsApp) com "ACEITO" + Nº da proposta + data
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
        </Card>

        <Card className="border-border bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-foreground space-y-2">
                  <p className="font-semibold">Cláusula de Documento Posterior</p>
                  <p>
                    Este documento serve exclusivamente para validação de valor e condições de pagamento.
                    Os demais termos, informações e condições completas — incluindo, sem limitar, obrigações das partes,
                    documentação, prazos, posse, responsabilidades, garantias, penalidades e formalização —
                    constarão do Instrumento de Promessa/Compromisso de Compra e Venda (ou Compra e Venda) a ser
                    apresentado após o aceite.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* CNH e Assinatura lado a lado em desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CNHUpload onUpload={handleCNHUpload} isUploading={isUploadingCNH} uploadedUrl={cnhUrl} />
          <PublicSignatureCanvas
            title="Assinatura do Proponente"
            description="Desenhe sua assinatura para confirmar a proposta"
            onSave={(sig) => setAssinatura(sig)}
          />
        </div>

        {!assinatura && (
          <p className="text-sm text-muted-foreground text-center">
            ⚠️ Confirme sua assinatura acima antes de enviar.
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={createProposta.isPending || !assinatura || !modelo}
        >
          {createProposta.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Proposta
        </Button>
      </form>
    </Form>
  );
}
