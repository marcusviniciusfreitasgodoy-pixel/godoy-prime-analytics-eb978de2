import { LucideIcon, Building2, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPIBreakdown {
  apt?: string | number;
  casa?: string | number;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  breakdown?: KPIBreakdown;
}

export function KPICard({ title, value, subtitle, change, icon: Icon, trend, breakdown }: KPICardProps) {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="hover:shadow-xl transition-all duration-300 hover:border-accent/50 bg-gradient-to-br from-card to-card/80">
      <CardContent className="p-2 sm:p-5">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{title}</p>
            <p className="text-xl sm:text-3xl font-bold text-foreground truncate">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="bg-accent/15 p-1.5 sm:p-3 rounded-lg border border-accent/20 ml-2 flex-shrink-0">
            <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-accent" />
          </div>
        </div>
        {change && (
          <p className={`text-[10px] sm:text-sm font-medium ${trendColor} mb-1.5 sm:mb-2 truncate`}>
            {trend === "up" && "↑ "}{trend === "down" && "↓ "}{change}
          </p>
        )}
        {breakdown && (
          <div className="flex items-center gap-3 sm:gap-4 pt-1.5 sm:pt-2 border-t border-border/50">
            <div className="flex items-center gap-1 text-[10px] sm:text-sm">
              <Building2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Apt:</span>
              <span className="font-semibold text-foreground truncate">{breakdown.apt}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-sm">
              <Home className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Casa:</span>
              <span className="font-semibold text-foreground truncate">{breakdown.casa}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
