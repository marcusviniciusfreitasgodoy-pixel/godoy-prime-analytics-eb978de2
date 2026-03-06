import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Building2, MapPin, SearchX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { CondominioSelecionado } from "@/types/valuation";

interface Props {
  value: string;
  condominioSelecionado: CondominioSelecionado | null;
  bairro: string;
  onChange: (nome: string, condominio: CondominioSelecionado | null) => void;
}

interface CondominioResult {
  id: string;
  nome_condominio: string;
  logradouro_padrao: string;
  ruas_internas: string[] | null;
  total_transacoes_itbi: number | null;
}

/** Remove acentos para comparação accent-insensitive */
function removeAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Substitui vogais por _ (wildcard ILIKE) para busca accent-agnostic no PostgreSQL */
function toAccentWildcard(s: string): string {
  return s.replace(/[aeiouáàâãéèêíìóòôõúùü]/gi, '_');
}

export function CondominioSelector({ value, condominioSelecionado, bairro, onChange }: Props) {
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sync searchTerm when value changes externally
  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  // Query: busca ampla no backend (sem acento), filtra no cliente
  const { data: rawCondominios, isLoading } = useQuery({
    queryKey: ['condominios-search', searchTerm, bairro],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      // Normaliza termo removendo acentos para busca no backend
      const normalizedTerm = removeAccents(searchTerm);
      const { data, error } = await supabase
        .from('condominios_mapeamento')
        .select('id, nome_condominio, logradouro_padrao, ruas_internas, total_transacoes_itbi')
        .or(`nome_condominio.ilike.%${normalizedTerm}%,logradouro_padrao.ilike.%${normalizedTerm}%`)
        .limit(20);
      if (error) throw error;
      return (data || []) as CondominioResult[];
    },
    enabled: searchTerm.length >= 2 && showSuggestions,
    staleTime: 60_000,
  });

  // Filtragem e ordenação client-side com accent-insensitive
  const condominios = useMemo(() => {
    if (!rawCondominios || rawCondominios.length === 0) return [];
    const normalizedSearch = removeAccents(searchTerm).toUpperCase();

    // Filtrar: match em nome, logradouro ou ruas internas (sem acento)
    const filtered = rawCondominios.filter(c => {
      const nome = removeAccents(c.nome_condominio).toUpperCase();
      const logr = removeAccents(c.logradouro_padrao).toUpperCase();
      if (nome.includes(normalizedSearch) || logr.includes(normalizedSearch)) return true;
      // Verificar ruas internas
      if (c.ruas_internas) {
        return c.ruas_internas.some(rua => removeAccents(rua).toUpperCase().includes(normalizedSearch));
      }
      return false;
    });

    // Ordenar: match no início do nome > contém > mais transações
    return filtered.sort((a, b) => {
      const nameA = removeAccents(a.nome_condominio).toUpperCase();
      const nameB = removeAccents(b.nome_condominio).toUpperCase();
      const startsA = nameA.startsWith(normalizedSearch) ? 1 : 0;
      const startsB = nameB.startsWith(normalizedSearch) ? 1 : 0;
      if (startsA !== startsB) return startsB - startsA;
      return (b.total_transacoes_itbi || 0) - (a.total_transacoes_itbi || 0);
    }).slice(0, 10);
  }, [rawCondominios, searchTerm]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cond: CondominioResult) => {
    setSearchTerm(cond.nome_condominio);
    setShowSuggestions(false);
    onChange(cond.nome_condominio, {
      nome: cond.nome_condominio,
      ruas_internas: cond.ruas_internas || [cond.logradouro_padrao],
      logradouro_padrao: cond.logradouro_padrao,
    });
  };

  const showEmptyState = showSuggestions && searchTerm.length >= 2 && !isLoading && condominios.length === 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value, null); // Clear selection on manual edit
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Buscar condomínio na base..."
          className="h-10 sm:h-9 pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Selected condominium info */}
      {condominioSelecionado && (
        <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium text-primary">{condominioSelecionado.nome}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {condominioSelecionado.ruas_internas.length} rua(s) interna(s): {condominioSelecionado.ruas_internas.slice(0, 3).join(", ")}
            {condominioSelecionado.ruas_internas.length > 3 && ` +${condominioSelecionado.ruas_internas.length - 3}`}
          </div>
        </div>
      )}

      {/* Empty state */}
      {showEmptyState && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-4 text-center"
        >
          <SearchX className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            Nenhum condomínio encontrado para "<strong>{searchTerm}</strong>"
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Tente outro nome ou deixe em branco
          </p>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && condominios && condominios.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {condominios.map((cond) => (
            <button
              key={cond.id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-start justify-between gap-2 border-b last:border-b-0"
              onClick={() => handleSelect(cond)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{cond.nome_condominio}</div>
                <div className="text-xs text-muted-foreground truncate">{cond.logradouro_padrao}</div>
                {cond.ruas_internas && cond.ruas_internas.length > 1 && (
                  <div className="text-[10px] text-muted-foreground">
                    {cond.ruas_internas.length} ruas internas
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {cond.total_transacoes_itbi && cond.total_transacoes_itbi > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {cond.total_transacoes_itbi} transações
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
