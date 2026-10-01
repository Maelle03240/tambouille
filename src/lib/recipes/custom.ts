/**
 * Liaison automatique des ingrédients d'une recette à la bibliothèque
 * d'ingrédients perso (spec §5 : « les ingrédients reconnus sont reliés »).
 * Reconnu = tous les mots du nom de l'ingrédient perso figurent dans le nom
 * de l'ingrédient (« skyr » ↔ « skyr nature », « whey vanille » ↔ …).
 */
import type { CustomIngredient, Recipe } from "./types";

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

export function findCustom(name: string, customs: CustomIngredient[]): CustomIngredient | undefined {
  const w = new Set(words(name));
  return customs.find((c) => {
    const cw = words(c.name);
    return cw.length > 0 && cw.every((x) => w.has(x));
  });
}

export function linkCustomIngredients(recipe: Recipe, customs: CustomIngredient[]): Recipe {
  if (!customs.length) return recipe;
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((i) => (i.customIngredientId ? i : { ...i, customIngredientId: findCustom(i.name, customs)?.id ?? null })),
  };
}
