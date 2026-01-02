import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useDisponibilidade } from "@/hooks/useDisponibilidade";
import { TipoServicoVisita, OrigemAgendamento } from "@/types/visitas";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const scheduleSchema = z.object({
  nome_visitante: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone_visitante: z.string().min(10, "Telefone inválido"),
  email_visitante: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco_imovel: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  codigo_imovel: z.string().optional(),
  tipo_servico: z.enum(["visita", "avaliacao", "consultoria", "fotografia"]),
  data: z.date({ required_error: "Selecione uma data" }),
  horario: z.string().min(1, "Selecione um horário"),
  data2: z.date().optional(),
  horario2: z.string().optional(),
  origem: z.enum(["site", "indicacao", "whatsapp", "instagram", "facebook", "google", "outro"]).optional(),
  notas: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  onSuccess?: () => void;
  isPublic?: boolean;
}

export function ScheduleForm({ onSuccess, isPublic = false }: ScheduleFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  
  const [selectedDate2, setSelectedDate2] = useState<Date>();
  const [horariosDisponiveis2, setHorariosDisponiveis2] = useState<string[]>([]);
  const [loadingHorarios2, setLoadingHorarios2] = useState(false);

  const { createAgendamento } = useAgendamentos();
  const { getHorariosDisponiveis } = useDisponibilidade();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      nome_visitante: "",
      telefone_visitante: "",
      email_visitante: "",
      endereco_imovel: "",
      codigo_imovel: "",
      tipo_servico: "visita",
      origem: "site",
      notas: "",
    },
  });

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    form.setValue("data", date as Date);
    form.setValue("horario", "");

    if (date) {
      setLoadingHorarios(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const horarios = await getHorariosDisponiveis(dateStr);
      
      // Se não houver horários cadastrados, mostra horários padrão
      if (horarios.length === 0) {
        setHorariosDisponiveis([
          "08:00", "09:00", "10:00", "11:00",
          "14:00", "15:00", "16:00", "17:00", "18:00"
        ]);
      } else {
        setHorariosDisponiveis(horarios);
      }
      setLoadingHorarios(false);
    }
  };

  const handleDateSelect2 = async (date: Date | undefined) => {
    setSelectedDate2(date);
    form.setValue("data2", date);
    form.setValue("horario2", "");

    if (date) {
      setLoadingHorarios2(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const horarios = await getHorariosDisponiveis(dateStr);
      
      if (horarios.length === 0) {
        setHorariosDisponiveis2([
          "08:00", "09:00", "10:00", "11:00",
          "14:00", "15:00", "16:00", "17:00", "18:00"
        ]);
      } else {
        setHorariosDisponiveis2(horarios);
      }
      setLoadingHorarios2(false);
    }
  };

  const onSubmit = async (data: ScheduleFormData) => {
    const dataHora = new Date(data.data);
    const [hours, minutes] = data.horario.split(":");
    dataHora.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    let dataHoraOpcao2: string | null = null;
    if (data.data2 && data.horario2) {
      const dataHora2 = new Date(data.data2);
      const [hours2, minutes2] = data.horario2.split(":");
      dataHora2.setHours(parseInt(hours2), parseInt(minutes2), 0, 0);
      dataHoraOpcao2 = dataHora2.toISOString();
    }

    await createAgendamento.mutateAsync({
      nome_visitante: data.nome_visitante,
      telefone_visitante: data.telefone_visitante,
      email_visitante: data.email_visitante || null,
      endereco_imovel: data.endereco_imovel,
      codigo_imovel: data.codigo_imovel || null,
      tipo_servico: data.tipo_servico as TipoServicoVisita,
      data_hora: dataHora.toISOString(),
      data_hora_opcao2: dataHoraOpcao2,
      origem: (data.origem as OrigemAgendamento) || "site",
      notas: data.notas || null,
    });

    form.reset();
    setSelectedDate(undefined);
    setSelectedDate2(undefined);
    setHorariosDisponiveis([]);
    setHorariosDisponiveis2([]);
    onSuccess?.();
  };

  const tipoServicoOptions = [
    { value: "visita", label: "Visita ao Imóvel" },
    { value: "avaliacao", label: "Avaliação" },
    { value: "consultoria", label: "Consultoria" },
    { value: "fotografia", label: "Fotografia" },
  ];

  const origemOptions = [
    { value: "site", label: "Site" },
    { value: "indicacao", label: "Indicação" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "google", label: "Google" },
    { value: "outro", label: "Outro" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendar Visita</CardTitle>
        <CardDescription>
          Preencha os dados para agendar uma visita ao imóvel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_visitante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone_visitante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(21) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_visitante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endereco_imovel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço do Imóvel *</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isPublic && (
                <FormField
                  control={form.control}
                  name="codigo_imovel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Imóvel</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: IMV-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="tipo_servico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipoServicoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date()}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedDate || loadingHorarios}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            loadingHorarios 
                              ? "Carregando..." 
                              : selectedDate 
                                ? "Selecione um horário" 
                                : "Selecione a data primeiro"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {horariosDisponiveis.map((horario) => (
                          <SelectItem key={horario} value={horario}>
                            {horario}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Segunda opção de data/horário */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Opção 2 de Data/Horário (opcional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data2"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Alternativa</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate2}
                            onSelect={handleDateSelect2}
                            disabled={(date) => date < new Date()}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horario2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário Alternativo</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedDate2 || loadingHorarios2}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              loadingHorarios2 
                                ? "Carregando..." 
                                : selectedDate2 
                                  ? "Selecione um horário" 
                                  : "Selecione a data primeiro"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {horariosDisponiveis2.map((horario) => (
                            <SelectItem key={horario} value={horario}>
                              {horario}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isPublic && (
                <FormField
                  control={form.control}
                  name="origem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem do Contato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {origemOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre a visita..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={createAgendamento.isPending}
            >
              {createAgendamento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agendar Visita
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
