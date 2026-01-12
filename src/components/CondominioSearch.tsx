import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Loader2, MapPin, Home, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CondominioResult {
  nome_condominio: string;
  logradouro_padrao: string;
  microbairro: string | null;
  padrao_construtivo: string | null;
  avgM2: number | null;
  totalTransacoes: number;
  valorMedio: number | null;
  ruas_internas?: string[];
  latitude?: number;
  longitude?: number;
}

export function CondominioSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CondominioResult[]>([]);
  const [expandedCondo, setExpandedCondo] = useState<string | null>(null);

  // Fetch all condominiums for autocomplete (including new fields)
  const { data: condominios } = useQuery({
    queryKey: ["condominios-all-enriched"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios_mapeamento")
        .select("nome_condominio, logradouro_padrao, microbairro, padrao_construtivo, ruas_internas, latitude, longitude, logradouro_itbi_normalizado")
        .order("nome_condominio");
      if (error) throw error;
      return data;
    },
  });

  // Filter suggestions based on search term
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2 || !condominios) return [];
    const term = searchTerm.toUpperCase();
    return condominios
      .filter(c => c.nome_condominio.toUpperCase().includes(term))
      .slice(0, 8);
  }, [searchTerm, condominios]);

  const handleSearch = async (condominioName?: string) => {
    const nameToSearch = condominioName || searchTerm;
    if (!nameToSearch.trim()) return;

    setIsSearching(true);
    setSearchTerm(nameToSearch);

    try {
      // Find condominiums matching the search (including new enriched fields)
      const { data: matchedCondos } = await supabase
        .from("condominios_mapeamento")
        .select("*, ruas_internas, latitude, longitude, logradouro_itbi_normalizado")
        .ilike("nome_condominio", `%${nameToSearch}%`);

      if (!matchedCondos || matchedCondos.length === 0) {
        setResults([]);
        return;
      }

      // Get transaction data for each condominium
      const resultsWithData: CondominioResult[] = [];
      const dateFilter = new Date();
      dateFilter.setMonth(dateFilter.getMonth() - 12);

      for (const condo of matchedCondos) {
        // Build array of logradouros to search (main + internal streets)
        const logradourosToSearch = [condo.logradouro_padrao];
        if (condo.ruas_internas && Array.isArray(condo.ruas_internas)) {
          logradourosToSearch.push(...condo.ruas_internas);
        }
        
        // Also use normalized ITBI format if available
        if (condo.logradouro_itbi_normalizado) {
          logradourosToSearch.push(condo.logradouro_itbi_normalizado);
        }

        // Search for transactions in all related streets
        const orConditions = logradourosToSearch.map(l => `logradouro.ilike.%${l}%`).join(',');
        
        const { data: transactions } = await supabase
          .from("itbi_transactions")
          .select("valor_m2, total_transacoes, valor_transacao")
          .or(orConditions)
          .eq("uso", "Residencial")
          .gte("percentual_transferido", 90)
          .gte("data_transacao", dateFilter.toISOString().split("T")[0])
          .not("valor_m2", "is", null);

        if (transactions && transactions.length > 0) {
          const totalTrans = transactions.reduce((sum, t) => sum + t.total_transacoes, 0);
          const avgM2 = transactions.reduce((sum, t) => sum + (t.valor_m2 || 0), 0) / transactions.length;
          const valorMedio = transactions.reduce((sum, t) => sum + t.valor_transacao, 0) / transactions.length;

          resultsWithData.push({
            nome_condominio: condo.nome_condominio,
            logradouro_padrao: condo.logradouro_padrao,
            microbairro: condo.microbairro,
            padrao_construtivo: condo.padrao_construtivo,
            avgM2: Math.round(avgM2),
            totalTransacoes: totalTrans,
            valorMedio: Math.round(valorMedio),
            ruas_internas: condo.ruas_internas || [],
            latitude: condo.latitude,
            longitude: condo.longitude,
          });
        } else {
          resultsWithData.push({
            nome_condominio: condo.nome_condominio,
            logradouro_padrao: condo.logradouro_padrao,
            microbairro: condo.microbairro,
            padrao_construtivo: condo.padrao_construtivo,
            avgM2: null,
            totalTransacoes: 0,
            valorMedio: null,
            ruas_internas: condo.ruas_internas || [],
            latitude: condo.latitude,
            longitude: condo.longitude,
          });
        }
      }

      // Sort by transactions count
      resultsWithData.sort((a, b) => b.totalTransacoes - a.totalTransacoes);
      setResults(resultsWithData);
    } finally {
      setIsSearching(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const normalizeStreetName = (street: string): string => {
    const prefixMap: Record<string, string> = {
      'AVN': 'Av.',
      'AV': 'Av.',
      'RUA': 'Rua',
      'R': 'Rua',
      'EST': 'Est.',
      'PRC': 'Pç.',
      'TRV': 'Tv.',
    };
    
    let result = street;
    for (const [abbr, full] of Object.entries(prefixMap)) {
      const regex = new RegExp(`^${abbr}\\s+`, 'i');
      if (regex.test(result)) {
        result = result.replace(regex, `${full} `);
        break;
      }
    }
    
    return result
      .toLowerCase()
      .split(' ')
      .map(word => {
        const lowercase = ['da', 'de', 'do', 'das', 'dos', 'e'];
        if (lowercase.includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="condo-search">Nome do Condomínio</Label>
        <div className="relative">
          <Input
            id="condo-search"
            placeholder="Ex: Riserva Golf, Península, Cidade Jardim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pr-10"
          />
          <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && !isSearching && results.length === 0 && (
        <ScrollArea className="h-auto max-h-48 border rounded-md">
          <div className="p-2 space-y-1">
            {suggestions.map((s) => (
              <button
                key={s.nome_condominio}
                onClick={() => handleSearch(s.nome_condominio)}
                className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm">{s.nome_condominio}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  {normalizeStreetName(s.logradouro_padrao)}
                  {s.microbairro && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {s.microbairro}
                    </Badge>
                  )}
                  {s.ruas_internas && s.ruas_internas.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      +{s.ruas_internas.length} ruas
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      <Button onClick={() => handleSearch()} disabled={isSearching || !searchTerm.trim()} className="w-full">
        {isSearching ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        Buscar Condomínio
      </Button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 mt-4">
          <div className="text-sm font-medium text-muted-foreground">
            {results.length} condomínio(s) encontrado(s)
          </div>
          <ScrollArea className="h-auto max-h-[500px]">
            <div className="space-y-3">
              {results.map((result, idx) => (
                <Collapsible 
                  key={`${result.nome_condominio}-${idx}`}
                  open={expandedCondo === result.nome_condominio}
                  onOpenChange={(open) => setExpandedCondo(open ? result.nome_condominio : null)}
                >
                  <div className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold text-sm truncate">{result.nome_condominio}</span>
                          {result.padrao_construtivo && (
                            <Badge variant="secondary" className="text-[10px]">
                              {result.padrao_construtivo}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {normalizeStreetName(result.logradouro_padrao)}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {result.microbairro && (
                            <Badge variant="outline" className="text-[10px]">
                              {result.microbairro}
                            </Badge>
                          )}
                          {result.latitude && result.longitude && (
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                              📍 Geolocalizado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {result.avgM2 !== null ? (
                          <>
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(result.avgM2)}/m²
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.totalTransacoes} transações
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Média: {formatCurrency(result.valorMedio)}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Sem transações recentes
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Internal streets section */}
                    {result.ruas_internas && result.ruas_internas.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {result.ruas_internas.length} rua(s) interna(s) identificada(s)
                            </span>
                            {expandedCondo === result.nome_condominio ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="grid gap-1">
                            {result.ruas_internas.map((rua, ruaIdx) => (
                              <div key={ruaIdx} className="text-xs text-muted-foreground pl-4 py-1 border-l-2 border-muted">
                                {normalizeStreetName(rua)}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    )}
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {results.length === 0 && searchTerm && !isSearching && suggestions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum condomínio encontrado para "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
