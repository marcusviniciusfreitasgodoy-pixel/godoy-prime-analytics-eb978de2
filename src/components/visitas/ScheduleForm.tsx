import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useDisponibilidade } from "@/hooks/useDisponibilidade";
import { useCorretores } from "@/hooks/useCorretores";
import { TipoServicoVisita, OrigemAgendamento, AgendamentoVisita } from "@/types/visitas";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const generateDefaultHorarios = () =>
  Array.from({ length: 44 }, (_, i) => {
    const h = Math.floor(i / 4) + 8;
    const m = (i % 4) * 15;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

const scheduleSchema = z.object({
  nome_visitante: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefone_visitante: z.string().min(10, "Telefone inválido"),
  email_visitante: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco_imovel: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  codigo_imovel: z.string().optional(),
  corretor_id: z.string().optional(),
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
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  
  const [selectedDate2, setSelectedDate2] = useState<Date>();
  const [horariosDisponiveis2, setHorariosDisponiveis2] = useState<string[]>([]);
  const [loadingHorarios2, setLoadingHorarios2] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const { createAgendamento, updateAgendamento, agendamentos } = useAgendamentos();
  const { getHorariosDisponiveis } = useDisponibilidade();
  const { corretores, isLoading: loadingCorretores } = useCorretores();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      nome_visitante: "",
      telefone_visitante: "",
      email_visitante: "",
      endereco_imovel: "",
      codigo_imovel: "",
      corretor_id: "",
      tipo_servico: "visita",
      origem: "site",
      notas: "",
    },
  });

  // Carregar dados do agendamento para edição
  useEffect(() => {
    const loadAgendamento = async () => {
      if (!editId) {
        setIsEditing(false);
        return;
      }
      
      setLoadingEdit(true);
      setIsEditing(true);
      
      try {
        // Buscar agendamento pelo ID
        const { data, error } = await supabase
          .from('agendamentos_visita')
          .select('*')
          .eq('id', editId)
          .maybeSingle();
        
        if (error || !data) {
          toast.error('Agendamento não encontrado');
          setIsEditing(false);
          setLoadingEdit(false);
          return;
        }
        
        const agendamento = data as AgendamentoVisita;
        const dataHora = parseISO(agendamento.data_hora);
        
        // Carregar horários primeiro para a data selecionada
        const dateStr = format(dataHora, "yyyy-MM-dd");
        const horarios = await getHorariosDisponiveis(dateStr);
        if (horarios.length === 0) {
          setHorariosDisponiveis(generateDefaultHorarios());
        } else {
          setHorariosDisponiveis(horarios);
        }
        
        setSelectedDate(dataHora);
        
        // Carregar segunda opção se existir
        if (agendamento.data_hora_opcao2) {
          const dataHora2 = parseISO(agendamento.data_hora_opcao2);
          setSelectedDate2(dataHora2);
          
          const dateStr2 = format(dataHora2, "yyyy-MM-dd");
          const horarios2 = await getHorariosDisponiveis(dateStr2);
          if (horarios2.length === 0) {
            setHorariosDisponiveis2(generateDefaultHorarios());
          } else {
            setHorariosDisponiveis2(horarios2);
          }
        }
        
        // Preencher formulário DEPOIS de carregar os horários
        // Usar setTimeout para garantir que o reset aconteça após o render
        setTimeout(() => {
          form.reset({
            nome_visitante: agendamento.nome_visitante,
            telefone_visitante: agendamento.telefone_visitante,
            email_visitante: agendamento.email_visitante || "",
            endereco_imovel: agendamento.endereco_imovel,
            codigo_imovel: agendamento.codigo_imovel || "",
            tipo_servico: agendamento.tipo_servico as TipoServicoVisita,
            data: dataHora,
            horario: format(dataHora, "HH:mm"),
            origem: (agendamento.origem as OrigemAgendamento) || "site",
            notas: agendamento.notas || "",
            data2: agendamento.data_hora_opcao2 ? parseISO(agendamento.data_hora_opcao2) : undefined,
            horario2: agendamento.data_hora_opcao2 ? format(parseISO(agendamento.data_hora_opcao2), "HH:mm") : "",
          });
        }, 100);
      } catch (err) {
        console.error('Erro ao carregar agendamento:', err);
        toast.error('Erro ao carregar agendamento');
      } finally {
        setLoadingEdit(false);
      }
    };
    
    loadAgendamento();
  }, [editId]);

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
        setHorariosDisponiveis(generateDefaultHorarios());
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
        setHorariosDisponiveis2(generateDefaultHorarios());
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

    const corretorSelecionado = data.corretor_id
      ? corretores.find((c) => c.id === data.corretor_id)
      : null;

    if (isEditing && editId) {
      await updateAgendamento.mutateAsync({
        id: editId,
        nome_visitante: data.nome_visitante,
        telefone_visitante: data.telefone_visitante,
        email_visitante: data.email_visitante || null,
        endereco_imovel: data.endereco_imovel,
        codigo_imovel: data.codigo_imovel || null,
        corretor_id: data.corretor_id || null,
        tipo_servico: data.tipo_servico as TipoServicoVisita,
        data_hora: dataHora.toISOString(),
        data_hora_opcao2: dataHoraOpcao2,
        origem: (data.origem as OrigemAgendamento) || "site",
        notas: data.notas || null,
      });
    } else {
      await createAgendamento.mutateAsync({
        nome_visitante: data.nome_visitante,
        telefone_visitante: data.telefone_visitante,
        email_visitante: data.email_visitante || null,
        endereco_imovel: data.endereco_imovel,
        codigo_imovel: data.codigo_imovel || null,
        corretor_id: data.corretor_id || null,
        tipo_servico: data.tipo_servico as TipoServicoVisita,
        data_hora: dataHora.toISOString(),
        data_hora_opcao2: dataHoraOpcao2,
        origem: (data.origem as OrigemAgendamento) || "site",
        notas: data.notas || null,
      });
    }

    form.reset();
    setSelectedDate(undefined);
    setSelectedDate2(undefined);
    setHorariosDisponiveis([]);
    setHorariosDisponiveis2([]);
    onSuccess?.();
  };

  const handleCancelAgendamento = async () => {
    if (!editId) return;
    
    try {
      const { error } = await supabase
        .from('agendamentos_visita')
        .update({ status: 'cancelada' as const })
        .eq('id', editId);
      
      if (error) throw error;
      
      toast.success('Agendamento cancelado com sucesso');
      onSuccess?.();
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error('Erro ao cancelar agendamento');
    }
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

  if (loadingEdit) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Carregando agendamento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Agendamento' : 'Agendar Visita'}</CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Atualize os dados do agendamento ou cancele a visita' 
            : 'Preencha os dados para agendar uma visita ao imóvel'}
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
                  name="corretor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corretor Responsável</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCorretores ? "Carregando..." : "Selecione o corretor"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {corretores.map((corretor) => (
                            <SelectItem key={corretor.id} value={corretor.id}>
                              {corretor.full_name}{corretor.creci ? ` (${corretor.creci})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                           disabled={(date) => {
                             const today = new Date();
                             today.setHours(0, 0, 0, 0);
                             return date < today;
                           }}
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
                             disabled={(date) => {
                               const today = new Date();
                               today.setHours(0, 0, 0, 0);
                               return date < today;
                             }}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createAgendamento.isPending || updateAgendamento.isPending}
              >
                {(createAgendamento.isPending || updateAgendamento.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Salvar Alterações' : 'Agendar Visita'}
              </Button>
              
              {isEditing && (
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleCancelAgendamento}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Agendamento
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
