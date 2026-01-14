import { useState } from "react";
import { useAllBairros } from "@/hooks/useBairroSuggestions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface BairroSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function BairroSelector({ value, onChange, className }: BairroSelectorProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const { data: bairros, isLoading } = useAllBairros();

  // Filtrar bairros baseado na busca
  const filteredBairros = bairros?.filter((b) =>
    b.bairro.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-accent shrink-0" />
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className={cn("w-full sm:w-[180px] md:w-[220px] bg-background/50 border-border text-sm", className)}>
          <SelectValue placeholder="Selecione o bairro" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] max-w-[90vw] sm:max-w-none">
          <div className="flex items-center px-2 pb-2 sticky top-0 bg-popover">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              placeholder="Buscar bairro..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredBairros.length === 0 && (
            <div className="py-2 px-2 text-sm text-muted-foreground text-center">
              Nenhum bairro encontrado
            </div>
          )}
          {filteredBairros.map(({ bairro, total_transacoes }) => (
            <SelectItem key={bairro} value={bairro}>
              <span className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{bairro}</span>
                <span className="text-xs text-muted-foreground">
                  ({total_transacoes.toLocaleString("pt-BR")})
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
