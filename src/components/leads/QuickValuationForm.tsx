import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, MapPin, Maximize2, Home, ArrowRight, Loader2, Building2, Search, BedDouble, Bath, Sparkles, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStreetSuggestions } from "@/hooks/useStreetSuggestions";

interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  itbiData: {
    min_m2: number;
    med_m2: number;
    max_m2: number;
    transaction_count: number;
  } | null;
  estimativa: {
    min: number;
    med: number;
    max: number;
  } | null;
}

interface QuickValuationFormProps {
  onComplete: (data: QuickValuationData) => void;
}

const BAIRROS_POPULARES = [
  "BARRA DA TIJUCA",
  "RECREIO DOS BANDEIRANTES",
  "LEBLON",
  "IPANEMA",
  "COPACABANA",
  "BOTAFOGO",
  "LAGOA",
  "JARDIM BOTANICO",
  "GAVEA",
  "SAO CONRADO",
];

const TIPOLOGIAS = [
  { value: "Apartamento", label: "Apartamento" },
  { value: "Casa", label: "Casa" },
];

export function QuickValuationForm({ onComplete }: QuickValuationFormProps) {
  const [bairro, setBairro] = useState("BARRA DA TIJUCA");
  const [logradouro, setLogradouro] = useState("");
  const [area, setArea] = useState("");
  const [tipologia, setTipologia] = useState("Apartamento");
  const [quartos, setQuartos] = useState("");
  const [banheiros, setBanheiros] = useState("");
  const [suites, setSuites] = useState("");
  const [vagas, setVagas] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Hook de busca de sugestões de ruas
  const { data: suggestions, isLoading: suggestionsLoading } = useStreetSuggestions(logradouro, bairro);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: { logradouro: string; nome_condominio?: string }) => {
    setLogradouro(suggestion.nome_condominio || suggestion.logradouro);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const areaNum = parseFloat(area);
    if (!bairro || !areaNum || areaNum <= 0) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      // Busca dados ITBI do bairro selecionado
      let query = supabase
        .from("itbi_transactions")
        .select("valor_m2, total_transacoes")
        .eq("bairro", bairro)
        .eq("uso", "Residencial")
        .gte("percentual_transferido", 90)
        .not("valor_m2", "is", null)
        .gte("data_transacao", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

      // Se tiver logradouro, filtra também
      if (logradouro.trim()) {
        query = query.ilike("logradouro", `%${logradouro.trim()}%`);
      }

      // Filtra por tipologia se não for "todos"
      if (tipologia && tipologia !== "Todos") {
        query = query.ilike("tipologia", `%${tipologia}%`);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      let itbiData = null;
      let estimativa = null;

      if (data && data.length > 0) {
        const valores = data.map((d) => d.valor_m2 as number).sort((a, b) => a - b);
        const totalTransacoes = data.reduce((sum, d) => sum + (d.total_transacoes || 1), 0);

        const min_m2 = valores[Math.floor(valores.length * 0.1)] || valores[0];
        const max_m2 = valores[Math.floor(valores.length * 0.9)] || valores[valores.length - 1];
        const med_m2 = valores.reduce((a, b) => a + b, 0) / valores.length;

        itbiData = {
          min_m2: Math.round(min_m2),
          med_m2: Math.round(med_m2),
          max_m2: Math.round(max_m2),
          transaction_count: totalTransacoes,
        };

        estimativa = {
          min: Math.round(min_m2 * areaNum),
          med: Math.round(med_m2 * areaNum),
          max: Math.round(max_m2 * areaNum),
        };
      }

      onComplete({
        bairro,
        logradouro: logradouro.trim(),
        area_m2: areaNum,
        tipologia,
        quartos: quartos ? parseInt(quartos) : undefined,
        banheiros: banheiros ? parseInt(banheiros) : undefined,
        suites: suites ? parseInt(suites) : undefined,
        vagas: vagas ? parseInt(vagas) : undefined,
        itbiData,
        estimativa,
      });
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError("Erro ao buscar dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-accent/30 shadow-xl bg-card/80 backdrop-blur">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-4 shadow-lg">
          <Calculator className="h-8 w-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-bold">Avaliação Rápida Gratuita</CardTitle>
        <CardDescription className="text-base">
          Informe os dados do imóvel e descubra seu valor de mercado em segundos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bairro" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-accent" />
              Bairro *
            </Label>
            <Select value={bairro} onValueChange={setBairro}>
              <SelectTrigger className="border-primary/20 focus:ring-accent/30">
                <SelectValue placeholder="Selecione o bairro" />
              </SelectTrigger>
              <SelectContent>
                {BAIRROS_POPULARES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo de rua com autocomplete */}
          <div className="space-y-2 relative">
            <Label htmlFor="logradouro" className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-accent" />
              Rua / Condomínio
            </Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="logradouro"
                placeholder="Digite o nome da rua ou condomínio..."
                value={logradouro}
                onChange={(e) => {
                  setLogradouro(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="border-primary/20 focus-visible:ring-accent/30 pr-10"
                autoComplete="off"
              />
              {suggestionsLoading && logradouro.length >= 2 && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!suggestionsLoading && logradouro.length >= 2 && (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Dropdown de sugestões */}
            {showSuggestions && suggestions && suggestions.length > 0 && logradouro.length >= 2 && (
              <div 
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.logradouro}-${index}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-accent/10 border-b border-border/50 last:border-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {suggestion.nome_condominio ? (
                          <>
                            <p className="font-medium text-sm truncate text-foreground">
                              {suggestion.nome_condominio}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {suggestion.logradouro}
                            </p>
                          </>
                        ) : (
                          <p className="font-medium text-sm truncate text-foreground">
                            {suggestion.logradouro}
                          </p>
                        )}
                        {suggestion.microbairro && (
                          <p className="text-xs text-accent mt-0.5">
                            {suggestion.microbairro}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="shrink-0 text-xs bg-primary/10 text-primary"
                      >
                        {suggestion.total_transacoes} trans.
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && logradouro.length >= 2 && suggestions?.length === 0 && !suggestionsLoading && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl p-4 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado para "{logradouro}"
              </div>
            )}
          </div>

          {/* Tipo - linha separada */}
          <div className="space-y-2">
            <Label htmlFor="tipologia" className="flex items-center gap-2 text-sm font-medium">
              <Home className="h-4 w-4 text-accent" />
              Tipo de Imóvel *
            </Label>
            <Select value={tipologia} onValueChange={setTipologia}>
              <SelectTrigger className="border-primary/20 focus:ring-accent/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOLOGIAS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Área */}
          <div className="space-y-2">
            <Label htmlFor="area" className="flex items-center gap-2 text-sm font-medium">
              <Maximize2 className="h-4 w-4 text-accent" />
              Área (m²) *
            </Label>
            <Input
              id="area"
              type="number"
              placeholder="Ex: 120"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              min="20"
              max="2000"
              className="border-primary/20 focus-visible:ring-accent/30"
            />
          </div>

          {/* Características do Imóvel - Grid responsivo */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Características do Imóvel (opcional)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quartos" className="flex items-center gap-1.5 text-xs">
                  <BedDouble className="h-3.5 w-3.5 text-accent" />
                  Quartos
                </Label>
                <Input
                  id="quartos"
                  type="number"
                  placeholder="0"
                  value={quartos}
                  onChange={(e) => setQuartos(e.target.value)}
                  min="0"
                  max="10"
                  className="border-primary/20 focus-visible:ring-accent/30 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banheiros" className="flex items-center gap-1.5 text-xs">
                  <Bath className="h-3.5 w-3.5 text-accent" />
                  Banheiros
                </Label>
                <Input
                  id="banheiros"
                  type="number"
                  placeholder="0"
                  value={banheiros}
                  onChange={(e) => setBanheiros(e.target.value)}
                  min="0"
                  max="10"
                  className="border-primary/20 focus-visible:ring-accent/30 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="suites" className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Suítes
                </Label>
                <Input
                  id="suites"
                  type="number"
                  placeholder="0"
                  value={suites}
                  onChange={(e) => setSuites(e.target.value)}
                  min="0"
                  max="10"
                  className="border-primary/20 focus-visible:ring-accent/30 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vagas" className="flex items-center gap-1.5 text-xs">
                  <Car className="h-3.5 w-3.5 text-accent" />
                  Vagas
                </Label>
                <Input
                  id="vagas"
                  type="number"
                  placeholder="0"
                  value={vagas}
                  onChange={(e) => setVagas(e.target.value)}
                  min="0"
                  max="10"
                  className="border-primary/20 focus-visible:ring-accent/30 h-9"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg" 
            size="lg" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Calculando valor...
              </>
            ) : (
              <>
                Descobrir Valor do Imóvel
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            ⚡ Resultado instantâneo baseado em transações oficiais ITBI dos últimos 12 meses
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
