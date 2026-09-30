/**
 * Écritures. Chaque action met à jour la base distante PUIS le cache local,
 * pour que l'interface (qui lit le cache) se mette à jour d'elle-même.
 */
import { newId } from "@/lib/ids";
import { timersIn } from "@/lib/recipes/markers";
import { AUTO_REVIEW_RULES, autoReviewNotes } from "@/lib/recipes/review";
import type { Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";
import { getRepository } from ".";
import { db, getMeta, setMeta } from "./db";

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
};

export async function saveSettings(settings: UserSettings) {
  requireOnline();
  await getRepository().saveSettings(settings);
  await setMeta("settings", settings);
}

export async function loadSettings(): Promise<UserSettings> {
  return { ...DEFAULT_SETTINGS, ...((await getMeta("settings")) ?? {}) };
}

/** Sauvegarde complète en JSON (réglages → « Exporter mes recettes »). */
export async function exportAll() {
  const recipes = await db.recipes.toArray();
  return JSON.stringify({ exportedAt: new Date().toISOString(), recipes }, null, 2);
}

