/**
 * Écritures. Chaque action met à jour la base distante PUIS le cache local,
 * pour que l'interface (qui lit le cache) se mette à jour d'elle-même.
 */
import { newId } from "@/lib/ids";
import { timersIn } from "@/lib/recipes/markers";
import { AUTO_REVIEW_RULES, autoReviewNotes } from "@/lib/recipes/review";
import { applyBlocks, forkRecipe, reviewProposal, type BlockKey } from "@/lib/recipes/proposals";
import { PLANNING_DEFAULTS } from "@/config/planning";
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { CustomIngredient, Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";
import { getRepository } from ".";
import { base64ToBlob, compressForStorage } from "@/lib/import/image";
import { requestIllustration } from "@/lib/import/client";
import { diffShopping, EMPTY_SHOPPING } from "@/lib/shopping/state";
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
  /** Membre : créer sa version même sans changement (ex. pour y mettre une image). */
  forceFork?: boolean;
}

/** Qui suis-je ? (mode local : admin) */
async function me() {
  if (getRepository().mode === "local") return { id: null, admin: true };
  const profile = await getMeta("profile");
  return { id: profile?.id ?? null, admin: profile?.role === "admin" };
}

/**
 * Enregistre une recette. L'admin écrit dans la bibliothèque. Un membre :
 * - nouvelle recette → recette perso, proposée à l'admin ;
 * - sa recette perso → mise à jour, proposition remise en attente ;
 * - recette de la bibliothèque → crée SA version (nouvel id), proposée.
 * Renvoie la recette enregistrée (l'écran suit son id, qui peut changer).
 */
export async function saveRecipe(input: Recipe, opts: SaveOptions = {}): Promise<Recipe> {
  requireOnline();
  const who = await me();
  const existing = await db.recipes.get(input.id);
  let toSave = input;
  if (!who.admin && who.id) {
    if (!existing) toSave = { ...input, status: "personal", ownerId: who.id, proposalStatus: "pending" };
    else if (existing.status === "personal") toSave = { ...input, proposalStatus: "pending" };
    else {
      // sa version : le contenu modifié, et l'originale telle qu'elle était
      const fork = forkRecipe(input, who.id);
      toSave = { ...fork, forkBase: { ...fork.forkBase!, recipe: existing } };
      // rien de changé : pas de version (ni de proposition) vide
      if (!opts.forceFork && !reviewProposal(toSave, existing).changed.length) return existing;
    }
  }
  const recipe = normalizeRecipe(toSave);
  const repo = getRepository();
  await repo.saveRecipe(recipe);
  await db.recipes.put(recipe);
  await refreshAutoReview(recipe, opts.keepForReview ?? []);
  return recipe;
}

/** Peut-on écrire directement dans cette recette ? (sinon : une version perso sera créée) */
export async function writesInPlace(recipe: Recipe) {
  const who = await me();
  return who.admin || (recipe.status === "personal" && recipe.ownerId === who.id);
}

/**
 * Met à jour les points « à revoir » automatiques de la recette :
 * supprime ceux dont le champ est maintenant rempli, ajoute les nouveaux.
 */
async function refreshAutoReview(recipe: Recipe, extra: { field: string; note: string }[]) {
  const repo = getRepository();
  const me = (await repo.getSession())?.userId ?? null;
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
      createdBy: me === "local" ? null : me,
      createdAt: new Date().toISOString(),
    }));

  await repo.deleteReviewItems(toDelete.map((i) => i.id));
  await repo.upsertReviewItems(toAdd);
  await db.reviewItems.bulkDelete(toDelete.map((i) => i.id));
  await db.reviewItems.bulkPut(toAdd);
}

export async function deleteRecipe(id: string) {
  requireOnline();
  const r = await db.recipes.get(id);
  // une version perso : menus et courses repassent sur l'originale
  if (r?.status === "personal" && r.forkedFromId) await getRepository().retireFork(id);
  else await getRepository().deleteRecipe(id);
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
  let current = await db.recipes.get(recipeId);
  if (!current) throw new Error("Recette introuvable");
  // un membre sur une recette de la bibliothèque : l'image va dans sa version
  if (!(await writesInPlace(current))) current = await saveRecipe(current, { forceFork: true });
  if (kind === "generated" && current.imageKind === "personal") return current;
  const blob = await compressForStorage(source);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const repo = getRepository();
  const imagePath = await repo.uploadImage(`${current.id}/${Date.now()}.${ext}`, blob);
  const saved = await patchRecipe(current.id, { imagePath, imageKind: kind });
  // l'ancienne image n'est supprimée que si elle appartient à cette recette (pas à l'originale)
  if (current.imagePath && current.imagePath !== imagePath && current.imagePath.startsWith(`${current.id}/`)) {
    await repo.deleteImage(current.imagePath).catch(() => {});
  }
  return saved;
}

export async function removeRecipeImage(recipeId: string) {
  requireOnline();
  const current = await db.recipes.get(recipeId);
  if (!current?.imagePath) return;
  if (current.imagePath.startsWith(`${current.id}/`) && (await writesInPlace(current))) {
    await getRepository().deleteImage(current.imagePath).catch(() => {});
  }
  return patchRecipe(recipeId, { imagePath: null, imageKind: "none" });
}

/** Illustration IA (style vieux livre de cuisine), puis enregistrement. */
export async function illustrateRecipe(recipeId: string) {
  const r = await db.recipes.get(recipeId);
  if (!r) throw new Error("Recette introuvable");
  const img = await requestIllustration(
    r.title,
    r.ingredients.slice(0, 6).map((i) => i.name),
    r.tags.includes("meal-prep"),
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
  // une recette remise au menu revient dans la liste de courses (si on l'en avait retirée)
  const ids = new Set(entries.map((e) => e.recipeId).filter(Boolean));
  const excluded = (await getMeta("shopping"))?.excluded ?? [];
  if (excluded.some((id) => ids.has(id))) await updateShopping((sh) => ({ ...sh, excluded: sh.excluded.filter((id) => !ids.has(id)) }));
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

/** Idées de recettes à ajouter : enregistrées tout de suite sur l'appareil. */
export async function addIdea(text: string) {
  const idea = { id: newId(), text: text.trim() };
  if (!idea.text) return;
  await setMeta("ideas", [...((await getMeta("ideas")) ?? []), idea]);
  await getRepository().saveIdea(idea);
}

export async function deleteIdea(id: string) {
  await setMeta("ideas", ((await getMeta("ideas")) ?? []).filter((x) => x.id !== id));
  await getRepository().deleteIdea(id);
}

export async function deleteCustomIngredient(id: string) {
  requireOnline();
  await getRepository().deleteCustomIngredient(id);
  await db.customIngredients.delete(id);
}

/* ───────────── Liste de courses du foyer (fonctionne hors ligne) ───────────── */

export { EMPTY_SHOPPING };

/** Mode frigo vide : liste de ce que j'ai (sur cet appareil). */
export async function setFridge(items: string[]) {
  await setMeta("fridge", items);
}

export async function setFridgeBasics(on: boolean) {
  await setMeta("fridgeBasics", on);
}

/**
 * Modifie la liste : tout de suite dans le cache (l'écran se met à jour,
 * même hors ligne), puis les changements partent au serveur via la file
 * d'attente (envoyée maintenant si on a du réseau, sinon au retour).
 */
export async function updateShopping(fn: (s: ShoppingState) => ShoppingState) {
  const cur = { ...EMPTY_SHOPPING, ...((await getMeta("shopping")) ?? {}) };
  const next = fn(cur);
  await setMeta("shopping", next);
  const householdId = await getMeta("householdId");
  if (getRepository().mode === "local" || !householdId) return;
  const now = new Date().toISOString();
  const ops = diffShopping(cur, next);
  if (!ops.length) return;
  await db.outbox.bulkAdd(ops.map((payload) => ({ kind: "shopping" as const, householdId, payload, createdAt: now })));
  if (navigator.onLine) {
    const { flushOutbox } = await import("./sync");
    flushOutbox().catch(() => {
      /* réessayé au prochain retour réseau */
    });
  }
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


/* ───────────── Foyers ───────────── */

/** Change le foyer affiché : son menu, ses courses, ses objectifs… */
export async function switchHousehold(id: string) {
  requireOnline();
  const { flushOutbox, rememberHousehold, syncNow } = await import("./sync");
  await flushOutbox();
  rememberHousehold(id);
  getRepository().setHousehold(id);
  await db.transaction("rw", [db.mealPlans, db.templates, db.pantry, db.meta], async () => {
    await db.mealPlans.clear();
    await db.templates.clear();
    await db.pantry.clear();
    await db.meta.delete("shopping");
    await setMeta("householdId", id);
  });
  await syncNow();
}

export async function renameHousehold(id: string, name: string) {
  requireOnline();
  const clean = name.trim();
  if (!clean) return;
  await getRepository().renameHousehold(id, clean);
  const list = (await getMeta("households")) ?? [];
  await setMeta("households", list.map((h) => (h.id === id ? { ...h, name: clean } : h)));
}

/* ───────────── Compte ───────────── */

export async function setPassword(password: string) {
  if (password.length < 8) throw new Error("8 caractères minimum.");
  await getRepository().updatePassword(password);
}

export async function sendPasswordReset(email: string) {
  await getRepository().sendPasswordReset(email.trim(), `${location.origin}/bienvenue`);
}

/** Vide le cache de l'appareil (déconnexion). */
export async function clearLocalData() {
  await Promise.all([
    db.recipes.clear(),
    db.reviewItems.clear(),
    db.outbox.clear(),
    db.meta.clear(),
    db.mealPlans.clear(),
    db.templates.clear(),
    db.pantry.clear(),
    db.customIngredients.clear(),
  ]);
  const { rememberHousehold } = await import("./sync");
  rememberHousehold(null);
}

/* ───────────── Propositions (admin) ───────────── */

const withNew = (tags: string[]) => (tags.includes("a-tester") ? tags : [...tags, "a-tester"]);

/** Recette perso créée par un membre → bibliothèque, avec le sticker NEW (à vérifier en la cuisinant). */
export async function acceptCreation(id: string) {
  requireOnline();
  await getRepository().setRecipeStatus(id, { status: "library", proposalStatus: null });
  await db.recipes.update(id, { status: "library", proposalStatus: null });
  const r = await db.recipes.get(id);
  if (r && !r.tags.includes("a-tester")) await patchRecipe(id, { tags: withNew(r.tags) });
}

export async function refuseProposal(id: string) {
  requireOnline();
  await getRepository().setRecipeStatus(id, { proposalStatus: "refused" });
  await db.recipes.update(id, { proposalStatus: "refused" });
}

/**
 * Version perso acceptée : les blocs choisis rejoignent l'originale, puis la
 * version est retirée (menus, courses, à revoir repassent sur l'originale).
 */
export async function acceptFork(forkId: string, take: readonly BlockKey[]) {
  requireOnline();
  const fork = await db.recipes.get(forkId);
  const original = fork?.forkedFromId ? await db.recipes.get(fork.forkedFromId) : undefined;
  if (!fork || !original) throw new Error("Recette introuvable");
  const review = reviewProposal(fork, original);
  if (take.length) {
    const merged = applyBlocks(original, review.theirs, take);
    // acceptée : NEW, il y a peut-être des choses à revoir en la cuisinant
    await saveRecipe({ ...merged, tags: withNew(merged.tags) });
  }
  await getRepository().retireFork(forkId);
  await db.recipes.delete(forkId);
  const { syncNow } = await import("./sync");
  void syncNow();
}
