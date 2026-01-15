import { useState, useEffect } from "react";
import { useBairroSuggestions } from "@/hooks/useBairroSuggestions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, ChevronsUpDown, Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface BairroSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function BairroSelector({ value, onChange, className }: BairroSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError } = useBairroSuggestions(searchQuery);

  const bairros = data ?? [];

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  const handleSelect = (selectedBairro: string) => {
    onChange(selectedBairro);
    setOpen(false);
  };

  const showHelper = searchQuery.trim().length < 2;

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-accent shrink-0" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full sm:w-[180px] md:w-[220px] justify-between bg-background/50 border-border text-sm font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{value || "Selecione o bairro"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[320px] p-0 z-50" align="start">
          <div className="p-2 border-b bg-popover">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar bairro..."
                className="pl-8"
                autoComplete="off"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {showHelper ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 letras para buscar
                </div>
              ) : isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : isError ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Erro ao buscar bairros
                </div>
              ) : bairros.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum bairro encontrado
                </div>
              ) : (
                bairros.map(({ bairro, total_transacoes }) => (
                  <button
                    key={bairro}
                    type="button"
                    onClick={() => handleSelect(bairro)}
                    className={cn(
                      "w-full text-left flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === bairro ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate">{bairro}</span>
                    <span className="text-xs text-muted-foreground">
                      ({total_transacoes.toLocaleString("pt-BR")})
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
