import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, MapPin, Maximize2, Home, ArrowRight, Loader2, Building2, Search, BedDouble, Bath, Sparkles, Car, Star, User, Mail, Phone, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePublicStreetSuggestions } from "@/hooks/usePublicStreetSuggestions";
import { toast } from "sonner";
import { LimitExceededScreen } from "./LimitExceededScreen";

export interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  diferenciais?: string;
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
  // Lead data
  leadName: string;
  leadEmail: string;
  leadPhone: string;
}

interface QuickValuationFormProps {
  onComplete: (data: QuickValuationData) => void;
}

const MAX_FREE_EVALUATIONS = 2;

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
  // Lead fields
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  
  // Property fields
  const [bairro, setBairro] = useState("BARRA DA TIJUCA");
  const [logradouro, setLogradouro] = useState("");
  const [area, setArea] = useState("");
  const [tipologia, setTipologia] = useState("Apartamento");
  const [quartos, setQuartos] = useState("");
  const [banheiros, setBanheiros] = useState("");
  const [suites, setSuites] = useState("");
  const [vagas, setVagas] = useState("");
  const [diferenciais, setDiferenciais] = useState("");
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [currentEvaluationCount, setCurrentEvaluationCount] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: suggestions, isLoading: suggestionsLoading } = usePublicStreetSuggestions(logradouro, bairro);

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

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate lead fields
    if (!nome.trim() || nome.trim().length < 3) {
      setError("Nome deve ter pelo menos 3 caracteres");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Email inválido");
      return;
    }
    
    if (!validatePhone(telefone)) {
      setError("Telefone deve ter 10 ou 11 dígitos");
      return;
    }
    
    // Validate property fields
    const areaNum = parseFloat(area);
    if (!bairro || !areaNum || areaNum <= 0) {
      setError("Preencha todos os campos obrigatórios do imóvel");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const phoneDigits = telefone.replace(/\D/g, "");
      
      // Step 1: Check evaluation limit BEFORE showing results
      const { data: leadCheck } = await supabase.rpc('check_lead_exists', {
        lead_email: normalizedEmail
      });
      
      const existingLead = leadCheck && leadCheck.length > 0 && leadCheck[0].exists_flag;
      const evaluationCount = existingLead ? leadCheck[0].current_count : 0;
      
      // If limit exceeded, show limit screen
      if (evaluationCount >= MAX_FREE_EVALUATIONS) {
        setCurrentEvaluationCount(evaluationCount);
        setLimitExceeded(true);
        setIsLoading(false);
        return;
      }
      
      // Step 2: Register or update lead
      if (existingLead) {
        // Update existing lead and increment evaluation count
        await supabase.rpc('update_lead_by_email', {
          p_email: normalizedEmail,
          p_nome: nome.trim(),
          p_telefone: phoneDigits,
          p_bairro_interesse: bairro,
          p_area_interesse: areaNum,
          p_quartos: quartos ? parseInt(quartos) : null,
          p_banheiros: banheiros ? parseInt(banheiros) : null,
          p_suites: suites ? parseInt(suites) : null,
          p_vagas: vagas ? parseInt(vagas) : null,
          p_diferenciais_imovel: diferenciais.trim() || null,
        });
        
        // Increment evaluation count
        await supabase.rpc('increment_lead_evaluation', {
          lead_email: normalizedEmail
        });
      } else {
        // Create new lead
        const { error: insertError } = await supabase.from("leads").insert({
          nome: nome.trim(),
          email: normalizedEmail,
          telefone: phoneDigits,
          bairro_interesse: bairro,
          area_interesse: areaNum,
          quartos: quartos ? parseInt(quartos) : null,
          banheiros: banheiros ? parseInt(banheiros) : null,
          suites: suites ? parseInt(suites) : null,
          vagas: vagas ? parseInt(vagas) : null,
          diferenciais_imovel: diferenciais.trim() || null,
          interesse: "compra",
          origem: "avaliacao_publica",
          evaluation_count: 1,
        });
        
        if (insertError) throw insertError;
      }
      
      // Send notification for EVERY evaluation (new or returning lead)
      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            type: existingLead ? 'returning' : 'initial',
            leadId: '',
            leadName: nome.trim(),
            leadEmail: normalizedEmail,
            leadPhone: phoneDigits,
            interesse: 'compra',
            bairro,
            area: areaNum,
            tipologia,
            quartos: quartos ? parseInt(quartos) : undefined,
            banheiros: banheiros ? parseInt(banheiros) : undefined,
            suites: suites ? parseInt(suites) : undefined,
            vagas: vagas ? parseInt(vagas) : undefined,
            evaluationNumber: existingLead ? evaluationCount + 1 : 1,
          }
        });
        console.log(`Lead notification sent (${existingLead ? 'returning' : 'initial'})`);
      } catch (notificationError) {
        console.error('Error sending lead notification:', notificationError);
      }
      
      // Step 3: Fetch ITBI data via Edge Function (public endpoint)
      const { data: statsResponse, error: statsError } = await supabase.functions.invoke('public-itbi-stats', {
        body: {
          bairro,
          logradouro: logradouro.trim() || undefined,
          tipologia: tipologia !== "Todos" ? tipologia : undefined,
        }
      });

      if (statsError) throw statsError;

      let itbiData = null;
      let estimativa = null;

      if (statsResponse?.success && statsResponse?.stats) {
        const stats = statsResponse.stats;
        
        itbiData = {
          min_m2: stats.min_m2,
          med_m2: stats.med_m2,
          max_m2: stats.max_m2,
          transaction_count: stats.transaction_count,
        };

        estimativa = {
          min: Math.round(stats.min_m2 * areaNum),
          med: Math.round(stats.med_m2 * areaNum),
          max: Math.round(stats.max_m2 * areaNum),
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
        diferenciais: diferenciais.trim() || undefined,
        itbiData,
        estimativa,
        leadName: nome.trim(),
        leadEmail: normalizedEmail,
        leadPhone: phoneDigits,
      });
    } catch (err) {
      console.error("Erro ao processar:", err);
      setError("Erro ao processar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show limit exceeded screen
  if (limitExceeded) {
    return (
      <LimitExceededScreen 
        evaluationCount={currentEvaluationCount} 
        email={email}
        onRetry={() => setLimitExceeded(false)}
      />
    );
  }

  return (
    <Card className="border-accent/30 shadow-xl bg-card/80 backdrop-blur">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-4 shadow-lg">
          <Calculator className="h-8 w-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-bold">Sua Análise Preliminar de Valor Imobiliário Gratuita</CardTitle>
        <CardDescription className="text-base">
          Informe seus dados e os dados do imóvel para receber uma estimativa de valor de mercado.
        </CardDescription>
        <Badge variant="secondary" className="mx-auto mt-2 bg-accent/10 text-accent">
          2 consultas gratuitas por email
        </Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Privacy Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">
              <strong>Privacidade:</strong> Seus dados são criptografados e utilizados exclusivamente para sua análise.
            </p>
          </div>
          
          {/* Lead Fields Section */}
          <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
              <User className="h-4 w-4" />
              Seus Dados
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-accent" />
                Nome Completo *
              </Label>
              <Input
                id="nome"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="border-primary/20 focus-visible:ring-accent/30"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-accent" />
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-primary/20 focus-visible:ring-accent/30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone" className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-accent" />
                  WhatsApp *
                </Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(21) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  className="border-primary/20 focus-visible:ring-accent/30"
                />
              </div>
            </div>
          </div>

          {/* Property Fields Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Dados do Imóvel
            </h3>
            
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia" className="flex items-center gap-2 text-sm font-medium">
                  <Home className="h-4 w-4 text-accent" />
                  Tipo *
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
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                Características (opcional)
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

            <div className="space-y-2">
              <Label htmlFor="diferenciais" className="flex items-center gap-2 text-sm font-medium">
                <Star className="h-4 w-4 text-accent" />
                Diferenciais (opcional)
              </Label>
              <Textarea
                id="diferenciais"
                placeholder="Ex: vista mar, acabamentos de luxo, automação, lazer completo..."
                value={diferenciais}
                onChange={(e) => setDiferenciais(e.target.value)}
                className="border-primary/20 focus-visible:ring-accent/30 min-h-[60px] resize-none"
                maxLength={500}
              />
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
                Processando...
              </>
            ) : (
              <>
                Ver Análise Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            ⚡ Resultado instantâneo baseado em transações oficiais ITBI.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
