"use client";
/**
 * Lectures pour l'interface : toujours depuis le cache local, avec mise à
 * jour automatique quand le cache change (useLiveQuery).
 */
import { useLiveQuery } from "dexie-react-hooks";
import { isMyReviewItem } from "@/lib/recipes/review";
import { DEFAULT_SETTINGS, EMPTY_SHOPPING } from "./actions";
import { db, getMeta } from "./db";

export function useRecipes() {
  return useLiveQuery(() => db.recipes.toArray(), []);
}

/** `undefined` = en chargement ; `null` = introuvable. */
export function useRecipe(id: string | null) {
  return useLiveQuery(async () => (id ? ((await db.recipes.get(id)) ?? null) : null), [id]);
}

export function useReviewItems(recipeId?: string) {
  return useLiveQuery(
    () => (recipeId ? db.reviewItems.where("recipeId").equals(recipeId).toArray() : db.reviewItems.toArray()),
    [recipeId],
  );
}

/** Points « à revoir » ouverts : les miens (accueil), ou tous (admin, Réglages). */
export function useOpenReviewCount(userId: string | null, all = false) {
  return (
    useLiveQuery(async () => {
      const open = (await db.reviewItems.toArray()).filter((i) => !i.done);
      if (all) return open.length;
      const recipes = new Map((await db.recipes.toArray()).map((r) => [r.id, r]));
      return open.filter((i) => isMyReviewItem(i, recipes.get(i.recipeId), userId)).length;
    }, [userId, all]) ?? 0
  );
}

export function useSettings() {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...((await getMeta("settings")) ?? {}) }), []) ?? DEFAULT_SETTINGS;
}

export function useProfile() {
  return useLiveQuery(() => getMeta("profile"), []);
}

/* ───────────── Planning (V2) ───────────── */

export function useMealPlans(from: string, to: string) {
  return useLiveQuery(() => db.mealPlans.where("day").between(from, to, true, true).toArray(), [from, to]);
}

export function useTemplates() {
  return useLiveQuery(() => db.templates.toArray(), []);
}

export function usePantry() {
  return useLiveQuery(() => db.pantry.orderBy("name").toArray(), []);
}

export function useShopping() {
  return useLiveQuery(async () => ({ ...EMPTY_SHOPPING, ...((await getMeta("shopping")) ?? {}) }), []);
}

export function useFridge() {
  return useLiveQuery(async () => ({ items: (await getMeta("fridge")) ?? [], basics: (await getMeta("fridgeBasics")) ?? true }), []);
}

export function useCustomIngredients() {
  return useLiveQuery(() => db.customIngredients.orderBy("name").toArray(), []);
}

/** Mes foyers et celui affiché (menu, courses, objectifs…). */
export function useHouseholds() {
  return useLiveQuery(async () => ({ list: (await getMeta("households")) ?? [], currentId: (await getMeta("householdId")) ?? null }), []);
}
