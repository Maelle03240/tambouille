/**
 * Tags affichés d'une recette = tags manuels stockés + tags automatiques
 * calculés (riche en protéines, rapide) + « fêtes » depuis is_occasion.
 */
import { TAG_DEFAULTS } from "@/config/tags";
import type { Recipe } from "./types";

export interface TagOptions {
  proteinRichThresholdG?: number;
}

export function totalMinutes(r: Pick<Recipe, "prepMinutes" | "cookMinutes">): number | null {
  if (r.prepMinutes == null && r.cookMinutes == null) return null;
  return (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
}

export function isProteinRich(r: Pick<Recipe, "proteinG">, opts: TagOptions = {}) {
  const threshold = opts.proteinRichThresholdG ?? TAG_DEFAULTS.proteinRichThresholdG;
  return r.proteinG != null && r.proteinG >= threshold;
}

export function displayTags(r: Recipe, opts: TagOptions = {}): string[] {
  const tags = new Set(r.tags.filter((t) => t !== "fetes"));
  if (r.isOccasion) tags.add("fetes");
  if (isProteinRich(r, opts)) tags.add("riche-en-proteines");
  const total = totalMinutes(r);
  if (total != null && total > 0 && total < TAG_DEFAULTS.quickMaxMinutes) tags.add("rapide");
  return [...tags];
}
