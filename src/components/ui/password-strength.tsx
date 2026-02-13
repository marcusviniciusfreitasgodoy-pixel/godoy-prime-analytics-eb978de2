import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { PasswordCriterion, PasswordStrength } from "@/hooks/usePasswordValidation";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  criteria: PasswordCriterion[];
  strength: PasswordStrength;
  score: number;
  show: boolean;
}

const strengthConfig: Record<PasswordStrength, { label: string; className: string }> = {
  fraca: { label: "Fraca", className: "[&>div]:bg-destructive" },
  media: { label: "Média", className: "[&>div]:bg-yellow-500" },
  forte: { label: "Forte", className: "[&>div]:bg-green-500" },
};

export function PasswordStrengthIndicator({ criteria, strength, score, show }: PasswordStrengthIndicatorProps) {
  if (!show) return null;

  const config = strengthConfig[strength];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Força da senha</span>
        <span className={cn("font-medium", {
          "text-destructive": strength === "fraca",
          "text-yellow-600": strength === "media",
          "text-green-600": strength === "forte",
        })}>{config.label}</span>
      </div>
      <Progress value={score} className={cn("h-2", config.className)} />
      <ul className="space-y-1">
        {criteria.map((c) => (
          <li key={c.key} className="flex items-center gap-1.5 text-xs">
            {c.met ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className={c.met ? "text-green-600" : "text-muted-foreground"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
