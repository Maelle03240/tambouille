"use client";
/**
 * Lectures pour l'interface : toujours depuis le cache local, avec mise à
 * jour automatique quand le cache change (useLiveQuery).
 */
import { useLiveQuery } from "dexie-react-hooks";
import { DEFAULT_SETTINGS } from "./actions";
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

export function useOpenReviewCount() {
  return useLiveQuery(async () => (await db.reviewItems.toArray()).filter((i) => !i.done).length, []) ?? 0;
}

export function useSettings() {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...((await getMeta("settings")) ?? {}) }), []) ?? DEFAULT_SETTINGS;
}

export function useProfile() {
  return useLiveQuery(() => getMeta("profile"), []);
}
