import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, HelpCircle, FileCheck, DollarSign, Shield, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import sofiaAvatar from "@/assets/sofia-avatar.png";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  { icon: HelpCircle, text: "O que é o Personal Shopper Imobiliário?" },
  { icon: FileCheck, text: "Como funciona a avaliação completa com vistoria?" },
  { icon: DollarSign, text: "Quanto custa o Parecer Godoy Prime?" },
  { icon: Shield, text: "Quais as garantias oferecidas?" },
  { icon: Clock, text: "Qual o prazo de entrega do parecer?" },
];

export function PublicSofiaAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      setTimeout(() => {
        viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
      }, 100);
    }
  }, []);

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
          bairro: 'BARRA DA TIJUCA',
          voiceInput: false,
          publicMode: true, // Flag to focus on service info
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

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

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
              scrollToBottom();
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Desculpe, ocorreu um erro. Por favor, entre em contato pelo WhatsApp (21) 96407-5124 para mais informações.` 
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

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <>
      {/* Floating Button - positioned above WhatsApp */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-6 z-40 h-14 w-14 rounded-full shadow-lg p-0 overflow-hidden",
          "bg-[#D4AF37] hover:bg-[#c9a432]",
          "transition-all duration-300 hover:scale-110",
          "animate-fade-in",
          isOpen && "scale-0 opacity-0"
        )}
        size="icon"
        title="Dúvidas? Fale com Sofia"
      >
        <img src={sofiaAvatar} alt="Sofia" className="w-full h-full object-cover" />
      </Button>

      {/* Label tooltip */}
      {!isOpen && (
        <div className="fixed bottom-[6.5rem] right-[5.5rem] z-40 bg-[#0C2340] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg animate-fade-in hidden sm:block">
          Dúvidas? Pergunte à Sofia
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#0C2340]" />
        </div>
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]",
          "bg-white border border-gray-200 rounded-xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out",
          isOpen ? "h-[500px] max-h-[70vh] opacity-100 scale-100" : "h-0 opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-[#0C2340] text-white">
          <div className="flex items-center gap-3">
            <img src={sofiaAvatar} alt="Sofia" className="h-10 w-10 rounded-full border-2 border-[#D4AF37]" />
            <div>
              <h3 className="font-semibold text-sm">Sofia</h3>
              <p className="text-xs text-[#D4AF37]">Tire suas dúvidas</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef} viewportRef={viewportRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-3">
                <img src={sofiaAvatar} alt="Sofia" className="w-16 h-16 mx-auto mb-2 rounded-full border-4 border-[#D4AF37]/20" />
                <h4 className="font-semibold text-[#0C2340] text-base">
                  Olá! 👋
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Sou a Sofia, posso esclarecer suas dúvidas sobre nossos serviços.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Perguntas frequentes:</p>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(q.text)}
                    className="w-full flex items-center gap-2 p-2.5 text-left text-sm rounded-lg border border-gray-200 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-colors"
                  >
                    <q.icon className="h-4 w-4 text-[#D4AF37] shrink-0" />
                    <span className="text-[#0C2340] text-xs">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <img src={sofiaAvatar} alt="Sofia" className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? "bg-[#D4AF37] text-[#0C2340]"
                        : "bg-gray-100 text-gray-800"
                    )}
                  >
                    {msg.content ? (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                    ) : isLoading && i === messages.length - 1 ? (
                      <div className="flex items-center gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 justify-start">
                  <img src={sofiaAvatar} alt="Sofia" className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Reset button after conversation */}
              {messages.length > 0 && !isLoading && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#D4AF37] transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Nova conversa</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              disabled={isLoading}
              className="flex-1 text-sm h-9 bg-white"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0C2340]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
