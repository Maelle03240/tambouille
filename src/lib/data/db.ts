/**
 * Cache local (IndexedDB via Dexie). L'interface lit TOUJOURS ici, en ligne
 * comme hors ligne ; la synchro (sync.ts) le remplit depuis Supabase.
 * En mode local (sans Supabase), c'est la seule source de données.
 *
 * Changer le schéma : ajouter une nouvelle `version(n)` sans modifier les
 * précédentes (Dexie migre tout seul).
 */
import Dexie, { type Table } from "dexie";
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { Profile, Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";

export interface OutboxOp {
  seq?: number;
  kind: "reviewItem.upsert";
  payload: ReviewItem;
  createdAt: string;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

export type MetaKey = "lastSyncAt" | "profile" | "settings" | "features";
export type MetaValue = {
  lastSyncAt: string;
  profile: Profile;
  settings: UserSettings;
  features: { ai: boolean; illustrations: boolean };
};

class CarnetDB extends Dexie {
  recipes!: Table<Recipe, string>;
  reviewItems!: Table<ReviewItem, string>;
  outbox!: Table<OutboxOp, number>;
  meta!: Table<MetaEntry, string>;
  mealPlans!: Table<MealPlanEntry, string>;
  templates!: Table<MealTemplate, string>;
  pantry!: Table<PantryBasic, string>;

  constructor() {
    super("carnet-tambouille");
    this.version(1).stores({
      recipes: "id, title, category, updatedAt",
      reviewItems: "id, recipeId, done",
      outbox: "++seq",
      meta: "key",
    });
    // V2 : planning, modèles, basiques
    this.version(2).stores({
      mealPlans: "key, day",
      templates: "id",
      pantry: "id, name",
    });
  }
}

export const db = new CarnetDB();

export async function getMeta<K extends MetaKey>(key: K): Promise<MetaValue[K] | undefined> {
  const row = await db.meta.get(key);
  return row?.value as MetaValue[K] | undefined;
}

export async function setMeta<K extends MetaKey>(key: K, value: MetaValue[K]) {
  await db.meta.put({ key, value });
}

/** Demande au navigateur de ne pas effacer le cache (important sur iOS). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* non supporté : tant pis */
  }
}
