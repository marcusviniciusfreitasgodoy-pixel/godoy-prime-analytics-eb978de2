# Módulo de Avaliação Pública - Código Completo para Exportação

> **Data de Exportação:** Janeiro 2026  
> **Origem:** Godoy Prime Analytics  
> **Destino:** Aplicação de Avaliação Pública Separada

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Hooks Utilitários](#hooks-utilitários)
   - `useUTMTracking.ts`
   - `useWebSpeech.ts`
   - `useOfficialStreetSuggestions.ts`
3. [Componentes de Leads](#componentes-de-leads)
   - `ComparisonTable.tsx`
   - `LimitExceededScreen.tsx`
   - `PeritEvaluationSection.tsx`
   - `PublicSofiaAssistant.tsx`
   - `QuickValuationForm.tsx`
   - `QuickValuationResult.tsx`
4. [Página Principal](#página-principal)
   - `AvaliacaoPublica.tsx`
5. [Funções Utilitárias](#funções-utilitárias)
6. [Assets Necessários](#assets-necessários)
7. [Configuração de Rota](#configuração-de-rota)
8. [Passos de Transferência](#passos-de-transferência)

---

## Pré-requisitos

Antes de copiar os arquivos, verifique se a aplicação destino possui estas dependências:

```bash
# Dependências NPM necessárias
npm install react-helmet-async react-router-dom @tanstack/react-query sonner lucide-react
```

| Pacote | Uso |
|--------|-----|
| `react-helmet-async` | SEO meta tags |
| `react-router-dom` | Navegação (Link) |
| `@tanstack/react-query` | Hook de dados |
| `sonner` | Toast notifications |
| `lucide-react` | Ícones |
| Componentes Shadcn/UI | Card, Button, Badge, Input, Select, Textarea, ScrollArea, Separator |

---

## Hooks Utilitários

### ARQUIVO: `src/hooks/useUTMTracking.ts`

```typescript
import { useEffect, useState } from 'react';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;
  gclid?: string;
  fbclid?: string;
}

const UTM_STORAGE_KEY = 'godoy_prime_utm_params';

export function useUTMTracking() {
  const [utmParams, setUtmParams] = useState<UTMParams>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    const params: UTMParams = {};
    const utmKeys: (keyof UTMParams)[] = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'utm_id',
      'gclid', 'fbclid'
    ];

    utmKeys.forEach(key => {
      const value = urlParams.get(key);
      if (value) {
        params[key] = value;
      }
    });

    if (Object.keys(params).length > 0) {
      const stored = {
        ...params,
        captured_at: new Date().toISOString(),
        landing_page: window.location.pathname,
        referrer: document.referrer || 'direct'
      };
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored));
      setUtmParams(params);
      console.log('[UTM Tracking] Campaign params captured:', stored);
    } else {
      try {
        const stored = localStorage.getItem(UTM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUtmParams(parsed);
        }
      } catch (e) {
        console.warn('[UTM Tracking] Failed to parse stored UTM params');
      }
    }
  }, []);

  const getUTMForLead = (): string => {
    try {
      const stored = localStorage.getItem(UTM_STORAGE_KEY);
      return stored || '';
    } catch {
      return '';
    }
  };

  const clearUTM = () => {
    localStorage.removeItem(UTM_STORAGE_KEY);
    setUtmParams({});
  };

  return {
    utmParams,
    getUTMForLead,
    clearUTM,
    hasUTM: Object.keys(utmParams).length > 0
  };
}

export function formatUTMSource(params: UTMParams): string {
  if (params.utm_source) {
    const parts = [params.utm_source];
    if (params.utm_medium) parts.push(params.utm_medium);
    if (params.utm_campaign) parts.push(params.utm_campaign);
    return parts.join(' / ');
  }
  if (params.gclid) return 'Google Ads';
  if (params.fbclid) return 'Meta Ads';
  return 'Direto';
}
```

---

### ARQUIVO: `src/hooks/useWebSpeech.ts`

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseWebSpeechOptions {
  lang?: string;
  silenceTimeout?: number;
}

interface UseWebSpeechReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSTTSupported: boolean;
  autoStopped: boolean;
  silenceCountdown: number;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const { lang = 'pt-BR', silenceTimeout = 2500 } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [autoStopped, setAutoStopped] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef('');
  const hasSpeechRef = useRef(false);

  const isSTTSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(0);
  }, []);

  const startSilenceCountdown = useCallback(() => {
    if (!hasSpeechRef.current) return;
    
    clearTimers();
    
    const totalMs = silenceTimeout;
    const startTime = Date.now();
    
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSilenceCountdown(remaining);
    }, 100);
    
    silenceTimerRef.current = setTimeout(() => {
      console.log('Silence detected - auto-stopping');
      clearTimers();
      setAutoStopped(true);
      shouldRestartRef.current = false;
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition:', e);
        }
      }
      setIsListening(false);
    }, silenceTimeout);
  }, [silenceTimeout, clearTimers]);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast.error('Permissão de microfone negada. Verifique as configurações do navegador.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isSTTSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setTranscript('');
      setAutoStopped(false);
      setSilenceCountdown(0);
      retryCountRef.current = 0;
      lastTranscriptRef.current = '';
      hasSpeechRef.current = false;
    };

    recognition.onend = () => {
      console.log('Speech recognition ended, shouldRestart:', shouldRestartRef.current, 'retryCount:', retryCountRef.current);
      
      clearTimers();
      
      if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log('Auto-restarting speech recognition, attempt:', retryCountRef.current);
        
        setTimeout(() => {
          if (shouldRestartRef.current) {
            try {
              recognition.start();
            } catch (error) {
              console.log('Could not restart:', error);
              setIsListening(false);
              shouldRestartRef.current = false;
            }
          }
        }, 200);
      } else {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'no-speech':
          if (shouldRestartRef.current && retryCountRef.current < maxRetries) {
            console.log('No speech detected, will retry...');
            return;
          }
          break;
          
        case 'audio-capture':
          toast.error('Microfone não detectado. Verifique as configurações de áudio.', {
            duration: 8000
          });
          setIsListening(false);
          shouldRestartRef.current = false;
          clearTimers();
          break;
          
        case 'not-allowed':
          toast.error('Permissão de microfone negada. Clique no ícone de cadeado na barra de endereços.');
          setIsListening(false);
          shouldRestartRef.current = false;
          clearTimers();
          break;
          
        case 'network':
          toast.error('Erro de rede. Verifique sua conexão com a internet.');
          setIsListening(false);
          shouldRestartRef.current = false;
          clearTimers();
          break;
          
        case 'aborted':
          break;
          
        default:
          if (event.error !== 'no-speech') {
            setIsListening(false);
            shouldRestartRef.current = false;
            clearTimers();
          }
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      const result = finalTranscript || interimTranscript;
      if (result) {
        setTranscript(result);
        lastTranscriptRef.current = result;
        retryCountRef.current = 0;
        hasSpeechRef.current = true;
        startSilenceCountdown();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [lang, isSTTSupported, clearTimers, startSilenceCountdown]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    
    if (isListening) return;
    
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;
    
    try {
      setTranscript('');
      setAutoStopped(false);
      setSilenceCountdown(0);
      shouldRestartRef.current = true;
      retryCountRef.current = 0;
      hasSpeechRef.current = false;
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          if (shouldRestartRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart after abort:', e);
              toast.error('Não foi possível iniciar o microfone. Tente novamente.');
            }
          }
        }, 300);
      } catch (e) {
        console.error('Failed to restart after abort:', e);
        toast.error('Erro ao iniciar reconhecimento de voz.');
      }
    }
  }, [isListening, requestMicrophonePermission]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    clearTimers();
    
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
    setIsListening(false);
  }, [clearTimers]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSTTSupported,
    autoStopped,
    silenceCountdown,
  };
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
```

---

### ARQUIVO: `src/hooks/useOfficialStreetSuggestions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStreetSearchTerm, normalizeAccents } from '@/lib/utils';

export interface OfficialStreetSuggestion {
  logradouro: string;
  logradouro_itbi?: string;
  fonte: 'oficial' | 'itbi' | 'combinado';
  cod_trecho?: number;
  hierarquia?: string;
  tipo_logradouro?: string;
  latitude?: number;
  longitude?: number;
  transaction_count?: number;
  nome_condominio?: string;
  microbairro?: string;
}

export function useOfficialStreetSuggestions(query: string, bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<OfficialStreetSuggestion[]>({
    queryKey: ['official-street-suggestions', query, bairro],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      try {
        const [officialResult, itbiResult] = await Promise.all([
          supabase.functions.invoke('geo-logradouro', {
            body: {
              action: 'search',
              term: query,
              bairro,
            }
          }),
          fetchITBISuggestions(query, bairro)
        ]);

        const combinedMap = new Map<string, OfficialStreetSuggestion>();

        if (officialResult.data?.results) {
          for (const result of officialResult.data.results) {
            const normalized = normalizeStreetForITBI(result.logradouro);
            combinedMap.set(normalized.toUpperCase(), {
              logradouro: result.logradouro,
              logradouro_itbi: normalized,
              fonte: 'oficial',
              cod_trecho: result.cod_trecho,
              hierarquia: result.hierarquia,
              tipo_logradouro: result.tipo_logradouro,
              latitude: result.latitude,
              longitude: result.longitude,
            });
          }
        }

        for (const itbi of itbiResult) {
          const key = itbi.logradouro.toUpperCase();
          const existing = combinedMap.get(key);
          
          if (existing) {
            existing.fonte = 'combinado';
            existing.transaction_count = itbi.transaction_count;
            existing.nome_condominio = itbi.nome_condominio;
            existing.microbairro = itbi.microbairro;
          } else {
            combinedMap.set(key, {
              logradouro: itbi.logradouro,
              logradouro_itbi: itbi.logradouro,
              fonte: 'itbi',
              transaction_count: itbi.transaction_count,
              nome_condominio: itbi.nome_condominio,
              microbairro: itbi.microbairro,
            });
          }
        }

        const results = Array.from(combinedMap.values()).sort((a, b) => {
          const fontePriority = { combinado: 0, oficial: 1, itbi: 2 };
          const fonteDiff = fontePriority[a.fonte] - fontePriority[b.fonte];
          if (fonteDiff !== 0) return fonteDiff;
          return (b.transaction_count || 0) - (a.transaction_count || 0);
        });

        return results.slice(0, 12);
      } catch (error) {
        console.error('Error fetching official suggestions:', error);
        return fetchITBISuggestions(query, bairro);
      }
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

async function fetchITBISuggestions(query: string, bairro: string): Promise<OfficialStreetSuggestion[]> {
  const normalizedTerm = normalizeStreetSearchTerm(query);
  const normalizedNoAccents = normalizeAccents(normalizedTerm);

  const { data, error } = await supabase
    .from("itbi_transactions")
    .select("logradouro, total_transacoes")
    .eq("bairro", bairro.toUpperCase())
    .gte("percentual_transferido", 90)
    .not("valor_m2", "is", null)
    .or(`logradouro.ilike.%${normalizedTerm}%,logradouro.ilike.%${normalizedNoAccents}%`)
    .order("total_transacoes", { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching ITBI suggestions:', error);
    return [];
  }

  const { data: condominios } = await supabase
    .from("condominios_mapeamento")
    .select("logradouro_padrao, nome_condominio, microbairro")
    .or(`logradouro_padrao.ilike.%${normalizedTerm}%,nome_condominio.ilike.%${normalizedTerm}%`);

  const condominioMap = new Map<string, { nome: string; microbairro?: string }>();
  condominios?.forEach((c) => {
    condominioMap.set(c.logradouro_padrao, {
      nome: c.nome_condominio,
      microbairro: c.microbairro || undefined,
    });
  });

  const grouped = new Map<string, number>();
  data?.forEach((item) => {
    const key = item.logradouro;
    grouped.set(key, (grouped.get(key) || 0) + (item.total_transacoes || 1));
  });

  return Array.from(grouped.entries())
    .map(([logradouro, count]) => {
      const condo = condominioMap.get(logradouro);
      return {
        logradouro,
        logradouro_itbi: logradouro,
        fonte: 'itbi' as const,
        transaction_count: count,
        nome_condominio: condo?.nome,
        microbairro: condo?.microbairro,
      };
    })
    .sort((a, b) => (b.transaction_count || 0) - (a.transaction_count || 0))
    .slice(0, 12);
}

export function normalizeStreetForITBI(officialName: string): string {
  if (!officialName) return officialName;
  
  return officialName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^AVENIDA\s+/, 'AVN ')
    .replace(/^ESTRADA\s+/, 'EST ')
    .replace(/^TRAVESSA\s+/, 'TV ')
    .replace(/^ALAMEDA\s+/, 'AL ')
    .replace(/^PRACA\s+/, 'PRC ')
    .replace(/^LARGO\s+/, 'LGO ')
    .replace(/^LADEIRA\s+/, 'LAD ')
    .replace(/^BECO\s+/, 'BCO ')
    .replace(/^RODOVIA\s+/, 'ROD ')
    .trim();
}
```

---

## Componentes de Leads

### ARQUIVO: `src/components/leads/ComparisonTable.tsx`

```typescript
import { Check, X, AlertTriangle, Shield } from "lucide-react";

const comparisonData = [
  {
    criteria: "Quem define o preço?",
    alone: "Você aceita o que dizem",
    withParecer: "Você decide com dados reais",
  },
  {
    criteria: "Informação sobre valor real",
    alone: false,
    withParecer: true,
  },
  {
    criteria: "Identificação de problemas que afetam o valor",
    alone: false,
    withParecer: true,
  },
  {
    criteria: "Potencial de valorização",
    alone: false,
    withParecer: true,
  },
  {
    criteria: "Poder de negociação",
    alone: "Baixo (sem argumentos técnicos)",
    withParecer: "Alto (laudo técnico em mãos)",
  },
  {
    criteria: "Risco de prejuízo",
    alone: "R$ 100-300 mil",
    withParecer: "Minimizado com análise profissional",
  },
];

export function ComparisonTable() {
  const renderValue = (value: boolean | string, isPositive: boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-500 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-red-400 mx-auto" />
      );
    }
    return (
      <span className={`text-sm ${isPositive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {value}
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <h3 className="text-lg font-semibold text-foreground mb-4 text-center flex items-center justify-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Negociar Sozinho vs. Com Parecer Godoy Prime
      </h3>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 bg-muted/50 border-b border-border font-medium text-foreground">
              Critério
            </th>
            <th className="text-center p-3 bg-red-50 border-b border-red-200 font-medium text-red-700">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Negociar Sozinho
              </div>
            </th>
            <th className="text-center p-3 bg-green-50 border-b border-green-200 font-medium text-green-700">
              <div className="flex items-center justify-center gap-1">
                <Shield className="h-4 w-4" />
                Com Parecer ⭐
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((row, index) => (
            <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="p-3 text-sm text-muted-foreground font-medium">
                {row.criteria}
              </td>
              <td className="p-3 text-center bg-red-50/50">
                {renderValue(row.alone, false)}
              </td>
              <td className="p-3 text-center bg-green-50/50">
                {renderValue(row.withParecer, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800 text-center">
          <strong>⚠️ Atenção:</strong> Vendedor + Corretor + Imobiliária lucram quando você paga mais. 
          Você precisa de um defensor técnico exclusivo do seu lado.
        </p>
      </div>
    </div>
  );
}
```

---

### ARQUIVO: `src/components/leads/LimitExceededScreen.tsx`

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, MessageCircle, Calendar } from "lucide-react";

interface LimitExceededScreenProps {
  evaluationCount: number;
  email: string;
  onRetry?: () => void;
}

export function LimitExceededScreen({ evaluationCount, email, onRetry }: LimitExceededScreenProps) {
  const whatsappMessage = encodeURIComponent(
    `Olá Marcus! Usei ${evaluationCount} consultas preliminares no site e gostaria de agendar uma avaliação completa com Perito Avaliador. Email: ${email}`
  );

  return (
    <Card className="border-accent/30 shadow-xl bg-card/80 backdrop-blur max-w-lg mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary/20 flex items-center justify-center mb-4 shadow-lg">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <CardTitle className="text-2xl font-bold">Limite de Consultas Atingido</CardTitle>
        <CardDescription className="text-base">
          Você já realizou <span className="font-semibold text-accent">{evaluationCount}</span> análises preliminares gratuitas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-3 text-primary">Próximo Passo: Parecer Técnico Completo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Para análises mais precisas e detalhadas, converse com Marcus Godoy e conheça o 
            <strong> Parecer Técnico Godoy Prime</strong> - uma avaliação profissional com:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Análise de Valor Real baseada em transações oficiais
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Vistoria Presencial por Perito Credenciado TJRJ
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Relatório de Valorização com projeção de 3-5 anos
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              Margem de Negociação documentada
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <a
            href={`https://wa.me/5521964075124?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com Marcus pelo WhatsApp
            </Button>
          </a>

          <Button
            variant="outline"
            className="w-full border-primary/30"
            size="lg"
            onClick={() => window.location.href = "tel:+5521964075124"}
          >
            <Phone className="mr-2 h-5 w-5" />
            Ligar: (21) 96407-5124
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            size="lg"
            onClick={() => window.open("https://calendly.com/godoyprime/parecer-tecnico", "_blank")}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Agendar Horário Online
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-800">
            <strong>Dica:</strong> Quanto antes validar o valor real, maior sua vantagem na negociação.
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Dúvidas? Entre em contato: contato@godoyprime.com.br
        </p>
      </CardContent>
    </Card>
  );
}
```

---

### ARQUIVO: `src/components/leads/PeritEvaluationSection.tsx`

```typescript
import { 
  Shield, 
  Search, 
  Home, 
  TrendingUp, 
  Target,
  Award,
  MapPin,
  Database,
  CheckCircle,
  Clock,
  Banknote,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import marcusGodoyImg from "@/assets/marcus-godoy.jpg";

const parecerEntregas = [
  {
    icon: Search,
    title: "Análise de Valor Real",
    description: "Cruzamos dados oficiais com anúncios e histórico de transações para descobrir o verdadeiro valor de mercado.",
  },
  {
    icon: Home,
    title: "Vistoria Presencial Detalhada",
    description: "Avaliamos o estado de conservação, acabamentos e características que impactam diretamente no valor do imóvel.",
  },
  {
    icon: TrendingUp,
    title: "Relatório de Potencial de Valorização",
    description: "Projetamos cenários futuros com base em tendências do bairro e desenvolvimentos da região.",
  },
  {
    icon: Target,
    title: "Recomendação de Preço Justo",
    description: "Entregamos o valor exato que você deve pagar/aceitar + margem de negociação fundamentada.",
  },
];

const credenciais = [
  { label: "Perito Avaliador Credenciado TJRJ", icon: Award },
  { label: "CRECI PJ 11841 RJ | CRECI PF 80199 RJ", icon: CheckCircle },
  { label: "Primeiro Personal Shopper Imobiliário do Rio de Janeiro", icon: Shield },
  { label: "Especialização Exclusiva: Barra da Tijuca", icon: MapPin },
  { label: "Banco de Dados Proprietário: Transações Reais de Cartório", icon: Database },
];

const primeBuyerPhases = [
  { phase: "1", title: "Briefing Detalhado", desc: "Entendemos exatamente o que você busca" },
  { phase: "2", title: "Curadoria Exclusiva", desc: "Pré-selecionamos imóveis que atendem seus critérios" },
  { phase: "3", title: "Análise Técnica", desc: "Parecer completo de cada imóvel selecionado" },
  { phase: "4", title: "Negociação Blindada", desc: "Negociamos em seu nome com dados técnicos" },
  { phase: "5", title: "Acompanhamento Total", desc: "Do contrato até as chaves" },
];

export function PeritEvaluationSection() {
  return (
    <div className="space-y-10">
      {/* Seção 1: Exposição do Problema */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="text-center space-y-4">
          <h3 className="text-xl md:text-2xl font-bold text-red-800">
            Você Está Negociando Sozinho Contra Vendedor + Corretor + Imobiliária
          </h3>
          <p className="text-red-700 text-sm md:text-base">
            (Todos Lucrando Quando Você Paga Caro — Chegou a Hora de Ter Defensor Técnico Exclusivo)
          </p>
          <div className="bg-white/80 rounded-xl p-4 max-w-2xl mx-auto">
            <p className="text-red-900 font-medium">
              "Três pessoas defendendo preço alto. <strong className="text-red-700">Zero pessoas defendendo você.</strong>"
            </p>
          </div>
        </div>
      </div>

      {/* Seção 2: Parecer Godoy Prime - Sua Solução */}
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            <Shield className="inline h-6 w-6 text-primary mr-2" />
            Parecer Godoy Prime: Seu Escudo Técnico
          </h3>
          <p className="text-primary font-semibold">
            Contra Prejuízo de R$ 100-300 Mil
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parecerEntregas.map((entrega, index) => {
            const Icon = entrega.icon;
            return (
              <div 
                key={index}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-foreground text-sm mb-1">
                      {entrega.title}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {entrega.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seção 3: Autoridade - Marcus Godoy */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Foto */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <img 
              src={marcusGodoyImg} 
              alt="Marcus Godoy - Perito Avaliador" 
              className="w-full h-auto rounded-xl object-cover"
            />
          </div>
          
          {/* Conteúdo */}
          <div className="flex-1 space-y-4">
            <div className="text-center md:text-left">
              <h4 className="text-lg font-bold text-foreground mb-2">
                <Award className="inline h-5 w-5 text-accent mr-2" />
                Marcus Godoy
              </h4>
              <p className="text-sm text-muted-foreground">
                Seu Defensor Técnico na Negociação
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {credenciais.map((cred, index) => {
                const Icon = cred.icon;
                return (
                  <div 
                    key={index}
                    className="flex items-center gap-2 bg-white/80 border border-primary/20 rounded-full px-3 py-1.5 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-foreground font-medium">{cred.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Seção 4: Garantia Dupla */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-foreground text-center">
          🛡️ Garantia Dupla
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Garantia de Validação Independente
            </h5>
            <p className="text-sm text-green-700">
              Se a análise não revelar pelo menos um ponto crítico que valha mais que o investimento → <strong>reembolso 100%</strong>
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Garantia de Execução Profissional
            </h5>
            <p className="text-sm text-green-700">
              Se não entregar no prazo de 7 dias úteis por falha operacional → <strong>reembolso 100% + compensação</strong>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground italic">
          "Você só arrisca o custo de continuar vulnerável."
        </p>
      </div>

      {/* Seção 5: Investimento */}
      <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-2xl p-4 sm:p-6 text-center">
        <h4 className="text-lg font-bold text-foreground mb-4 flex items-center justify-center gap-2">
          <Banknote className="h-5 w-5 text-accent" />
          Investimento
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-base sm:text-lg font-bold text-foreground">A partir de R$ 5.000</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Economia Média</p>
            <p className="text-base sm:text-lg font-bold text-green-600">R$ 180-450 mil</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">ROI</p>
            <p className="text-base sm:text-lg font-bold text-primary">36-90x</p>
          </div>
        </div>

        <p className="text-sm text-foreground font-medium">
          "Não é gasto — é <strong className="text-accent">blindagem patrimonial</strong> com retorno mensurável."
        </p>
      </div>

      {/* Seção 6: Sistema Representação Blindada (Oferta Complementar) */}
      <div className="bg-[#0C2340] rounded-2xl p-6 text-white">
        <div className="text-center mb-6">
          <h4 className="text-lg font-bold mb-2">
            🚀 Quer Representação Completa Durante Todo o Processo?
          </h4>
          <p className="text-white/70 text-sm">
            Sistema de Representação Blindada: Prime Buyer Experience
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {primeBuyerPhases.map((phase, index) => (
            <div 
              key={index}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-center"
            >
              <div className="text-[#D4AF37] font-bold text-xs mb-0.5">Fase {phase.phase}</div>
              <div className="text-white text-xs font-medium">{phase.title}</div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-white/80 text-sm">
            <strong className="text-[#D4AF37]">A Diferença Matemática:</strong> Compradores que usam Personal Shopper 
            economizam em média 8-15% no valor final + evitam 100% dos vícios ocultos.
          </p>
          
          <Button 
            variant="outline" 
            className="w-full sm:w-auto bg-transparent border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0C2340] focus:bg-[#D4AF37] focus:text-[#0C2340] active:bg-[#D4AF37] active:text-[#0C2340] whitespace-normal h-auto py-3 px-4"
            onClick={() => window.open('https://personalshopperimobiliario.godoyprime.com.br', '_blank')}
          >
            <span className="text-sm sm:text-base">Conhecer Prime Buyer Experience</span>
            <ExternalLink className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### ARQUIVO: `src/components/leads/QuickValuationForm.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, MapPin, Maximize2, Home, ArrowRight, Loader2, Building2, Search, BedDouble, Bath, Sparkles, Car, Star, User, Mail, Phone, Shield, CheckCircle2, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOfficialStreetSuggestions, type OfficialStreetSuggestion } from "@/hooks/useOfficialStreetSuggestions";
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
  "BOTAFOGO",
  "COPACABANA",
  "GAVEA",
  "IPANEMA",
  "JARDIM BOTANICO",
  "LAGOA",
  "LEBLON",
  "RECREIO DOS BANDEIRANTES",
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

  const { data: suggestions, isLoading: suggestionsLoading } = useOfficialStreetSuggestions(logradouro, bairro);

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

  const handleSelectSuggestion = (suggestion: OfficialStreetSuggestion) => {
    const streetName = suggestion.logradouro_itbi || suggestion.logradouro;
    setLogradouro(suggestion.nome_condominio || streetName);
    setShowSuggestions(false);
  };

  const getFonteBadge = (fonte: OfficialStreetSuggestion['fonte']) => {
    switch (fonte) {
      case 'combinado':
        return (
          <Badge variant="default" className="text-[10px] shrink-0 bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'oficial':
        return (
          <Badge variant="outline" className="text-[10px] shrink-0 text-blue-600 border-blue-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Oficial
          </Badge>
        );
      case 'itbi':
        return (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            <Database className="h-3 w-3 mr-1" />
            ITBI
          </Badge>
        );
    }
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
      
      // Step 1: Check evaluation limit using rate-limited edge function
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('lead-operations', {
        body: {
          operation: 'check',
          email: normalizedEmail,
        }
      });
      
      if (checkError) {
        if (checkError.message?.includes('429') || checkError.message?.includes('Too many')) {
          toast.error("Muitas tentativas. Aguarde um momento e tente novamente.");
          setIsLoading(false);
          return;
        }
        throw checkError;
      }
      
      const existingLead = checkResult?.exists || false;
      const evaluationCount = existingLead ? MAX_FREE_EVALUATIONS : 0;
      
      // Step 2: Register or update lead
      if (existingLead) {
        const { data: updateResult, error: updateError } = await supabase.functions.invoke('lead-operations', {
          body: {
            operation: 'update',
            email: normalizedEmail,
            nome: nome.trim(),
            telefone: phoneDigits,
            bairro_interesse: bairro,
            area_interesse: areaNum,
            quartos: quartos ? parseInt(quartos) : null,
            banheiros: banheiros ? parseInt(banheiros) : null,
            suites: suites ? parseInt(suites) : null,
            vagas: vagas ? parseInt(vagas) : null,
            diferenciais_imovel: diferenciais.trim() || null,
          }
        });
        
        if (updateError) {
          if (updateError.message?.includes('429') || updateError.message?.includes('Too many')) {
            toast.error("Muitas tentativas. Aguarde um momento e tente novamente.");
            setIsLoading(false);
            return;
          }
          throw updateError;
        }
        
        await supabase.functions.invoke('lead-operations', {
          body: {
            operation: 'increment',
            email: normalizedEmail,
          }
        });
      } else {
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
      
      // Send notification for EVERY evaluation
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
      
      // Step 3: Fetch ITBI data via Edge Function
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
                          {suggestion.hierarquia && (
                            <p className="text-[10px] text-muted-foreground">
                              Via {suggestion.hierarquia}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {getFonteBadge(suggestion.fonte)}
                          {suggestion.transaction_count && suggestion.transaction_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {suggestion.transaction_count} transações
                            </span>
                          )}
                        </div>
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
```

---

### ARQUIVO: `src/components/leads/QuickValuationResult.tsx`

```typescript
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, MapPin, Maximize2, Home, Calculator, AlertCircle, Shield, MessageCircle, Phone, Check } from "lucide-react";
import { ComparisonTable } from "./ComparisonTable";
import { PeritEvaluationSection } from "./PeritEvaluationSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickValuationData {
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
  leadName: string;
  leadEmail: string;
  leadPhone: string;
}

interface QuickValuationResultProps {
  data: QuickValuationData;
  onNewValuation: () => void;
}

export function QuickValuationResult({ 
  data, 
  onNewValuation 
}: QuickValuationResultProps) {
  const [parecerRequested, setParecerRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const formatCurrency = (value: number, compact = false) => {
    if (compact && value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')} mi`;
    }
    if (compact && value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)} mil`;
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasData = data.itbiData && data.estimativa;

  const handleRequestParecer = async () => {
    setIsRequesting(true);
    
    try {
      const { data: response, error } = await supabase.functions.invoke('send-lead-notification', {
        body: {
          type: 'complete',
          leadId: '',
          leadName: data.leadName,
          leadEmail: data.leadEmail,
          leadPhone: data.leadPhone,
          interesse: 'compra',
          bairro: data.bairro,
          area: data.area_m2,
          tipologia: data.tipologia,
          quartos: data.quartos,
          banheiros: data.banheiros,
          suites: data.suites,
          vagas: data.vagas,
          estimativaMin: data.estimativa?.min,
          estimativaMed: data.estimativa?.med,
          estimativaMax: data.estimativa?.max,
        }
      });

      if (error) {
        console.error('Error sending notification:', error);
        toast.error("Erro ao enviar solicitação. Tente pelo WhatsApp.");
      } else {
        console.log('Notification sent successfully:', response);
        toast.success("Solicitação enviada com sucesso!");
      }
      
      setParecerRequested(true);

      setTimeout(() => {
        const whatsappNumber = "5521964075124";
        const message = encodeURIComponent(
          `Olá! Sou ${data.leadName}.\n\nQuero solicitar meu Parecer Técnico Godoy Prime para proteger meu patrimônio.\n\nImóvel analisado: ${data.tipologia} de ${data.area_m2}m² em ${data.bairro}\nEstimativa Preliminar: ${formatCurrency(data.estimativa?.min || 0)} a ${formatCurrency(data.estimativa?.max || 0)}\n\nMeu WhatsApp: ${data.leadPhone}\nMeu email: ${data.leadEmail}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
      }, 500);
    } catch (err) {
      console.error('Request error:', err);
      toast.error("Erro ao enviar. Tente pelo WhatsApp.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (!hasData) {
    return (
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Dados Insuficientes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não encontramos transações suficientes para esta localização específica. 
                Tente expandir a busca removendo o endereço ou alterando o bairro.
              </p>
            </div>
            <Button onClick={onNewValuation} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lead Info Badge */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">{data.leadName}</p>
            <p className="text-xs text-green-600">{data.leadEmail}</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Cadastro Confirmado
        </Badge>
      </div>

      {/* Resultado Preliminar */}
      <Card className="border-accent/30 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
            <Calculator className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sua Análise Preliminar de Valor</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Com base nos dados informados, seu imóvel possui uma estimativa de valor entre:
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Property Summary */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {data.bairro}
            </Badge>
            {data.logradouro && (
              <Badge variant="outline" className="flex items-center gap-1">
                {data.logradouro}
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {data.area_m2} m²
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {data.tipologia}
            </Badge>
          </div>

          <Separator />

          {/* Value Estimation */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="text-center p-2 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-yellow-600" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Mínimo</p>
                <p className="font-bold text-sm sm:text-lg text-yellow-700">{formatCurrency(data.estimativa!.min, true)}</p>
              </div>
              
              <div className="text-center p-2 sm:p-4 rounded-lg bg-primary/10 border-2 border-primary/30 shadow-lg">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-primary" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Provável</p>
                <p className="font-bold text-base sm:text-xl text-primary">{formatCurrency(data.estimativa!.med, true)}</p>
              </div>
              
              <div className="text-center p-2 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-green-600" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Máximo</p>
                <p className="font-bold text-sm sm:text-lg text-green-700">{formatCurrency(data.estimativa!.max, true)}</p>
              </div>
            </div>

            {/* Market Reference */}
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-2">
              <h4 className="text-xs sm:text-sm font-medium text-center">Referência de Mercado (R$/m²)</h4>
              <div className="grid grid-cols-3 gap-1 text-center text-xs sm:text-sm">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Mín</p>
                  <p className="font-medium text-[11px] sm:text-sm">{formatCurrency(data.itbiData!.min_m2, true)}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Méd</p>
                  <p className="font-medium text-[11px] sm:text-sm">{formatCurrency(data.itbiData!.med_m2, true)}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Máx</p>
                  <p className="font-medium text-[11px] sm:text-sm">{formatCurrency(data.itbiData!.max_m2, true)}</p>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-1 sm:pt-2">
                Baseado em {data.itbiData!.transaction_count} transações dos últimos 12 meses
              </p>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Aviso:</strong> Esta é uma estimativa automática baseada em dados históricos de transações oficiais 
            e em regras estatísticas. Para ter certeza do valor real, você precisa de uma análise técnica completa.
          </div>
        </CardContent>
      </Card>

      {/* Seção Completa de Avaliação com Perito */}
      <Card className="border-border shadow-lg">
        <CardContent className="py-6">
          <PeritEvaluationSection />
        </CardContent>
      </Card>

      {/* Tabela Comparativa */}
      <Card className="border-border">
        <CardContent className="py-6">
          <ComparisonTable />
        </CardContent>
      </Card>

      {/* CTA para Parecer Técnico */}
      {parecerRequested ? (
        <Card className="border-green-500/30 bg-green-50">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800">
                Solicitação de Parecer Técnico Enviada!
              </h3>
              <p className="text-green-700">
                Obrigado, <strong>{data.leadName}</strong>! Nossa equipe entrará em contato em breve 
                para iniciar a proteção do seu patrimônio.
              </p>
              <p className="text-sm text-green-600">
                Também abrimos o WhatsApp para você enviar uma mensagem direta.
              </p>
              <Button onClick={onNewValuation} variant="outline" className="mt-4">
                Fazer Nova Consulta de Valor
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/30 bg-gradient-to-b from-accent/5 to-transparent">
          <CardContent className="py-8">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-bold">
                  🏆 Próximo Passo: Validação Técnica Completa
                </h3>
                <p className="text-muted-foreground mt-2">
                  Proteja seu patrimônio com o <strong>Parecer Técnico Godoy Prime</strong>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleRequestParecer}
                  disabled={isRequesting}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  size="lg"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {isRequesting ? "Enviando..." : "Solicitar Parecer Técnico"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open("tel:+552140400067", "_self")}
                  size="lg"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Ligar: (21) 4040-0067
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Ao solicitar, você será redirecionado para o WhatsApp de Marcus Godoy
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Nova Avaliação */}
      {!parecerRequested && (
        <div className="text-center">
          <Button variant="ghost" onClick={onNewValuation} className="text-muted-foreground">
            ← Voltar e fazer nova consulta
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Página Principal

### ARQUIVO: `src/pages/AvaliacaoPublica.tsx`

```typescript
import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm, QuickValuationData } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { PublicSofiaAssistant } from "@/components/leads/PublicSofiaAssistant";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  Eye,
  Calculator,
  Target,
  Users,
  Home,
  DollarSign,
  BarChart3,
  FileSearch,
  Clock,
  Building2,
  ChevronDown
} from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-symbol.png";
import heroBackground from "@/assets/hero-barra-luxury.jpg";

type Step = "form" | "result";

// Stats for hero
const HERO_STATS = [
  { value: "80.000+", label: "Transações Oficiais", icon: FileSearch },
  { value: "5 Anos", label: "De Dados Históricos", icon: Clock },
  { value: "142", label: "Bairros do Rio", icon: Building2 },
];

// Problems section data
const PROBLEMS = [
  {
    icon: Eye,
    title: "Anúncios inflacionados",
    description: "Preços de anúncios não refletem o valor real de venda. Vendedores pedem mais, compradores oferecem menos.",
  },
  {
    icon: Calculator,
    title: "Algoritmos genéricos",
    description: "Ferramentas online usam fórmulas simplistas que ignoram os diferenciais únicos de cada imóvel.",
  },
  {
    icon: Target,
    title: "Falta de dados oficiais",
    description: "Sem acesso a transações reais, você negocia no escuro e pode perder dinheiro.",
  },
];

// Solutions section data
const SOLUTIONS = [
  {
    icon: Shield,
    title: "Dados Oficiais",
    description: "Usamos transações reais registradas na Prefeitura do RJ, não apenas preços de anúncios.",
    highlight: "Fonte governamental confiável",
  },
  {
    icon: Award,
    title: "Especialistas em Alto Padrão",
    description: "Foco exclusivo em Barra da Tijuca e bairros nobres do Rio com metodologia específica.",
    highlight: "Conhecimento local profundo",
  },
  {
    icon: BarChart3,
    title: "Metodologia Transparente",
    description: "Você vê exatamente como calculamos: base de dados, filtros aplicados e período analisado.",
    highlight: "Sem caixas-pretas",
  },
];

// Audience personas
const PERSONAS = [
  {
    icon: Home,
    title: "Proprietários",
    subtitle: "Quer vender pelo melhor preço?",
    description: "Descubra o valor real do seu imóvel baseado em transações oficiais e negocie com segurança.",
    cta: "Posicione seu imóvel com preço correto e evite perder meses tentando vender sem sucesso.",
  },
  {
    icon: Users,
    title: "Compradores",
    subtitle: "Quer negociar com confiança?",
    description: "Saiba se o preço pedido está dentro da realidade de mercado antes de fazer uma proposta.",
    cta: "Negocie com informações reais e pague o valor justo",
  },
  {
    icon: DollarSign,
    title: "Investidores",
    subtitle: "Quer identificar oportunidades?",
    description: "Compare valores por região e tipologia para encontrar as melhores oportunidades de investimento.",
    cta: "Tome decisões com dados reais",
  },
];

// SEO meta tags
const SEO_CONFIG = {
  title: "Avaliação Imobiliária Gratuita | Descubra o Valor Real do Seu Imóvel | Godoy Prime",
  description: "Descubra o valor real do seu imóvel na Barra da Tijuca em 30 segundos. Avaliação baseada em +80.000 transações oficiais da Prefeitura do RJ. Gratuito e sem compromisso.",
  keywords: "avaliação imóvel gratuita, valor imóvel Barra da Tijuca, preço m2 Rio de Janeiro, quanto vale meu apartamento, transações oficiais, avaliação online, valor real imóvel",
  canonical: "https://avaliacao.godoyprime.com.br",
  ogImage: "https://avaliacao.godoyprime.com.br/og-image.jpg",
};

export default function AvaliacaoPublica() {
  const [step, setStep] = useState<Step>("form");
  const [valuationData, setValuationData] = useState<QuickValuationData | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  const { utmParams, hasUTM } = useUTMTracking();

  const handleQuickValuationComplete = (data: QuickValuationData) => {
    setValuationData(data);
    setStep("result");
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleNewValuation = () => {
    setValuationData(null);
    setStep("form");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Helmet>
        <title>{SEO_CONFIG.title}</title>
        <meta name="title" content={SEO_CONFIG.title} />
        <meta name="description" content={SEO_CONFIG.description} />
        <meta name="keywords" content={SEO_CONFIG.keywords} />
        <link rel="canonical" href={SEO_CONFIG.canonical} />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SEO_CONFIG.canonical} />
        <meta property="og:title" content={SEO_CONFIG.title} />
        <meta property="og:description" content={SEO_CONFIG.description} />
        <meta property="og:image" content={SEO_CONFIG.ogImage} />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="Godoy Prime Realty" />
        
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={SEO_CONFIG.canonical} />
        <meta property="twitter:title" content={SEO_CONFIG.title} />
        <meta property="twitter:description" content={SEO_CONFIG.description} />
        <meta property="twitter:image" content={SEO_CONFIG.ogImage} />
        
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Godoy Prime Realty" />
        <meta name="geo.region" content="BR-RJ" />
        <meta name="geo.placename" content="Rio de Janeiro" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            "name": "Godoy Prime Realty",
            "description": "Avaliação imobiliária premium baseada em dados oficiais",
            "url": SEO_CONFIG.canonical,
            "logo": "https://avaliacao.godoyprime.com.br/godoy-logo.png",
            "telephone": "+55-21-96407-5124",
            "email": "contato@godoyprime.com.br",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Rio de Janeiro",
              "addressRegion": "RJ",
              "addressCountry": "BR"
            },
            "areaServed": {
              "@type": "City",
              "name": "Rio de Janeiro"
            },
            "priceRange": "$$$$",
            "sameAs": [
              "https://www.instagram.com/godoyprime"
            ]
          })}
        </script>
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Avaliação Imobiliária Gratuita",
            "description": "Descubra o valor real do seu imóvel baseado em +80.000 transações oficiais",
            "provider": {
              "@type": "RealEstateAgent",
              "name": "Godoy Prime Realty"
            },
            "areaServed": {
              "@type": "City",
              "name": "Rio de Janeiro"
            },
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "BRL"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* HERO SECTION */}
        <section className="relative text-white overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBackground})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0C2340]/95 via-[#0C2340]/90 to-[#1a3a5c]/85" />
          
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl" />
          </div>

          <header className="relative z-10 container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={godoyLogo} alt="Godoy Prime" className="h-10 md:h-12 w-auto drop-shadow-lg" />
              <div className="hidden sm:block">
                <h1 className="font-semibold text-base md:text-lg tracking-tight">Godoy Prime Realty</h1>
                <p className="text-xs text-[#D4AF37] font-medium">Avaliação Imobiliária Premium</p>
              </div>
            </div>
            <Button 
              onClick={scrollToForm}
              className="bg-[#D4AF37] hover:bg-[#c9a432] text-[#0C2340] font-semibold shadow-lg"
              size="sm"
            >
              Consultar Valor
            </Button>
          </header>

          <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium animate-fade-in">
                <Shield className="h-4 w-4 text-[#D4AF37]" />
                Transações Oficiais da Prefeitura do Rio de Janeiro
              </div>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight animate-fade-in [animation-delay:150ms]">
                Negocie com Confiança:
                <br />
                <span className="text-[#D4AF37]">Descubra o Valor Real</span>
                <br className="hidden md:block" />
                {" "}de Qualquer Imóvel
              </h2>

              <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto animate-fade-in [animation-delay:300ms]">
                Avaliação baseada em transações reais de compra e venda, 
                não em preços de anúncios inflacionados.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in [animation-delay:450ms]">
                <Button 
                  onClick={scrollToForm}
                  size="lg"
                  className="bg-[#D4AF37] hover:bg-[#c9a432] text-[#0C2340] font-bold shadow-xl hover:shadow-2xl transition-all duration-300 text-base px-8"
                >
                  Descobrir Valor Real Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 md:gap-8 pt-8 border-t border-white/10 mt-8 animate-fade-in [animation-delay:600ms]">
                {HERO_STATS.map((stat, index) => (
                  <div key={index} className="text-center">
                    <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-xl md:text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs md:text-sm text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
              <ChevronDown className="h-6 w-6 text-white/40" />
            </div>
          </div>
        </section>

        {/* PROBLEM SECTION */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-4">
                O PROBLEMA
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                Por Que Você Está Negociando no Escuro?
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A diferença entre o preço pedido e o valor real pode chegar a <strong className="text-[#D4AF37]">R$ 200.000</strong> ou mais.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PROBLEMS.map((problem, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-[#D4AF37]/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                    <problem.icon className="h-6 w-6 text-destructive" />
                  </div>
                  <h4 className="font-bold text-lg text-[#0C2340] mb-2">{problem.title}</h4>
                  <p className="text-muted-foreground text-sm">{problem.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOLUTION SECTION */}
        <section className="py-16 md:py-20 px-4 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-sm font-semibold mb-4">
                A SOLUÇÃO
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                A Solução Que Muda Tudo
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Avaliação baseada em dados reais da Prefeitura, não em achismos ou algoritmos genéricos.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {SOLUTIONS.map((solution, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-6 border-2 border-[#D4AF37]/20 hover:border-[#D4AF37]/50 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center mb-4">
                    <solution.icon className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-bold text-lg text-[#0C2340] mb-2">{solution.title}</h4>
                  <p className="text-muted-foreground text-sm mb-4">{solution.description}</p>
                  <div className="flex items-center gap-2 text-xs bg-[#D4AF37]/10 text-[#0C2340] rounded-lg px-3 py-2">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37]" />
                    {solution.highlight}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                <TrendingUp className="inline h-4 w-4 text-[#D4AF37] mr-1" />
                Usado por corretores e investidores premium da Barra da Tijuca
              </p>
            </div>
          </div>
        </section>

        {/* PERSONAS SECTION */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0C2340]/10 text-[#0C2340] text-sm font-semibold mb-4">
                PARA QUEM É
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                Para Quem É Esta Avaliação?
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PERSONAS.map((persona, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-[#D4AF37]/30 hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0C2340] to-[#1a3a5c] flex items-center justify-center mx-auto mb-4">
                    <persona.icon className="h-8 w-8 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-bold text-xl text-[#0C2340] mb-1">{persona.title}</h4>
                  <p className="text-[#D4AF37] font-medium text-sm mb-3">{persona.subtitle}</p>
                  <p className="text-muted-foreground text-sm mb-4">{persona.description}</p>
                  <div className="inline-flex items-center gap-2 text-xs bg-[#D4AF37]/10 text-[#0C2340] rounded-full px-4 py-2 font-medium">
                    <CheckCircle className="h-3.5 w-3.5 text-[#D4AF37]" />
                    {persona.cta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-[#D4AF37] to-[#c9a432]">
          <div className="container mx-auto max-w-3xl text-center">
            <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
              Pronto para Descobrir o Valor Real?
            </h3>
            <p className="text-[#0C2340]/80 text-lg mb-8">
              Comece agora – leva apenas 30 segundos.
            </p>
            <Button 
              onClick={scrollToForm}
              size="lg"
              className="bg-[#0C2340] hover:bg-[#0a1d33] text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 text-base px-10"
            >
              Consultar Valor Real
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* FORM SECTION */}
        <section ref={formRef} className="py-16 md:py-20 px-4 bg-gray-50 scroll-mt-4">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 rounded-full bg-[#0C2340]/10 text-[#0C2340] text-sm font-semibold mb-4">
                AVALIAÇÃO PRELIMINAR
              </span>
              <h3 className="text-2xl md:text-4xl font-bold text-[#0C2340] mb-4">
                Consulte o Valor Real
              </h3>
              <p className="text-muted-foreground">
                Resultado instantâneo baseado em transações reais • Sem compromisso
              </p>
            </div>

            {step === "form" && (
              <div className="space-y-6">
                <QuickValuationForm onComplete={handleQuickValuationComplete} />

                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4 text-[#D4AF37]" />
                    Dados da Prefeitura RJ
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-[#D4AF37]" />
                    Sem compromisso
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4 text-[#D4AF37]" />
                    Resultado em 30 segundos
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Aviso:</strong> Esta é uma estimativa automática baseada em dados 
                      históricos de transações oficiais. Não substitui um laudo técnico assinado por perito avaliador.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RESULT SECTION */}
        {step === "result" && valuationData && (
          <section ref={resultRef} className="py-12 px-4 bg-gradient-to-b from-gray-50 to-white scroll-mt-4">
            <div className="container mx-auto max-w-3xl">
              <QuickValuationResult
                data={valuationData}
                onNewValuation={handleNewValuation}
              />
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="py-12 px-4 bg-[#0C2340]">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                  <img src={godoyLogo} alt="Godoy Prime" className="h-10 w-auto" />
                  <div>
                    <h4 className="font-semibold text-white">Godoy Prime Realty</h4>
                    <p className="text-xs text-[#D4AF37]">CRECI 11841-PJ</p>
                  </div>
                </div>
                <p className="text-white/60 text-sm max-w-md">
                  Especialistas em imóveis de alto padrão na Barra da Tijuca. 
                  Avaliações baseadas em dados oficiais da Prefeitura do Rio de Janeiro.
                </p>
              </div>

              <div className="text-center md:text-right">
                <p className="text-white/80 text-sm mb-2">
                  Av. das Américas, 10101 - Bloco 2, Sala 316
                </p>
                <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-2 sm:gap-4 text-sm">
                  <a href="tel:+552140400067" className="text-white/80 hover:text-[#D4AF37] transition-colors">
                    📞 (21) 4040-0067
                  </a>
                  <a href="https://wa.me/5521964075124" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-[#D4AF37] transition-colors">
                    💬 (21) 96407-5124
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-white/40 text-xs">
                © {new Date().getFullYear()} Godoy Prime Realty. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/politica-privacidade" className="text-white/40 text-xs hover:text-[#D4AF37] transition-colors">
                  Política de Privacidade
                </Link>
                <span className="text-white/20">|</span>
                <span className="text-white/40 text-xs">
                  Desenvolvido por Godoy Prime Realty
                </span>
              </div>
            </div>
          </div>
        </footer>

        {/* Sofia Assistant */}
        <PublicSofiaAssistant />

        {/* WhatsApp Button */}
        <a
          href="https://wa.me/5521964075124?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20avalia%C3%A7%C3%A3o%20de%20im%C3%B3veis."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5C] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in group"
          aria-label="Contato via WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="font-medium text-sm hidden sm:inline group-hover:inline">Fale Conosco</span>
        </a>
      </div>
    </>
  );
}
```

---

## Funções Utilitárias

Adicione estas funções ao `src/lib/utils.ts` se não existirem:

```typescript
// Adicionar ao src/lib/utils.ts

export function normalizeStreetSearchTerm(term: string): string {
  return term.trim().toUpperCase();
}

export function normalizeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
```

---

## Assets Necessários

Copie os seguintes arquivos de imagem para `src/assets/`:

1. `hero-barra-luxury.jpg` - Imagem de fundo do hero
2. `marcus-godoy.jpg` - Foto do Marcus Godoy
3. `godoy-logo-symbol.png` - Logo símbolo
4. `sofia-avatar.png` - Avatar da Sofia (para o assistente)

---

## Configuração de Rota

Adicione a rota no seu arquivo de rotas (`App.tsx` ou `routes.tsx`):

```typescript
import AvaliacaoPublica from "@/pages/AvaliacaoPublica";

// Na configuração de rotas:
<Route path="/avaliacao-publica" element={<AvaliacaoPublica />} />
```

---

## Passos de Transferência

### Ordem Recomendada

1. **Verificar dependências** - Instalar pacotes necessários
2. **Copiar hooks** - `useUTMTracking`, `useWebSpeech`, `useOfficialStreetSuggestions`
3. **Adicionar funções utils** - `normalizeStreetSearchTerm`, `normalizeAccents`
4. **Copiar componentes de leads** - Na ordem do índice
5. **Copiar página principal** - `AvaliacaoPublica.tsx`
6. **Copiar assets** - Imagens necessárias
7. **Configurar rota** - Adicionar no App.tsx
8. **Testar** - Acessar `/avaliacao-publica`

### Verificação Pós-Transferência

- [ ] Autocomplete de ruas/condomínios funciona
- [ ] Formulário de lead captura dados corretamente
- [ ] Resultado exibe valores de ITBI
- [ ] Seções de Parecer e Tabela Comparativa aparecem
- [ ] CTAs de WhatsApp e telefone funcionam
- [ ] SEO tags estão corretas (verificar código fonte)
- [ ] Sofia Assistant funciona (se configurado)

---

## Observações Importantes

1. **Supabase Client**: O arquivo `@/integrations/supabase/client` deve existir na aplicação destino
2. **Edge Functions**: As seguintes funções devem estar disponíveis:
   - `geo-logradouro`
   - `public-itbi-stats`
   - `lead-operations`
   - `send-lead-notification`
3. **Tabelas de Banco**: As tabelas `leads`, `itbi_transactions`, `condominios_mapeamento` devem existir
4. **Estilos**: Certifique-se que as cores `accent`, `primary`, etc. estão configuradas no Tailwind

---

*Documento gerado automaticamente em Janeiro 2026*
