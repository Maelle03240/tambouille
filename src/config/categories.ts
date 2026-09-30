/**
 * Catégories de recettes.
 * - `id` est ce qui est stocké en base : ne jamais le renommer une fois des
 *   recettes enregistrées (changer `label` à la place).
 * - `hue` : teinte de la couleur de la catégorie (0-360, espace OKLCH).
 * Ajouter une catégorie = ajouter une ligne ici (et dans la contrainte SQL
 * `recipes_category_check` si elle existe, voir supabase/migrations).
 */
export const CATEGORIES = [
  { id: "entree", label: "Entrées", singular: "Entrée", hue: 165 },
  { id: "plat", label: "Plats", singular: "Plat", hue: 45 },
  { id: "dessert", label: "Desserts", singular: "Dessert", hue: 355 },
  { id: "sauce", label: "Sauces", singular: "Sauce", hue: 25 },
  { id: "apero", label: "Apéro", singular: "Apéro", hue: 300 },
  { id: "cocktail", label: "Cocktails & mocktails", singular: "Cocktail / mocktail", hue: 220 },
  { id: "petit-dejeuner", label: "Petit-déj", singular: "Petit-déjeuner", hue: 260 },
  { id: "gouter", label: "Goûter", singular: "Goûter", hue: 95 },
  { id: "pain", label: "Pains", singular: "Pain", hue: 75 },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

const FALLBACK = { id: "plat", label: "Sans catégorie", singular: "Sans catégorie", hue: 60 } as const;

export function getCategory(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

/** Couleurs (fond + encre) d'une catégorie, calculées depuis le thème. */
export function categoryColors(id: string | null | undefined) {
  const { hue } = getCategory(id);
  return {
    bg: `oklch(var(--category-bg-l) var(--category-bg-c) ${hue})`,
    ink: `oklch(var(--category-ink-l) var(--category-ink-c) ${hue})`,
  };
}
