import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
}

export function KPICard({ title, value, change, icon: Icon, trend }: KPICardProps) {
  return (
    <Card className="hover:shadow-xl transition-all duration-300 hover:border-accent/50 bg-gradient-to-br from-card to-card/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-4xl font-bold text-primary">{value}</p>
            {change && (
              <p className={`text-sm font-semibold flex items-center gap-1 ${
                trend === "up" ? "text-success" : "text-destructive"
              }`}>
                {change}
              </p>
            )}
          </div>
          <div className="bg-accent/20 p-4 rounded-xl border border-accent/30">
            <Icon className="h-7 w-7 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
