/**
 * Valeurs nutritionnelles prévues (pas mangées) : par repas et par jour, et
 * comparaison aux objectifs de l'utilisatrice.
 */
import { NUTRIENTS, type NutrientKey } from "@/config/planning";
import type { Recipe, UserSettings } from "@/lib/recipes/types";
import type { Nutrition } from "./types";

export const ZERO: Nutrition = { protein: 0, kcal: 0, fat: 0, carbs: 0, fiber: 0 };

export function recipeNutrition(r: Recipe | undefined, portions = 1): Nutrition {
  if (!r) return { ...ZERO };
  const out = { ...ZERO };
  for (const n of NUTRIENTS) out[n.key] = ((r[n.field] as number | null) ?? 0) * portions;
  return out;
}

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  const out = { ...a };
  for (const n of NUTRIENTS) out[n.key] += b[n.key];
  return out;
}

/** Objectif d'un nutriment : [min, max] (min seul = « au moins »), ou null si non fixé. */
export type Target = { min: number | null; max: number | null } | null;

export function targetFor(key: NutrientKey, t: UserSettings["dailyTargets"]): Target {
  switch (key) {
    case "kcal":
      return t.kcal ? { min: t.kcal, max: t.kcal } : null;
    case "protein":
      return t.proteinMinG ? { min: t.proteinMinG, max: null } : null;
    case "fat":
      return t.fatG ? { min: t.fatG[0], max: t.fatG[1] } : null;
    case "carbs":
      return t.carbsG ? { min: t.carbsG[0], max: t.carbsG[1] } : null;
    case "fiber":
      return t.fiberG ? { min: t.fiberG[0], max: t.fiberG[1] } : null;
  }
}

/** Valeur de référence pour une barre (max d'une fourchette, sinon le min). */
export function targetValue(t: Target): number | null {
  if (!t) return null;
  return t.max ?? t.min;
}

/** Écart relatif à l'objectif (0 = dans la cible). */
export function distance(value: number, t: Target): number {
  if (!t) return 0;
  const ref = targetValue(t) || 1;
  if (t.min != null && value < t.min) return (t.min - value) / ref;
  if (t.max != null && value > t.max) return (value - t.max) / ref;
  return 0;
}

/** Au-dessus du maximum, pour un nutriment où c'est à surveiller (kcal, lipides, glucides). */
export function isOver(key: NutrientKey, value: number, t: Target): boolean {
  const n = NUTRIENTS.find((x) => x.key === key);
  return !!n?.warnAbove && t?.max != null && Math.round(value) > t.max;
}

export function isOnTarget(value: number, t: Target, tolerance = 0.05) {
  return t != null && distance(value, t) <= tolerance;
}
