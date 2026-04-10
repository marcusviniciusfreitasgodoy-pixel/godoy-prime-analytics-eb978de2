import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useDisponibilidade } from "@/hooks/useDisponibilidade";
import { useAuthContext } from "@/contexts/AuthContext";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_HORARIOS = Array.from({ length: 44 }, (_, i) => {
  const h = Math.floor(i / 4) + 8;
  const m = (i % 4) * 15;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

export function AvailabilityManager() {
  const { user } = useAuthContext();
  const { disponibilidades, createDisponibilidade, updateDisponibilidade, deleteDisponibilidade, isLoading } = useDisponibilidade(user?.id);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHorarios, setSelectedHorarios] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      const existingDisponibilidade = disponibilidades?.find(d => d.data === dateStr);
      
      if (existingDisponibilidade) {
        setSelectedHorarios(existingDisponibilidade.horarios_disponiveis || []);
      } else {
        setSelectedHorarios([]);
      }
    }
  };

  const toggleHorario = (horario: string) => {
    setSelectedHorarios(prev =>
      prev.includes(horario)
        ? prev.filter(h => h !== horario)
        : [...prev, horario].sort()
    );
  };

  const selectAll = () => {
    setSelectedHorarios([...DEFAULT_HORARIOS]);
  };

  const clearAll = () => {
    setSelectedHorarios([]);
  };

  const saveDisponibilidade = async () => {
    if (!selectedDate || !user?.id) {
      toast.error("Selecione uma data");
      return;
    }

    setIsSaving(true);

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const existingDisponibilidade = disponibilidades?.find(d => d.data === dateStr);

      if (existingDisponibilidade) {
        if (selectedHorarios.length === 0) {
          // Se não há horários, remove a disponibilidade
          await deleteDisponibilidade.mutateAsync(existingDisponibilidade.id);
        } else {
          // Atualiza disponibilidade existente
          await updateDisponibilidade.mutateAsync({
            id: existingDisponibilidade.id,
            horarios_disponiveis: selectedHorarios,
          });
        }
      } else if (selectedHorarios.length > 0) {
        // Cria nova disponibilidade
        await createDisponibilidade.mutateAsync({
          corretor_id: user.id,
          data: dateStr,
          horarios_disponiveis: selectedHorarios,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar disponibilidade:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Determina se uma data tem disponibilidade
  const dateHasAvailability = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return disponibilidades?.some(d => d.data === dateStr && (d.horarios_disponiveis?.length || 0) > 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione a Data</CardTitle>
          <CardDescription>
            Clique em uma data para definir os horários disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            modifiers={{
              available: (date) => dateHasAvailability(date),
            }}
            modifiersClassNames={{
              available: "bg-green-100 text-green-800 hover:bg-green-200",
            }}
            className="rounded-md border"
          />

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
            <span>Dias com horários disponíveis</span>
          </div>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {selectedDate 
              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
              : "Horários Disponíveis"
            }
          </CardTitle>
          {selectedDate && (
            <CardDescription>
              Selecione os horários que você está disponível
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <Plus className="h-4 w-4 mr-1" />
                  Todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>

              <div className="space-y-3">
                {Array.from({ length: 11 }, (_, hourIdx) => {
                  const hour = hourIdx + 8;
                  const hourStr = hour.toString().padStart(2, '0');
                  const slots = DEFAULT_HORARIOS.filter(h => h.startsWith(`${hourStr}:`));
                  return (
                    <div key={hour}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{hourStr}h</p>
                      <div className="grid grid-cols-4 gap-1">
                        {slots.map((horario) => (
                          <Button
                            key={horario}
                            type="button"
                            variant={selectedHorarios.includes(horario) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleHorario(horario)}
                            className="w-full text-xs"
                          >
                            {horario}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <Button 
                  onClick={saveDisponibilidade}
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Disponibilidade
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma data no calendário</p>
              <p className="text-sm">para definir seus horários disponíveis</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
