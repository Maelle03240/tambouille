"use client";
/**
 * Lectures pour l'interface : toujours depuis le cache local, avec mise à
 * jour automatique quand le cache change (useLiveQuery).
 */
import { useLiveQuery } from "dexie-react-hooks";
import { isMyReviewItem } from "@/lib/recipes/review";
import { visibleRecipes } from "@/lib/recipes/visibility";
import { DEFAULT_SETTINGS, EMPTY_SHOPPING } from "./actions";
import { db, getMeta } from "./db";

/**
 * Recettes de mes listes : bibliothèque, mes versions perso (à la place de
 * l'originale) et celles des membres de mes foyers (visibility.ts).
 */
export function useRecipes() {
  return useLiveQuery(async () => {
    const [all, profile, mates] = await Promise.all([db.recipes.toArray(), getMeta("profile"), getMeta("housemates")]);
    return visibleRecipes(all, profile?.id ?? null, mates ?? []);
  }, []);
}

/** Toutes les recettes du cache (pour retrouver celle d'un repas, d'une liste…). */
export function useAllRecipes() {
  return useLiveQuery(() => db.recipes.toArray(), []);
}

/** Prénoms des comptes. */
export function usePeople() {
  return useLiveQuery(async () => (await getMeta("people")) ?? [], []);
}

/** Admin : propositions en attente. */
export function usePendingProposals() {
  return useLiveQuery(async () => (await db.recipes.toArray()).filter((r) => r.status === "personal" && r.proposalStatus === "pending"), []);
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
