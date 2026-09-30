import type { NutrientKey } from "@/config/planning";

/** Un repas planifié. Clé locale = `${day}|${meal}` (un plat par repas et par jour). */
export interface MealPlanEntry {
  key: string;
  /** Date ISO « AAAA-MM-JJ ». */
  day: string;
  /** Moment : petit-dejeuner, dejeuner, gouter, diner. */
  meal: string;
  recipeId: string | null;
  /** En portions de la recette (1 = une portion). */
  portions: number;
  locked: boolean;
}

export interface MealTemplate {
  id: string;
  name: string;
  kind: "jour" | "semaine";
  /** dayOffset : 0 pour une journée ; 0 (lundi) à 6 pour une semaine. */
  meals: { dayOffset: number; meal: string; recipeId: string | null }[];
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

export const entryKey = (day: string, meal: string) => `${day}|${meal}`;
