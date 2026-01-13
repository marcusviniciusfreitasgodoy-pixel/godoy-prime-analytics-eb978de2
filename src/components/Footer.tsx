import { MapPin, Phone, MessageCircle } from "lucide-react";
import logoSymbol from "@/assets/godoy-logo-symbol.png";
import { Button } from "@/components/ui/button";

export function Footer() {
  const whatsappNumber = "5521964075124";
  const whatsappMessage = encodeURIComponent("Olá! Gostaria de mais informações sobre avaliação de imóveis.");

  return (
    <footer className="bg-primary border-t border-border mt-auto">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-8 py-4 sm:py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Logo and brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={logoSymbol} 
              alt="Godoy Prime Realty" 
              className="h-8 sm:h-12 w-auto object-contain"
            />
            <div className="border-l border-accent/30 pl-2 sm:pl-3">
              <h3 className="font-bold text-xs sm:text-base text-primary-foreground tracking-wider">GODOY PRIME</h3>
              <p className="text-[8px] sm:text-xs text-accent font-semibold tracking-wide">REALTY</p>
            </div>
          </div>

          {/* Contact info */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-primary-foreground/80">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-center">
              <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-accent flex-shrink-0" />
              <span>Av. das Américas, 10101 - Bloco 2, Sala 316</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
              <Phone className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-accent flex-shrink-0" />
              <span>(21) 4040-0067</span>
              <span className="text-accent">|</span>
              <span>(21) 96407-5124</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
              <MessageCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-green-500 flex-shrink-0" />
              <span>WhatsApp: (21) 96407-5124</span>
            </div>
          </div>

          {/* WhatsApp Button */}
          <Button
            asChild
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
            size="sm"
          >
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              Fale pelo WhatsApp
            </a>
          </Button>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-accent/20 flex flex-col items-center gap-2 sm:gap-3 text-[9px] sm:text-xs text-primary-foreground/60 text-center">
          <p>© 2025 GODOY PRIME REALTY. CRECI 11841 - PJ.</p>
          <p>
            Desenvolvido por{" "}
            <a 
              href="https://godoyprime.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium"
            >
              Godoy Prime Realty
            </a>
          </p>
          <div className="flex items-center gap-2 bg-primary-foreground/5 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] sm:text-[10px] text-primary-foreground/60 font-mono">
              Build: {typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
