/**
 * Quantités : lecture d'une ligne d'ingrédient, mise à l'échelle selon les
 * portions et arrondis lisibles (pas de « 1,3333 œuf »).
 * Fonctions pures, testées dans quantities.test.ts.
 */
import type { Ingredient } from "./types";

/* ───────────── Unités ───────────── */

/** Forme canonique ← variantes acceptées à la saisie (en minuscules, sans point final). */
const UNIT_SYNONYMS: Record<string, string[]> = {
  g: ["g", "gr", "gramme", "grammes"],
  kg: ["kg", "kilo", "kilos", "kilogramme", "kilogrammes"],
  mg: ["mg"],
  ml: ["ml", "millilitre", "millilitres"],
  cl: ["cl", "centilitre", "centilitres"],
  dl: ["dl", "décilitre", "décilitres"],
  l: ["l", "litre", "litres"],
  "c. à soupe": ["c. à soupe", "c à soupe", "c.à.s", "c.a.s", "c. à s", "càs", "cas", "cs", "c.s", "cuillère à soupe", "cuillères à soupe", "cuillere a soupe", "cuilleres a soupe", "c. a soupe", "tbsp"],
  "c. à café": ["c. à café", "c à café", "c.à.c", "c.a.c", "c. à c", "càc", "cac", "cc", "c.c", "cuillère à café", "cuillères à café", "cuillere a cafe", "cuilleres a cafe", "c. à thé", "c. a cafe", "tsp"],
  pincée: ["pincée", "pincées", "pincee", "pincees"],
  gousse: ["gousse", "gousses"],
  tranche: ["tranche", "tranches"],
  sachet: ["sachet", "sachets"],
  boîte: ["boîte", "boîtes", "boite", "boites"],
  pot: ["pot", "pots"],
  verre: ["verre", "verres"],
  tasse: ["tasse", "tasses"],
  brin: ["brin", "brins"],
  feuille: ["feuille", "feuilles"],
  botte: ["botte", "bottes"],
  bouquet: ["bouquet", "bouquets"],
  poignée: ["poignée", "poignées", "poignee", "poignees"],
  filet: ["filet", "filets"],
  cube: ["cube", "cubes"],
  morceau: ["morceau", "morceaux"],
  noix: ["noix"],
  noisette: ["noisette", "noisettes"],
  zeste: ["zeste", "zestes"],
  pointe: ["pointe", "pointes"],
  rouleau: ["rouleau", "rouleaux"],
  paquet: ["paquet", "paquets"],
  bocal: ["bocal", "bocaux"],
  cuillère: ["cuillère", "cuillères"],
};

/** Unités qui ne prennent jamais de « s ». */
const INVARIABLE_UNITS = new Set(["g", "kg", "mg", "ml", "cl", "dl", "l", "c. à soupe", "c. à café", "noix"]);
const IRREGULAR_PLURALS: Record<string, string> = { morceau: "morceaux", bocal: "bocaux", rouleau: "rouleaux" };

const SYNONYM_LOOKUP: [string, string][] = Object.entries(UNIT_SYNONYMS)
  .flatMap(([canonical, variants]) => variants.map((v) => [v, canonical] as [string, string]))
  // les variantes les plus longues d'abord (« c. à soupe » avant « c »)
  .sort((a, b) => b[0].length - a[0].length);

export function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (!u) return "";
  const hit = SYNONYM_LOOKUP.find(([variant]) => variant === u);
  return hit ? hit[1] : unit.trim();
}

export function pluralizeUnit(unit: string, value: number): string {
  if (!unit || value < 2 || INVARIABLE_UNITS.has(unit)) return unit;
  if (IRREGULAR_PLURALS[unit]) return IRREGULAR_PLURALS[unit];
  if (/[sx]$/.test(unit)) return unit;
  return unit + "s";
}

/* ───────────── Nombres ───────────── */

const FRACTION_GLYPHS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

/** Lit « 1,5 », « 1.5 », « ½ », « 1 ½ », « 1/2 », « 1 1/2 », « 2-3 » (→ 2). */
export function parseNumber(input: string): number | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/(\d)\s*[-–à]\s*\d+([.,]\d+)?/, "$1"); // fourchette : on garde le début
  let total = 0;
  let matched = false;
  const glyph = s.match(/[¼½¾⅓⅔⅛]/);
  if (glyph) {
    total += FRACTION_GLYPHS[glyph[0]];
    s = s.replace(glyph[0], " ");
    matched = true;
  }
  const frac = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    const d = Number(frac[2]);
    if (d) total += Number(frac[1]) / d;
    s = s.replace(frac[0], " ");
    matched = true;
  }
  const dec = s.match(/\d+(?:[.,]\d+)?/);
  if (dec) {
    total += Number(dec[0].replace(",", "."));
    matched = true;
  }
  return matched ? total : null;
}

/** 1.5 → « 1,5 » ; 2 → « 2 ». */
export function formatDecimal(n: number, maxDecimals = 2): string {
  const f = Number(n.toFixed(maxDecimals));
  return String(f).replace(".", ",");
}

/** 0.5 → « ½ » ; 1.5 → « 1 ½ » ; 0.3 → « 0,3 ». */
export function formatFraction(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  const glyph = Object.entries(FRACTION_GLYPHS).find(([, v]) => Math.abs(v - rest) < 0.01)?.[0];
  if (rest < 0.01) return String(whole);
  if (glyph) return whole ? `${whole} ${glyph}` : glyph;
  return formatDecimal(n);
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/* ───────────── Mise à l'échelle + arrondis ───────────── */

export interface DisplayQuantity {
  /** Texte de la quantité avec son unité (« 200 g », « 1 ½ », « 2 gousses »), vide si aucune. */
  amount: string;
  /** Valeur arrondie (utile pour les accords). */
  value: number | null;
  /** Unité affichée (peut changer : g → kg). */
  unit: string;
}

/**
 * Arrondit une quantité pour qu'elle reste utilisable en cuisine.
 * Aux portions d'origine (factor = 1), la quantité de la recette est
 * affichée telle quelle : on n'arrondit que ce qu'on a recalculé.
 */
export function displayQuantity(
  quantity: number | null,
  unit: string,
  factor = 1,
  /** round : arrondir même sans mise à l'échelle (totaux de la liste de courses). */
  opts: { round?: boolean } = {},
): DisplayQuantity {
  if (quantity == null || !isFinite(quantity)) return { amount: "", value: null, unit };
  const exact = factor === 1 && !opts.round;
  let v = quantity * factor;
  let u = unit;
  const round = (rounded: number) => (exact ? Number(v.toFixed(2)) : rounded);

  // Conversions d'échelle lisibles
  if (u === "kg" && v < 1) { v *= 1000; u = "g"; }
  if (u === "l" && v < 1) { v *= 100; u = "cl"; }

  if (u === "g" || u === "ml") {
    if (v >= 1000) {
      const big = (exact ? v : roundTo(v, 50)) / 1000;
      const bigUnit = u === "g" ? "kg" : "l";
      return { amount: `${formatDecimal(big)} ${bigUnit}`, value: big, unit: bigUnit };
    }
    v = round(v < 10 ? Math.max(1, Math.round(v)) : v < 100 ? Math.max(5, roundTo(v, 5)) : roundTo(v, 10));
    return { amount: `${formatDecimal(v)} ${u}`, value: v, unit: u };
  }
  if (u === "kg" || u === "l") {
    v = round(roundTo(v, 0.05));
    return { amount: `${formatDecimal(v)} ${u}`, value: v, unit: u };
  }
  if (u === "cl" || u === "dl") {
    v = round(v < 5 ? Math.max(0.5, roundTo(v, 0.5)) : Math.round(v));
    return { amount: `${formatDecimal(v)} ${u}`, value: v, unit: u };
  }
  if (u === "mg") {
    v = round(Math.max(1, Math.round(v)));
    return { amount: `${formatDecimal(v)} mg`, value: v, unit: u };
  }
  if (u === "pincée") {
    v = round(Math.max(1, Math.round(v)));
    return { amount: `${formatFraction(v)} ${pluralizeUnit(u, v)}`, value: v, unit: u };
  }
  // Cuillères, tasses, sans unité (œufs, citrons…) et autres unités « comptables »
  v = round(v < 1 ? Math.max(0.25, roundTo(v, 0.25)) : v < 4 ? roundTo(v, 0.5) : Math.round(v));
  const txt = formatFraction(v);
  return { amount: u ? `${txt} ${pluralizeUnit(u, v)}` : txt, value: v, unit: u };
}

/** « farine » → « de farine » ; « huile » → « d'huile » (pour « 200 g de farine »). */
export function withDe(name: string): string {
  const n = name.trim();
  if (!n) return n;
  if (/^(de |d'|d’|du |des )/i.test(n)) return n;
  if (/^[aeiouyàâäéèêëîïôöûüœæ]/i.test(n) || /^h(u|e|o|ô|ui)/i.test(n)) return `d'${n}`;
  return `de ${n}`;
}

/**
 * Texte d'affichage d'un ingrédient : `amount` en gras + `rest`.
 * « 200 g » + « de farine », « 2 » + « œufs », « » + « sel ».
 */
export function formatIngredient(ing: Pick<Ingredient, "quantity" | "unit" | "name" | "scalable">, factor = 1) {
  const q = displayQuantity(ing.quantity, ing.unit, ing.scalable ? factor : 1);
  const rest = q.amount && q.unit ? withDe(ing.name) : ing.name;
  return { amount: q.amount, rest, value: q.value };
}

/* ───────────── Lecture d'une ligne saisie ───────────── */

const NUMBER_PREFIX = /^\s*((?:\d+\s+)?\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?(?:\s*[¼½¾⅓⅔⅛])?|[¼½¾⅓⅔⅛])\s*/;

/**
 * « 200 g de farine » → { quantity: 200, unit: "g", name: "farine" }
 * « 2 œufs » → { 2, "", "œufs" } ; « sel » → { null, "", "sel" }
 * « 1 c. à soupe d'huile d'olive » → { 1, "c. à soupe", "huile d'olive" }
 */
export function parseIngredientLine(line: string): { quantity: number | null; unit: string; name: string } {
  let rest = line.trim().replace(/\s+/g, " ");
  let quantity: number | null = null;
  let unit = "";

  const num = rest.match(NUMBER_PREFIX);
  if (num) {
    quantity = parseNumber(num[1]);
    rest = rest.slice(num[0].length);
  }

  // Unité collée ou séparée : « 200g », « 200 g », « 1 c. à soupe »
  const lower = rest.toLowerCase();
  for (const [variant, canonical] of SYNONYM_LOOKUP) {
    if (!lower.startsWith(variant)) continue;
    const after = rest.slice(variant.length);
    // l'unité doit être suivie d'un séparateur (sinon « gousse » ≠ « g » + « ousse »)
    if (after && !/^[\s.,'’]/.test(after)) continue;
    if (quantity == null && !INVARIABLE_UNITS.has(canonical) && !/^\s*(de|d'|d’)/i.test(after)) continue;
    unit = canonical;
    rest = after.replace(/^\.?\s*/, "");
    break;
  }

  // « de farine », « d'huile », « du beurre » → « farine », « huile », « beurre »
  if (unit || quantity != null) rest = rest.replace(/^(de |d'|d’|du |des )/i, "");
  return { quantity, unit, name: rest.trim() };
}

/** Pas du bouton +/- des portions selon le rendement de base (12 cookies → 2). */
export function servingsStep(base: number | null): number {
  if (!base || base <= 8) return 1;
  return Math.max(1, Math.round(base / 6));
}
