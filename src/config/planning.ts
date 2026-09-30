/**
 * Réglages du planning (V2). Les objectifs chiffrés sont choisis par
 * l'utilisatrice dans l'appli ; ici : les nutriments suivis, les poids du
 * tirage et les valeurs par défaut.
 */
import type { MomentId } from "./moments";

export const NUTRIENTS = [
  { key: "protein", label: "Protéines", unit: "g", field: "proteinG" },
  { key: "kcal", label: "Kcal", unit: "kcal", field: "kcal" },
  { key: "fat", label: "Lipides", unit: "g", field: "fatG" },
  { key: "carbs", label: "Glucides", unit: "g", field: "carbsG" },
  { key: "fiber", label: "Fibres", unit: "g", field: "fiberG" },
] as const;

export type NutrientKey = (typeof NUTRIENTS)[number]["key"];

export const PLANNING_DEFAULTS = {
  /** Repas planifiés par défaut (modifiable dans le planning). */
  meals: ["dejeuner", "diner"] as MomentId[],
  /** Objectif que le tirage cherche à atteindre en premier. */
  priority: "protein" as NutrientKey,
};

/**
 * Recettes sans « moment » renseigné : dans quels repas peuvent-elles être
 * tirées, selon leur catégorie.
 */
export const MEAL_FALLBACK_CATEGORIES: Record<string, string[]> = {
  "petit-dejeuner": [],
  dejeuner: ["plat", "entree"],
  gouter: ["dessert"],
  diner: ["plat", "entree"],
};

/** Poids du score du tirage (plus = plus important). */
export const DRAW_WEIGHTS = {
  /** Règle ferme : au moins un repas riche en protéines par jour. */
  proteinRichRule: 100,
  /** Règle ferme : des légumes à au moins un repas par jour. */
  vegetablesRule: 100,
  /** Objectif prioritaire. */
  priority: 20,
  /** Kcal, si ce n'est pas la priorité et qu'un objectif est fixé. */
  kcal: 2,
  /** Autres fourchettes (lipides, glucides, fibres). */
  others: 0.5,
  /** Même plat deux fois le même jour. */
  sameDayDuplicate: 20,
  /** Par répétition du même plat dans la semaine. */
  weekRepeat: 3,
  /** Combinaisons essayées par jour. */
  tries: 250,
};
