/**
 * Points « à revoir » automatiques : générés à chaque enregistrement à partir
 * des champs manquants. Remplir le champ fait disparaître le point au
 * prochain enregistrement. Ajouter une règle = ajouter une ligne à RULES.
 */
import type { Recipe, ReviewItem } from "./types";

export interface AutoReviewRule {
  field: string;
  note: string;
  missing: (r: Recipe) => boolean;
}

export const AUTO_REVIEW_RULES: AutoReviewRule[] = [
  { field: "category", note: "Catégorie à choisir", missing: (r) => !r.category },
  { field: "yieldQuantity", note: "Nombre de portions manquant", missing: (r) => !r.yieldQuantity },
  { field: "prepMinutes", note: "Temps de préparation manquant", missing: (r) => r.prepMinutes == null },
  { field: "cookMinutes", note: "Temps de cuisson manquant (0 si pas de cuisson)", missing: (r) => r.cookMinutes == null },
  { field: "kcal", note: "Kcal par portion manquantes", missing: (r) => r.kcal == null },
  { field: "proteinG", note: "Protéines par portion manquantes", missing: (r) => r.proteinG == null },
  { field: "ingredients", note: "Aucun ingrédient", missing: (r) => r.ingredients.length === 0 },
  { field: "steps", note: "Aucune étape", missing: (r) => r.steps.length === 0 },
];

export function autoReviewNotes(recipe: Recipe): { field: string; note: string }[] {
  return AUTO_REVIEW_RULES.filter((rule) => rule.missing(recipe)).map(({ field, note }) => ({ field, note }));
}

/** Libellés des champs (liste « à revoir », éditeur). */
export const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  category: "Catégorie",
  yieldQuantity: "Portions",
  yieldUnit: "Unité de rendement",
  prepMinutes: "Préparation",
  cookMinutes: "Cuisson",
  kcal: "Kcal",
  proteinG: "Protéines",
  fatG: "Lipides",
  carbsG: "Glucides",
  fiberG: "Fibres",
  ingredients: "Ingrédients",
  steps: "Étapes",
};

/**
 * Point « à revoir » qui me concerne : noté par moi, ou point automatique
 * d'une recette que j'ai ajoutée. (L'admin voit tous les points dans
 * Réglages → À revoir ; l'accueil ne montre que les siens.)
 */
export function isMyReviewItem(item: ReviewItem, recipe: Pick<Recipe, "ownerId"> | undefined, userId: string | null): boolean {
  if (!userId) return true;
  if (item.createdBy) return item.createdBy === userId;
  return !recipe?.ownerId || recipe.ownerId === userId;
}
