import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVisitas } from "@/hooks/useVisitas";
import { useCorretores } from "@/hooks/useCorretores";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  nome_visitante: z.string().trim().min(1, "Nome do visitante é obrigatório").max(200),
  telefone_visitante: z.string().trim().min(1, "Telefone é obrigatório").max(20),
  email_visitante: z.string().trim().email("Email inválido").max(255).or(z.literal("")),
  cpf_visitante: z.string().trim().min(1, "CPF é obrigatório").max(14),
  endereco_imovel: z.string().trim().min(1, "Endereço é obrigatório").max(500),
  codigo_imovel: z.string().trim().max(50).optional(),
  nome_proprietario: z.string().trim().min(1, "Nome do proprietário é obrigatório").max(200),
  valor_imovel: z.string().optional(),
  corretor_id: z.string().min(1, "Selecione um corretor"),
  data_visita: z.string().min(1, "Data/hora é obrigatória"),
  notas: z.string().trim().max(2000).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NovaFichaVisita() {
  const navigate = useNavigate();
  const { createFicha } = useVisitas();
  const { corretores, isLoading: loadingCorretores } = useCorretores();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_visitante: "",
      telefone_visitante: "",
      email_visitante: "",
      cpf_visitante: "",
      endereco_imovel: "",
      codigo_imovel: "",
      nome_proprietario: "",
      valor_imovel: "",
      corretor_id: "",
      data_visita: "",
      notas: "",
    },
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
        cpf_visitante: data.cpf_visitante,
        endereco_imovel: data.endereco_imovel,
        codigo_imovel: data.codigo_imovel || null,
        nome_proprietario: data.nome_proprietario,
        valor_imovel: valorNumerico,
        corretor_id: data.corretor_id,
        nome_corretor: corretor?.full_name || "Corretor",
        data_visita: new Date(data.data_visita).toISOString(),
        status: "agendada",
        notas: data.notas || null,
      });

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
            <p className="text-sm text-muted-foreground">Crie uma ficha diretamente sem agendamento prévio</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da Visita</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Visitante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="nome_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Visitante *</FormLabel>
                      <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cpf_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="telefone_visitante" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
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

                {/* Imóvel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="endereco_imovel" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Endereço do Imóvel *</FormLabel>
                      <FormControl><Input placeholder="Rua, número, complemento" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="codigo_imovel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Imóvel</FormLabel>
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

                {/* Corretor e Data */}
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
