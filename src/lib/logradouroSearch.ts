import { normalizeAccents } from "@/lib/utils";

interface CondominioLogradouroInput {
  logradouro_padrao?: string | null;
  ruas_internas?: string[] | null;
  logradouro_itbi_normalizado?: string | null;
}

const STREET_TYPE_VARIANTS: Record<string, string[]> = {
  AVENIDA: ["AVENIDA", "AV", "AV.", "AVN"],
  AV: ["AVENIDA", "AV", "AV.", "AVN"],
  "AV.": ["AVENIDA", "AV", "AV.", "AVN"],
  AVN: ["AVENIDA", "AV", "AV.", "AVN"],
  RUA: ["RUA", "R", "R."],
  R: ["RUA", "R", "R."],
  "R.": ["RUA", "R", "R."],
  ESTRADA: ["ESTRADA", "EST", "EST."],
  EST: ["ESTRADA", "EST", "EST."],
  "EST.": ["ESTRADA", "EST", "EST."],
  TRAVESSA: ["TRAVESSA", "TV", "TV."],
  TV: ["TRAVESSA", "TV", "TV."],
  "TV.": ["TRAVESSA", "TV", "TV."],
  PRACA: ["PRACA", "PRAÇA", "PCA", "PC", "PÇ"],
  "PRAÇA": ["PRACA", "PRAÇA", "PCA", "PC", "PÇ"],
  PCA: ["PRACA", "PRAÇA", "PCA", "PC", "PÇ"],
  PC: ["PRACA", "PRAÇA", "PCA", "PC", "PÇ"],
  "PÇ": ["PRACA", "PRAÇA", "PCA", "PC", "PÇ"],
  ALAMEDA: ["ALAMEDA", "AL", "AL."],
  AL: ["ALAMEDA", "AL", "AL."],
  "AL.": ["ALAMEDA", "AL", "AL."],
};

const STREET_TYPE_REGEX = /^(AVENIDA|AVN|AV\.?|RUA|R\.?|ESTRADA|EST\.?|TRAVESSA|TV\.?|PRAÇA|PRACA|PÇ\.?|PC\.?|PCA|ALAMEDA|AL\.?)\s+(.+)$/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeTerm(value: string): string {
  return normalizeWhitespace(value).replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
}

function addTerm(collector: Set<string>, value?: string | null) {
  const sanitized = value ? sanitizeTerm(value) : "";
  if (sanitized.length >= 3) {
    collector.add(sanitized);
  }
}

export function expandLogradouroSearchTerms(logradouro: string): string[] {
  const terms = new Set<string>();
  const original = normalizeWhitespace(logradouro);

  addTerm(terms, original);
  addTerm(terms, normalizeAccents(original));

  const match = original.match(STREET_TYPE_REGEX);
  if (!match) {
    return Array.from(terms);
  }

  const [, rawPrefix, rawCore] = match;
  const coreOriginal = normalizeWhitespace(rawCore);
  const coreNormalized = normalizeAccents(coreOriginal);
  const prefixKey = normalizeAccents(rawPrefix).replace(/\./g, "").toUpperCase();
  const variants = STREET_TYPE_VARIANTS[prefixKey] ?? [rawPrefix.toUpperCase()];

  addTerm(terms, coreOriginal);
  addTerm(terms, coreNormalized);

  variants.forEach((variant) => {
    addTerm(terms, `${variant} ${coreOriginal}`);
    addTerm(terms, `${variant} ${coreNormalized}`);
  });

  return Array.from(terms);
}

export function buildCondominioSearchLogradouros(input: CondominioLogradouroInput): string[] {
  const seeds = [
    input.logradouro_padrao,
    input.logradouro_itbi_normalizado,
    ...(input.ruas_internas ?? []),
  ].filter((value): value is string => !!value);

  return Array.from(new Set(seeds.flatMap(expandLogradouroSearchTerms)));
}

export function buildLogradouroOrConditions(logradouros: string[]): string {
  return Array.from(new Set(logradouros.flatMap(expandLogradouroSearchTerms)))
    .map((logradouro) => `logradouro.ilike.%${sanitizeTerm(logradouro)}%`)
    .join(",");
}