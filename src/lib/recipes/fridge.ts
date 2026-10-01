/**
 * MODE FRIGO VIDE (spec V3) : à partir de ce que j'ai sous la main, quelles
 * recettes je peux faire, et ce qui manque. Les basiques (sel, huile…)
 * comptent comme toujours là. Fonctions pures, testées dans fridge.test.ts.
 */
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
 * Recettes qui utilisent au moins un des produits que j'ai, classées par
 * nombre d'ingrédients manquants (0 d'abord), puis par part de ce que j'ai.
 */
export function fridgeMatches(recipes: Recipe[], have: string[], basics: string[] = []): FridgeMatch[] {
  const terms = have.map((h) => h.trim()).filter(Boolean);
  if (!terms.length) return [];
  const out: (FridgeMatch & { used: number })[] = [];
  for (const recipe of recipes) {
    const names = [...new Set(recipe.ingredients.map((i) => i.name.trim()).filter(Boolean))];
    if (!names.length) continue;
    const got: string[] = [];
    const missing: string[] = [];
    let used = 0;
    for (const name of names) {
      if (terms.some((t) => ingredientMatches(name, t))) {
        got.push(name);
        used++;
      } else if (basics.some((b) => ingredientMatches(name, b))) got.push(name);
      else missing.push(name);
    }
    if (used > 0) out.push({ recipe, have: got, missing, used });
  }
  return out
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.used - a.used ||
        a.recipe.title.localeCompare(b.recipe.title, "fr"),
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ used, ...m }) => m);
}
