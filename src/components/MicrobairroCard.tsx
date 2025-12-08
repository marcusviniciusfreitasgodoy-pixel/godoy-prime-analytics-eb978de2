import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Building2, Home, TrendingUp, MapPin } from "lucide-react";
import { extractSimplifiedCode } from "@/lib/utils";

interface MicrobairroCardProps {
  microbairro: string;
  valor_m2: number;
  total_transacoes: number;
  valor_m2_apt: number;
  valor_m2_casa: number;
  rank: number;
  trend: "high" | "stable";
  maxTransacoes: number;
  condominioNome?: string;
  isTechnicalCode?: boolean;
}

export function MicrobairroCard({
  microbairro,
  valor_m2,
  total_transacoes,
  valor_m2_apt,
  valor_m2_casa,
  rank,
  trend,
  maxTransacoes,
  condominioNome,
  isTechnicalCode,
}: MicrobairroCardProps) {
  const liquidezPercent = (total_transacoes / maxTransacoes) * 100;
  const isTopTier = rank <= 3;

  // Determinar nome de exibição
  const displayName = condominioNome 
    ? condominioNome 
    : isTechnicalCode 
      ? extractSimplifiedCode(microbairro)
      : microbairro;

  return (
    <Card className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <CardContent className="p-0">
        {/* Topo do Cartão */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
          <div className="flex items-start justify-between mb-2 sm:mb-3 gap-3">
            <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="text-2xl sm:text-3xl font-bold text-muted-foreground flex-shrink-0">#{rank}</span>
              <div className="min-w-0 flex-1">
                {/* Badge de condomínio para códigos técnicos */}
                {(isTechnicalCode || condominioNome) && (
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3 text-amber-600" />
                    <span className="text-[10px] sm:text-xs font-medium text-amber-700">
                      {condominioNome ? 'Condomínio' : 'Possível Condomínio'}
                    </span>
                  </div>
                )}
                <h3 
                  className="text-sm sm:text-lg lg:text-xl font-bold text-foreground leading-tight break-words line-clamp-2 sm:line-clamp-none"
                  title={microbairro}
                >
                  {displayName}
                </h3>
                {isTopTier ? (
                  <Badge className="mt-1 text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-700 border-emerald-300">
                    Alta Valorização
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mt-1 text-[10px] sm:text-xs">
                    Mercado Estável
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Preço Médio</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                R$ {valor_m2.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Liquidez */}
        <div className="p-4 sm:p-6 py-3 sm:py-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-foreground">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              <span>Liquidez</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-primary">{total_transacoes} vendas</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${liquidezPercent}%` }}
            />
          </div>
        </div>

        {/* Comparativo Tipologia */}
        <div className="p-4 sm:p-6 pt-3 sm:pt-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  Apartamento
                </span>
              </div>
              <p className="text-sm sm:text-base lg:text-lg font-bold text-foreground">
                R$ {valor_m2_apt.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 sm:p-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">
                  Casa
                </span>
              </div>
              <p className="text-sm sm:text-base lg:text-lg font-bold text-foreground">
                R$ {valor_m2_casa.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-[#0C2340] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-white/80">Tendência (12m)</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
            <span className="text-xs sm:text-sm font-bold text-white">
              {trend === "high" ? "Alta Demanda" : "Estável"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
