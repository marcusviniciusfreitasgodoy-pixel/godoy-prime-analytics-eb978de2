import { useMemo } from "react";

export interface PasswordCriterion {
  key: string;
  label: string;
  met: boolean;
}

export type PasswordStrength = "fraca" | "media" | "forte";

export function usePasswordValidation(password: string) {
  const criteria: PasswordCriterion[] = useMemo(() => [
    { key: "length", label: "Mínimo de 8 caracteres", met: password.length >= 8 },
    { key: "uppercase", label: "Pelo menos 1 letra maiúscula", met: /[A-Z]/.test(password) },
    { key: "lowercase", label: "Pelo menos 1 letra minúscula", met: /[a-z]/.test(password) },
    { key: "number", label: "Pelo menos 1 número", met: /[0-9]/.test(password) },
    { key: "special", label: "Pelo menos 1 caractere especial (!@#$%...)", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const metCount = criteria.filter((c) => c.met).length;
  const allMet = metCount === criteria.length;

  const strength: PasswordStrength = useMemo(() => {
    if (metCount <= 2) return "fraca";
    if (metCount <= 4) return "media";
    return "forte";
  }, [metCount]);

  const score = Math.round((metCount / criteria.length) * 100);

  return { criteria, allMet, strength, score };
}
