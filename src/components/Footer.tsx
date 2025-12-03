import { MapPin, Phone } from "lucide-react";
import logoSymbol from "@/assets/godoy-logo-symbol.png";

export function Footer() {
  return (
    <footer className="bg-primary border-t border-border mt-auto">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          {/* Logo and brand */}
          <div className="flex items-center gap-3">
            <img 
              src={logoSymbol} 
              alt="Godoy Prime Realty" 
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <div className="border-l border-accent/30 pl-3">
              <h3 className="font-bold text-sm sm:text-base text-primary-foreground tracking-wider">GODOY PRIME</h3>
              <p className="text-[10px] sm:text-xs text-accent font-semibold tracking-wide">REALTY</p>
            </div>
          </div>

          {/* Contact info */}
          <div className="flex flex-col items-center sm:items-end gap-2 text-primary-foreground/80">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
              <span>Av. das Américas, 10101 Bloco 2 Sala 316</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Phone className="h-3.5 w-3.5 text-accent flex-shrink-0" />
              <span>(21) 4040-0067</span>
              <span className="text-accent">|</span>
              <span>(21) 99725-0515</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-accent/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs text-primary-foreground/60">
          <p>© 2025 GODOY PRIME REALTY. Todos os direitos reservados. CRECI 11841 - PJ.</p>
          <p>
            Desenvolvido por{" "}
            <a 
              href="https://lovable.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium"
            >
              Lovable
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
