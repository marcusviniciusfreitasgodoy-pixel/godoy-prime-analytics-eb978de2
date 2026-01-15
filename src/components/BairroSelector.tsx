import { useState, useEffect } from "react";
import { useBairroSuggestions } from "@/hooks/useBairroSuggestions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BairroSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function BairroSelector({ value, onChange, className }: BairroSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useBairroSuggestions(searchQuery);

  const bairros = data ?? [];

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const handleSelect = (selectedBairro: string) => {
    onChange(selectedBairro);
    setOpen(false);
  };

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
              className
            )}
          >
            <span className="truncate">
              {value || "Selecione o bairro"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 z-50" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar bairro..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {searchQuery.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 letras para buscar
                </div>
              ) : isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : bairros.length === 0 ? (
                <CommandEmpty>Nenhum bairro encontrado</CommandEmpty>
              ) : (
                <CommandGroup>
                  {bairros.map(({ bairro, total_transacoes }) => (
                    <CommandItem
                      key={bairro}
                      value={bairro}
                      onSelect={() => handleSelect(bairro)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === bairro ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1 truncate">{bairro}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({total_transacoes.toLocaleString("pt-BR")})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
