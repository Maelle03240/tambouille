/**
 * Tags de recettes.
 * - `manual` : choisis à la main dans l'éditeur, stockés dans `recipes.tags`.
 * - `auto`   : calculés à l'affichage (jamais stockés), voir src/lib/recipes/tags.ts.
 * Le tag « fêtes » correspond à la colonne `is_occasion` (exclu du suivi kcal).
 * Ajouter un tag manuel = ajouter une ligne ici. Ne pas renommer un `id` existant.
 */
export const TAGS = [
  { id: "a-tester", label: "À tester", kind: "manual" },
  { id: "fetes", label: "Fêtes", kind: "manual" },
  { id: "meal-prep", label: "Meal prep", kind: "manual" },
  { id: "one-pot", label: "One-pot", kind: "manual" },
  { id: "sans-gluten", label: "Sans gluten", kind: "manual" },
  { id: "riche-en-proteines", label: "Riche en protéines", kind: "auto" },
  { id: "rapide", label: "Rapide", kind: "auto" },
] as const;

export type TagId = (typeof TAGS)[number]["id"];

/** Réglages par défaut des tags automatiques (modifiables dans Réglages pour le seuil). */
export const TAG_DEFAULTS = {
  proteinRichThresholdG: 20,
  quickMaxMinutes: 20,
};

export function tagLabel(id: string) {
  return TAGS.find((t) => t.id === id)?.label ?? id;
}
