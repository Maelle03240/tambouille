/**
 * Écritures. Chaque action met à jour la base distante PUIS le cache local,
 * pour que l'interface (qui lit le cache) se mette à jour d'elle-même.
 */
import { newId } from "@/lib/ids";
import { timersIn } from "@/lib/recipes/markers";
import { AUTO_REVIEW_RULES, autoReviewNotes } from "@/lib/recipes/review";
import { PLANNING_DEFAULTS } from "@/config/planning";
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { CustomIngredient, Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";
import { getRepository } from ".";
import { base64ToBlob, compressForStorage } from "@/lib/import/image";
import { requestIllustration } from "@/lib/import/client";
import { db, getMeta, setMeta, type ShoppingState } from "./db";

export class OfflineError extends Error {
  constructor() {
    super("Pas de réseau : la création et la modification reviennent avec la connexion.");
  }
}

function requireOnline() {
  if (getRepository().mode === "supabase" && typeof navigator !== "undefined" && !navigator.onLine) {
    throw new OfflineError();
  }
}

/** Remet les positions dans l'ordre et recalcule ce qui se déduit du texte. */
function normalizeRecipe(recipe: Recipe): Recipe {
  const ingredientIds = new Set(recipe.ingredients.map((i) => i.id));
  return {
    ...recipe,
    title: recipe.title.trim(),
    updatedAt: new Date().toISOString(),
    ingredients: recipe.ingredients.map((i, position) => ({ ...i, position })),
    steps: recipe.steps
      .filter((s) => s.text.trim())
      .map((s, position) => {
        // on retire les marqueurs vers des ingrédients supprimés
        const text = s.text.replace(/\{\{ing:([^}]+)\}\}/g, (all, id: string) => (ingredientIds.has(id) ? all : ""));
        return { ...s, position, text, timerMinutes: timersIn(text)[0] ?? null };
      }),
  };
}

export interface SaveOptions {
  /** Points non vérifiés à l'import, gardés dans la liste « à revoir ». */
  keepForReview?: { field: string; note: string }[];
}

export async function saveRecipe(input: Recipe, opts: SaveOptions = {}): Promise<Recipe> {
  requireOnline();
  const recipe = normalizeRecipe(input);
  const repo = getRepository();
  await repo.saveRecipe(recipe);
  await db.recipes.put(recipe);
  await refreshAutoReview(recipe, opts.keepForReview ?? []);
  return recipe;
}

/**
 * Met à jour les points « à revoir » automatiques de la recette :
 * supprime ceux dont le champ est maintenant rempli, ajoute les nouveaux.
 */
async function refreshAutoReview(recipe: Recipe, extra: { field: string; note: string }[]) {
  const repo = getRepository();
  const ruleFields = new Set(AUTO_REVIEW_RULES.map((r) => r.field));
  const missing = autoReviewNotes(recipe);
  const missingFields = new Set(missing.map((m) => m.field));
  const existing = await db.reviewItems.where("recipeId").equals(recipe.id).toArray();
  const auto = existing.filter((i) => i.kind === "auto");

  const toDelete = auto.filter((i) => i.field && ruleFields.has(i.field) && !missingFields.has(i.field) && !i.done);
  const toAdd: ReviewItem[] = [...missing, ...extra]
    .filter((m) => !auto.some((i) => i.field === m.field))
    .map((m) => ({
      id: newId(),
      recipeId: recipe.id,
      kind: "auto",
      field: m.field,
      note: m.note,
      done: false,
      createdBy: null,
      createdAt: new Date().toISOString(),
    }));

  await repo.deleteReviewItems(toDelete.map((i) => i.id));
  await repo.upsertReviewItems(toAdd);
  await db.reviewItems.bulkDelete(toDelete.map((i) => i.id));
  await db.reviewItems.bulkPut(toAdd);
}

export async function deleteRecipe(id: string) {
  requireOnline();
  await getRepository().deleteRecipe(id);
  await db.recipes.delete(id);
  const items = await db.reviewItems.where("recipeId").equals(id).primaryKeys();
  await db.reviewItems.bulkDelete(items);
}

/** Met à jour quelques champs sans passer par l'éditeur (ex. tag « à tester »). */
export async function patchRecipe(id: string, patch: Partial<Recipe>) {
  const current = await db.recipes.get(id);
  if (!current) throw new Error("Recette introuvable");
  return saveRecipe({ ...current, ...patch });
}

/* ───────────── Images (V2) ───────────── */

/**
 * Remplace l'image d'une recette. Priorité d'affichage (spec §8) : photo
 * perso > illustration générée > couverture typographique ; une illustration
 * ne remplace donc jamais une photo perso.
 */
export async function setRecipeImage(recipeId: string, source: Blob, kind: "personal" | "generated") {
  requireOnline();
  const current = await db.recipes.get(recipeId);
  if (!current) throw new Error("Recette introuvable");
  if (kind === "generated" && current.imageKind === "personal") return current;
  const blob = await compressForStorage(source);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const repo = getRepository();
  const imagePath = await repo.uploadImage(`${recipeId}/${Date.now()}.${ext}`, blob);
  const saved = await patchRecipe(recipeId, { imagePath, imageKind: kind });
  if (current.imagePath && current.imagePath !== imagePath) await repo.deleteImage(current.imagePath).catch(() => {});
  return saved;
}

export async function removeRecipeImage(recipeId: string) {
  requireOnline();
  const current = await db.recipes.get(recipeId);
  if (!current?.imagePath) return;
  await getRepository().deleteImage(current.imagePath).catch(() => {});
  await patchRecipe(recipeId, { imagePath: null, imageKind: "none" });
}

/** Illustration IA (style vieux livre de cuisine), puis enregistrement. */
export async function illustrateRecipe(recipeId: string) {
  const r = await db.recipes.get(recipeId);
  if (!r) throw new Error("Recette introuvable");
  const img = await requestIllustration(
    r.title,
    r.ingredients.slice(0, 6).map((i) => i.name),
  );
  return setRecipeImage(recipeId, base64ToBlob(img.base64, img.mimeType), "generated");
}

/* ───────────── À revoir (fonctionne hors ligne) ───────────── */

async function queueReviewItem(item: ReviewItem) {
  await db.reviewItems.put(item);
  if (getRepository().mode === "local") return;
  await db.outbox.add({ kind: "reviewItem.upsert", payload: item, createdAt: new Date().toISOString() });
  if (navigator.onLine) {
    const { flushOutbox } = await import("./sync");
    flushOutbox().catch(() => {
      /* réessayé au prochain retour réseau */
    });
  }
}

export async function addManualReview(recipeId: string, note: string, field: string | null = null) {
  const session = await getRepository().getSession();
  await queueReviewItem({
    id: newId(),
    recipeId,
    kind: "manual",
    field,
    note: note.trim(),
    done: false,
    createdBy: session?.userId ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function setReviewDone(item: ReviewItem, done: boolean) {
  await queueReviewItem({ ...item, done });
}

/* ───────────── Réglages ───────────── */

export const DEFAULT_SETTINGS: UserSettings = {
  autoIllustrations: false,
  proteinRichThresholdG: 20,
  dailyTargets: { kcal: null, proteinMinG: null },
  planning: PLANNING_DEFAULTS,
};

export async function saveSettings(settings: UserSettings) {
  requireOnline();
  await getRepository().saveSettings(settings);
  await setMeta("settings", settings);
}

export async function loadSettings(): Promise<UserSettings> {
  return { ...DEFAULT_SETTINGS, ...((await getMeta("settings")) ?? {}) };
}

/* ───────────── Planning (V2) ───────────── */

export async function savePlanEntries(entries: MealPlanEntry[]) {
  requireOnline();
  await getRepository().upsertMealPlans(entries);
  await db.mealPlans.bulkPut(entries);
}

export async function removePlanEntries(entries: MealPlanEntry[]) {
  requireOnline();
  await getRepository().deleteMealPlans(entries);
  await db.mealPlans.bulkDelete(entries.map((e) => e.key));
}

export async function saveTemplate(t: MealTemplate) {
  requireOnline();
  await getRepository().saveTemplate(t);
  await db.templates.put(t);
}

export async function deleteTemplate(id: string) {
  requireOnline();
  await getRepository().deleteTemplate(id);
  await db.templates.delete(id);
}

export async function addPantryBasic(name: string) {
  requireOnline();
  const clean = name.trim().toLowerCase();
  if (!clean || (await db.pantry.where("name").equals(clean).count())) return;
  const b: PantryBasic = { id: newId(), name: clean };
  await getRepository().savePantryBasic(b);
  await db.pantry.put(b);
}

export async function removePantryBasic(id: string) {
  requireOnline();
  await getRepository().deletePantryBasic(id);
  await db.pantry.delete(id);
}

/* ───────────── Ingrédients perso (V2) ───────────── */

export async function saveCustomIngredient(c: CustomIngredient) {
  requireOnline();
  await getRepository().saveCustomIngredient(c);
  await db.customIngredients.put(c);
}

export async function deleteCustomIngredient(id: string) {
  requireOnline();
  await getRepository().deleteCustomIngredient(id);
  await db.customIngredients.delete(id);
}

/* ───────────── Liste de courses (locale) ───────────── */

export const EMPTY_SHOPPING: ShoppingState = { extras: [], servings: {}, excluded: [], checked: [] };

export async function updateShopping(fn: (s: ShoppingState) => ShoppingState) {
  const cur = { ...EMPTY_SHOPPING, ...((await getMeta("shopping")) ?? {}) };
  await setMeta("shopping", fn(cur));
}

export async function addToShopping(recipe: Recipe) {
  await updateShopping((s) => ({
    ...s,
    extras: s.extras.some((e) => e.recipeId === recipe.id)
      ? s.extras
      : [...s.extras, { recipeId: recipe.id, servings: recipe.yieldQuantity || 1 }],
    excluded: s.excluded.filter((id) => id !== recipe.id),
  }));
}

/** Sauvegarde complète en JSON (réglages → « Exporter mes recettes »). */
export async function exportAll() {
  const recipes = await db.recipes.toArray();
  return JSON.stringify({ exportedAt: new Date().toISOString(), recipes }, null, 2);
}

