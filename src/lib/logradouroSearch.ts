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

// Abreviaturas de patentes/titulos usadas pela base oficial (ITBI/Prefeitura)
const TITLE_VARIANT_GROUPS: string[][] = [
  ["GENERAL", "GAL", "GEN"],
  ["CORONEL", "CEL"],
  ["TENENTE", "TEN"],
  ["CAPITAO", "CAP"],
  ["MAJOR", "MAJ"],
  ["SARGENTO", "SGT"],
  ["ALMIRANTE", "ALM"],
  ["BRIGADEIRO", "BRIG"],
  ["MARECHAL", "MAL", "MAR"],
  ["PROFESSOR", "PROF"],
  ["PROFESSORA", "PROFA", "PROF"],
  ["DOUTOR", "DR"],
  ["DOUTORA", "DRA"],
  ["PRESIDENTE", "PRES"],
  ["PREFEITO", "PREF"],
  ["GOVERNADOR", "GOV"],
  ["SENADOR", "SEN"],
  ["DEPUTADO", "DEP"],
  ["VEREADOR", "VER"],
  ["MINISTRO", "MIN"],
  ["DESEMBARGADOR", "DES"],
  ["DESENHISTA", "DESEN"],
  ["EMBAIXADOR", "EMBAIX", "EMB"],
  ["ENGENHEIRO", "ENG"],
  ["MARQUES", "MARQ"],
  ["BARAO", "BAR"],
  ["VISCONDE", "VISC"],
  ["CONDE", "CDE"],
  ["COMENDADOR", "COMEND"],
  ["MONSENHOR", "MONS"],
  ["PADRE", "PE"],
  ["SANTO", "STO"],
  ["SANTA", "STA"],
  ["SAO", "S"],
  ["NOSSA SENHORA", "N SRA", "NSA SENHORA"],
];

const TITLE_VARIANTS: Record<string, string[]> = TITLE_VARIANT_GROUPS.reduce(
  (acc, group) => {
    group.forEach((item) => {
      acc[item] = Array.from(new Set([...(acc[item] ?? []), ...group]));
    });
    return acc;
  },
  {} as Record<string, string[]>
);

// Variantes de grafia de nomes proprios usadas pela base oficial (ITBI/Prefeitura)
const SPELLING_VARIANT_GROUPS: string[][] = [
  ["OLYNTHO", "OLINTO", "OLYNTO", "OLINTHO"],
  ["PILLAR", "PILAR"],
  ["ESTELLITA", "ESTELITA"],
  ["LUIZ", "LUIS"],
];

const SPELLING_VARIANTS: Record<string, string[]> = SPELLING_VARIANT_GROUPS.reduce(
  (acc, group) => {
    group.forEach((item) => {
      acc[item] = Array.from(new Set([...(acc[item] ?? []), ...group]));
    });
    return acc;
  },
  {} as Record<string, string[]>
);

// Gera variantes de grafia palavra a palavra, limitando a explosao combinatoria
function expandSpellingVariants(value: string): string[] {
  const words = normalizeAccents(value).toUpperCase().split(/\s+/).filter(Boolean);
  let combos: string[][] = [[]];

  words.forEach((word) => {
    const options = SPELLING_VARIANTS[word] ?? [word];
    const next: string[][] = [];
    combos.forEach((combo) => {
      options.forEach((option) => {
        if (next.length < 24) next.push([...combo, option]);
      });
    });
    combos = next;
  });

  return Array.from(new Set([value, ...combos.map((combo) => combo.join(" "))]));
}

// Remove numero do imovel no final ("GENERAL OLYNTHO PILLAR 355" -> "GENERAL OLYNTHO PILLAR")
function stripHouseNumber(value: string): string {
  return value.replace(/[\s,]+n?[ºo°]?\.?\s*\d+[A-Za-z]?$/i, "").trim();
}

// Gera variantes trocando o titulo/patente inicial pelas suas abreviaturas
function expandTitleVariants(core: string): string[] {
  const upper = normalizeAccents(core).toUpperCase();
  const results = new Set<string>([core]);

  Object.keys(TITLE_VARIANTS).forEach((title) => {
    if (upper === title || upper.startsWith(`${title} `)) {
      const rest = upper.slice(title.length).trim();
      TITLE_VARIANTS[title].forEach((variant) => {
        results.add(rest ? `${variant} ${rest}` : variant);
      });
    }
  });

  return Array.from(results);
}

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
  const original = stripHouseNumber(normalizeWhitespace(logradouro));

  addTerm(terms, original);
  addTerm(terms, normalizeAccents(original));

  const match = original.match(STREET_TYPE_REGEX);
  if (!match) {
    expandTitleVariants(original).forEach((variant) =>
      expandSpellingVariants(variant).forEach((spelling) => addTerm(terms, spelling))
    );
    return Array.from(terms);
  }

  const [, rawPrefix, rawCore] = match;
  const coreOriginal = normalizeWhitespace(rawCore);
  const coreNormalized = normalizeAccents(coreOriginal);
  const prefixKey = normalizeAccents(rawPrefix).replace(/\./g, "").toUpperCase();
  const variants = STREET_TYPE_VARIANTS[prefixKey] ?? [rawPrefix.toUpperCase()];

  const baseCoreVariants = Array.from(
    new Set([...expandTitleVariants(coreOriginal), ...expandTitleVariants(coreNormalized)])
  );
  const coreVariants = Array.from(
    new Set(baseCoreVariants.flatMap((core) => expandSpellingVariants(core)))
  );

  coreVariants.forEach((core) => {
    addTerm(terms, core);
    variants.forEach((variant) => addTerm(terms, `${variant} ${core}`));
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