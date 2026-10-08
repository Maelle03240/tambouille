/**
 * Ce que représente « 1 portion » (les valeurs nutritionnelles sont par
 * portion) : « 2 cookies », « 1 personne », et son poids estimé, pour
 * afficher aussi les valeurs pour 100 g. Fonctions pures, testées.
 */
import { formatDecimal } from "./quantities";
import type { Recipe } from "./types";

type Yield = Pick<Recipe, "yieldQuantity" | "yieldUnit" | "portionSize">;
type Nutri = Pick<Recipe, "kcal" | "proteinG" | "fatG" | "carbsG" | "fiberG">;

const NUTRI_KEYS = ["kcal", "proteinG", "fatG", "carbsG", "fiberG"] as const;

/** Unité « par personne » : une portion = une unité. */
export const isPerPerson = (unit: string) => !unit || /^(pers|part)/i.test(unit.trim());

/** « cookies » → « cookie » pour 1 (mots simples seulement : « c. à soupe » ne change pas). */
export function unitFor(qty: number, unit: string): string {
  const u = unit.trim();
  return qty <= 1 && /^[^\s]+s$/i.test(u) ? u.slice(0, -1) : u;
}

/** Nombre de portions de la recette (25 cookies, 2 par portion → 12,5). */
export function portionCount(r: Yield): number | null {
  if (!r.yieldQuantity) return null;
  return isPerPerson(r.yieldUnit) ? r.yieldQuantity : r.yieldQuantity / (r.portionSize || 1);
}

/** « 2 cookies », « 1 c. à soupe » ; null pour « personnes » (1 portion = 1 personne, évident). */
export function portionLabel(r: Yield): string | null {
  if (isPerPerson(r.yieldUnit)) return null;
  const q = r.portionSize || 1;
  return `${formatDecimal(q)} ${unitFor(q, r.yieldUnit)}`;
}

/** Titre des valeurs nutritionnelles : « Pour 1 personne », « Pour 1 portion = 2 cookies ». */
export function portionTitle(r: Yield): string {
  if (isPerPerson(r.yieldUnit)) return `Pour 1 ${unitFor(1, r.yieldUnit || "personnes")}`;
  return `Pour 1 portion = ${portionLabel(r)}`;
}

/** Poids d'une portion (poids total, sinon somme des grammes estimés des ingrédients). */
export function portionGrams(r: Yield & Pick<Recipe, "totalWeightG" | "ingredients">): number | null {
  const n = portionCount(r);
  const total = r.totalWeightG || r.ingredients.reduce((s, i) => s + (i.gramsEstimate ?? 0), 0);
  return n && total ? total / n : null;
}

/** Valeurs pour 100 g (null si le poids d'une portion est inconnu). */
export function per100g(r: Yield & Nutri & Pick<Recipe, "totalWeightG" | "ingredients">): Nutri | null {
  const g = portionGrams(r);
  if (!g) return null;
  return Object.fromEntries(NUTRI_KEYS.map((k) => [k, r[k] == null ? null : (r[k]! * 100) / g])) as Nutri;
}

/**
 * Rendement ou taille de portion modifié : les valeurs par portion suivent
 * (25 → 20 cookies avec la même pâte : chaque cookie est plus gros).
 */
export function rescaleNutrition<T extends Yield & Nutri>(before: T, after: T): T {
  const share = (r: Yield) => {
    const n = portionCount(r);
    return n ? 1 / n : null;
  };
  const a = share(before);
  const b = share(after);
  if (!a || !b || a === b) return after;
  const out = { ...after };
  for (const k of NUTRI_KEYS) if (out[k] != null) out[k] = Math.round(((out[k] as number) * b) / a * 10) / 10;
  return out;
}
