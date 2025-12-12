import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, TrendingUp, MapPin, DollarSign, BarChart3, Home, Ruler, Paperclip, FileText, Image, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBairro } from "@/contexts/BairroContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import sofiaAvatar from "@/assets/sofia-avatar.png";
import { useWebSpeech } from "@/hooks/useWebSpeech";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: {
    type: 'document' | 'image';
    name: string;
    analyzing?: boolean;
  };
}

const SUGGESTED_QUESTIONS = [
  { icon: Home, text: "Qual o preço médio no condomínio Riserva Golf?" },
  { icon: MapPin, text: "Qual o preço médio na Avenida Lúcio Costa?" },
  { icon: Ruler, text: "Apartamentos acima de 200m² na Barra em 2025?" },
  { icon: DollarSign, text: "Casas acima de R$ 5 milhões vendidas em 2024?" },
  { icon: TrendingUp, text: "Compare Riserva com Península" },
  { icon: BarChart3, text: "Top 5 bairros mais valorizados do Rio" },
];

export function MarketAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedBairro } = useBairro();
  const { user } = useAuthContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Web Speech API integration - only STT (Speech-to-Text)
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSTTSupported,
  } = useWebSpeech({ lang: 'pt-BR' });

  // Get user's first name from metadata or email
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 
                   null;

  // Auto-scroll helper function - uses viewport ref directly
  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    
    if (viewport) {
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        const targetScroll = viewport.scrollHeight - viewport.clientHeight;
        viewport.scrollTop = targetScroll;
      }, 100);
    }
  }, []);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-mercado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          bairro: selectedBairro,
          voiceInput: false, // Always text response now
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Resposta vazia do servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message to stream into
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content = assistantContent;
                }
                return updated;
              });
              // Auto-scroll as text streams in
              scrollToBottom();
            }
          } catch {
            // Incomplete JSON, put back and wait
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Desculpe, ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Tente novamente.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  // Handle voice input
  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Send transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript) {
      sendMessage(transcript);
    }
  }, [isListening, transcript]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use PDF, JPG, PNG ou WebP.");
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploadingFile(true);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Add user message with attachment
      const userMessage: Message = {
        role: 'user',
        content: `Analise este documento: ${file.name}`,
        attachment: {
          type: file.type.startsWith('image/') ? 'image' : 'document',
          name: file.name,
          analyzing: true
        }
      };
      setMessages(prev => [...prev, userMessage]);

      // Call analyze-document function
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          image: base64,
          mimeType: file.type,
          filename: file.name
        }
      });

      if (error) throw error;

      // Format analysis result as assistant message
      let analysisText = `📄 **Análise de ${file.name}**\n\n`;
      
      if (data.tipo_documento) {
        analysisText += `**Tipo:** ${data.tipo_documento}\n`;
      }
      
      if (data.dados_extraidos && Object.keys(data.dados_extraidos).length > 0) {
        analysisText += `\n**Dados Extraídos:**\n`;
        for (const [key, value] of Object.entries(data.dados_extraidos)) {
          analysisText += `• ${key}: ${value}\n`;
        }
      }
      
      if (data.alertas && data.alertas.length > 0) {
        analysisText += `\n⚠️ **Alertas:**\n`;
        data.alertas.forEach((alert: string) => {
          analysisText += `• ${alert}\n`;
        });
      }
      
      if (data.status) {
        const statusEmoji = data.status === 'OK' ? '✅' : data.status === 'Atenção' ? '⚠️' : '🔴';
        analysisText += `\n**Status:** ${statusEmoji} ${data.status}\n`;
      }
      
      if (data.proximos_passos && data.proximos_passos.length > 0) {
        analysisText += `\n📋 **Próximos Passos:**\n`;
        data.proximos_passos.forEach((step: string) => {
          analysisText += `• ${step}\n`;
        });
      }

      setMessages(prev => [...prev, { role: 'assistant', content: analysisText }]);

    } catch (error) {
      console.error('Document analysis error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Desculpe, não consegui analisar o documento. ${error instanceof Error ? error.message : 'Tente novamente.'}` 
      }]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg p-0 overflow-hidden",
          "bg-accent hover:bg-accent/90",
          "transition-all duration-300 hover:scale-110",
          isOpen && "scale-0 opacity-0"
        )}
        size="icon"
      >
        <img src={sofiaAvatar} alt="Sofia" className="w-full h-full object-cover" />
      </Button>

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
          "bg-background border border-border rounded-xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out",
          isOpen ? "h-[600px] max-h-[80vh] opacity-100 scale-100" : "h-0 opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <img src={sofiaAvatar} alt="Sofia" className="h-10 w-10 rounded-full border-2 border-primary-foreground/20" />
            <div>
              <h3 className="font-semibold text-sm">Sofia</h3>
              <p className="text-xs opacity-80">Assistente de Mercado</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef} viewportRef={viewportRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <img src={sofiaAvatar} alt="Sofia" className="w-20 h-20 mx-auto mb-3 rounded-full border-4 border-accent/20" />
                <h4 className="font-semibold text-foreground text-lg">
                  {userName ? `Olá, ${userName}! 👋` : 'Olá! 👋'}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Eu sou a Sofia, sua assistente de mercado imobiliário.
                </p>
              </div>
              
              <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground space-y-2">
                <p className="font-medium">Como posso te ajudar:</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>📊 Consultar preços por m² de qualquer bairro ou rua</li>
                  <li>🏢 Buscar dados de condomínios específicos</li>
                  <li>📈 Comparar valorização entre regiões</li>
                  <li>🏠 Filtrar por casas, apartamentos, área e valor</li>
                  <li>📍 Analisar os 142 bairros do Rio</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Experimente perguntar:</p>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(q.text)}
                    className="w-full flex items-center gap-2 p-3 text-left text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <q.icon className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-foreground">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <img src={sofiaAvatar} alt="Sofia" className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {msg.content ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : isLoading && i === messages.length - 1 ? (
                      <div className="flex items-center gap-1 py-1">
                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 justify-start">
                  <img src={sofiaAvatar} alt="Sofia" className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1 py-1">
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadingFile || isListening}
              title="Enviar documento para análise"
            >
              {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            
            {/* Voice Input Button */}
            {isSTTSupported && (
              <Button 
                type="button" 
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={handleVoiceInput}
                disabled={isLoading || uploadingFile}
                title={isListening ? "Parar gravação" : "Falar com Sofia"}
                className={cn(isListening && "animate-pulse")}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}

            <Input
              ref={inputRef}
              value={isListening ? transcript : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Ouvindo..." : "Pergunte sobre o mercado..."}
              disabled={isLoading || uploadingFile || isListening}
              className="flex-1 bg-background"
            />

            <Button type="submit" size="icon" disabled={isLoading || uploadingFile || isListening || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {isSTTSupported ? "🎤 Fale ou ⌨️ digite sua pergunta" : "📎 Envie PDFs ou imagens para análise"}
          </p>
        </form>
      </div>
    </>
  );
}
