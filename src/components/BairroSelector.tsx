import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface BairroSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function BairroSelector({ value, onChange }: BairroSelectorProps) {
  const { data: bairros, isLoading } = useQuery({
    queryKey: ["bairros-disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itbi_transactions")
        .select("bairro")
        .not("bairro", "is", null);

      if (error) throw error;

      // Extrair bairros únicos e contar transações
      const bairroCount: Record<string, number> = {};
      for (const row of data || []) {
        if (row.bairro) {
          bairroCount[row.bairro] = (bairroCount[row.bairro] || 0) + 1;
        }
      }

      // Ordenar por quantidade de transações (mais relevantes primeiro)
      return Object.entries(bairroCount)
        .sort((a, b) => b[1] - a[1])
        .map(([bairro, count]) => ({ bairro, count }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-accent" />
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="w-[220px] bg-background/50 border-border">
          <SelectValue placeholder="Selecione o bairro" />
        </SelectTrigger>
        <SelectContent>
          {bairros?.map(({ bairro, count }) => (
            <SelectItem key={bairro} value={bairro}>
              <span className="flex items-center justify-between w-full gap-2">
                <span>{bairro}</span>
                <span className="text-xs text-muted-foreground">
                  ({count.toLocaleString("pt-BR")})
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
