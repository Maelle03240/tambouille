import type { NutrientKey } from "@/config/planning";

/**
 * Un plat planifié. slot 0 = le plat du repas (tiré au sort) ; 1, 2… = ajoutés
 * à la main (entrée, dessert, pain…). Clé locale : voir entryKey.
 */
export interface MealPlanEntry {
  key: string;
  /** Place dans le repas (0 = plat principal, absent = 0). */
  slot?: number;
  /** Date ISO « AAAA-MM-JJ ». */
  day: string;
  /** Moment : petit-dejeuner, dejeuner, gouter, diner. */
  meal: string;
  recipeId: string | null;
  /** En portions de la recette (1 = une portion). */
  portions: number;
  locked: boolean;
  /** Repas retiré ce jour-là (alors qu'il est planifié les autres jours). */
  skipped?: boolean;
}

export interface MealTemplate {
  id: string;
  name: string;
  kind: "jour" | "semaine";
  /** dayOffset : 0 pour une journée ; 0 (lundi) à 6 pour une semaine. */
  meals: { dayOffset: number; meal: string; recipeId: string | null; slot?: number }[];
}

export interface PantryBasic {
  id: string;
  name: string;
}

export interface PlanningSettings {
  meals: string[];
  priority: NutrientKey;
}

export type Nutrition = Record<NutrientKey, number>;

export const entryKey = (day: string, meal: string, slot = 0) => (slot ? `${day}|${meal}|${slot}` : `${day}|${meal}`);
