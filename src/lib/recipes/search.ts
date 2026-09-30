/** Recherche et filtres de la liste de recettes (hors ligne, en mémoire). */
import { displayTags, type TagOptions } from "./tags";
import type { Recipe } from "./types";

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export interface RecipeFilter {
  query: string;
  category: string | null;
  /** Moments cochés : la recette doit convenir à l'un d'eux. */
  moments?: string[];
  tags: string[];
}

export function filterRecipes(recipes: Recipe[], f: RecipeFilter, opts: TagOptions = {}): Recipe[] {
  const words = fold(f.query).split(/\s+/).filter(Boolean);
  return recipes
    .filter((r) => !f.category || r.category === f.category)
    .filter((r) => !f.moments?.length || f.moments.some((m) => (r.moments ?? []).includes(m)))
    .filter((r) => {
      if (!f.tags.length) return true;
      const tags = displayTags(r, opts);
      return f.tags.every((t) => tags.includes(t));
    })
    .filter((r) => {
      if (!words.length) return true;
      const haystack = fold([r.title, ...r.ingredients.map((i) => i.name), ...r.tags, r.personalNotes].join(" "));
      return words.every((w) => haystack.includes(w));
    })
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
}
