/**
 * MODE FRIGO VIDE (spec V3) : à partir de ce que j'ai sous la main, quelles
 * recettes je peux faire, et ce qui manque. Les basiques (sel, huile…)
 * comptent comme toujours là. Fonctions pures, testées dans fridge.test.ts.
 */
import { FRIDGE_FAMILIES, FRIDGE_NOT_SAME } from "@/config/fridge";
import type { Recipe } from "./types";

export interface FridgeMatch {
  recipe: Recipe;
  /** Ingrédients que j'ai (dont basiques). */
  have: string[];
  /** Ingrédients qui manquent (noms tels qu'écrits dans la recette). */
  missing: string[];
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'");

/** Mots d'un nom, au singulier approximatif (« courgettes » → « courgette », « choux » → « chou »). */
function words(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w));
}

const STOP = new Set(["de", "du", "des", "la", "le", "les", "au", "aux", "en", "et", "ou", "un", "une", "d", "l", "a"]);

/** Vrai si tous les mots de `term` (« lait coco ») sont dans le nom de l'ingrédient (« lait de coco »). */
export function ingredientMatches(ingredientName: string, term: string): boolean {
  const iw = words(ingredientName);
  const tw = words(term);
  return tw.length > 0 && tw.every((w) => iw.includes(w));
}

/**
 * L'ingrédient est-il ce produit ? Comme `ingredientMatches`, sauf les
 * variantes qui sont un autre produit (« sucre » ≠ « sucre glace »).
 */
export function isSameProduct(ingredientName: string, term: string, notSame: Record<string, string[]> = FRIDGE_NOT_SAME): boolean {
  if (!ingredientMatches(ingredientName, term)) return false;
  const key = Object.keys(notSame).find((k) => ingredientMatches(k, term) && ingredientMatches(term, k));
  return !key || !notSame[key].some((w) => ingredientMatches(ingredientName, w) && !ingredientMatches(term, w));
}

/** Mots-clés couverts par un produit : lui-même + sa famille (« sucre » → cassonade…). */
function variants(term: string, families: Record<string, string[]>): string[] {
  const key = Object.keys(families).find((k) => ingredientMatches(k, term) && ingredientMatches(term, k));
  return key ? [term, ...families[key]] : [term];
}

/**
 * Recettes faisables avec ce que j'ai :
 * - `have` : produits notés à la main ; `basics` : comptés comme présents
 *   (« J'ai les basiques », mes basiques des courses, l'eau) ;
 * - une recette apparaît si elle utilise au moins un produit noté (ou, si
 *   rien n'est noté, s'il ne manque rien) ;
 * - celles qui utilisent le plus de mes produits d'abord, puis celles où il
 *   manque le moins.
 */
export function fridgeMatches(
  recipes: Recipe[],
  have: string[],
  basics: string[] = [],
  families: Record<string, string[]> = FRIDGE_FAMILIES,
): FridgeMatch[] {
  const mine = have.map((h) => h.trim()).filter(Boolean).flatMap((t) => variants(t, families));
  const always = basics.flatMap((t) => variants(t, families));
  if (!mine.length && !always.length) return [];
  const out: (FridgeMatch & { used: number })[] = [];
  for (const recipe of recipes) {
    const names = [...new Set(recipe.ingredients.map((i) => i.name.trim()).filter(Boolean))];
    if (!names.length) continue;
    const got: string[] = [];
    const missing: string[] = [];
    let used = 0;
    for (const name of names) {
      if (mine.some((t) => isSameProduct(name, t))) {
        got.push(name);
        used++;
      } else if (always.some((b) => isSameProduct(name, b))) got.push(name);
      else missing.push(name);
    }
    if (used > 0 || (!mine.length && missing.length === 0)) out.push({ recipe, have: got, missing, used });
  }
  return out
    .sort(
      (a, b) =>
        b.used - a.used ||
        a.missing.length - b.missing.length ||
        a.recipe.title.localeCompare(b.recipe.title, "fr"),
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ used, ...m }) => m);
}
