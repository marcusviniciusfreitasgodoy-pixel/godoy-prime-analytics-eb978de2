import { expandLogradouroSearchTerms } from "@/lib/logradouroSearch";
import { describe, it, expect } from "vitest";
const need = ["AVN GAL OLYNTHO PILLAR","AV GAL OLYNTHO PILLAR","AVENIDA GENERAL OLINTO PILAR","AV GEN OLYNTO PILLAR","AVN GENERAL OLINTHO PILAR","AV GEN OLINTHO PILAR","AVN GEN OLINTO PILLAR"];
describe("variants", () => {
  for (const input of ["Avenida General Olyntho Pilar 355","AVN GAL OLYNTHO PILLAR","av gen olinto pilar"]) {
    it(input, () => {
      const t = expandLogradouroSearchTerms(input).map(s=>s.toUpperCase());
      const missing = need.filter(n=>!t.includes(n));
      expect({input, missing, count:t.length}).toEqual({input, missing:[], count:t.length});
    });
  }
});
