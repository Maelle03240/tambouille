/**
 * Synchro : envoie la file d'attente (notes « à revoir », cases de la liste
 * de courses… faites hors ligne), puis recopie le serveur dans le cache
 * local : recettes, et menu / courses / basiques du foyer affiché.
 * Appelée au lancement, au retour du réseau et après connexion.
 * L'état (en cours / erreur) est observable par l'interface via
 * `subscribeSync` + `getSyncStatus` (useSyncExternalStore).
 */
import { getRepository } from ".";
import { applyShoppingOps, diffShopping, EMPTY_SHOPPING, type ShoppingOp } from "@/lib/shopping/state";
import { db, getMeta, setMeta } from "./db";

/** Dernier foyer choisi sur cet appareil. */
const HOUSEHOLD_KEY = "tambouille:household";
export function preferredHousehold(): string | null {
  try {
    return localStorage.getItem(HOUSEHOLD_KEY);
  } catch {
    return null;
  }
}
export function rememberHousehold(id: string | null) {
  try {
    if (id) localStorage.setItem(HOUSEHOLD_KEY, id);
    else localStorage.removeItem(HOUSEHOLD_KEY);
  } catch {}
}

export interface SyncStatus {
  syncing: boolean;
  error: string | null;
}

let status: SyncStatus = { syncing: false, error: null };
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export function subscribeSync(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSyncStatus = () => status;

let running: Promise<void> | null = null;

export async function flushOutbox(): Promise<void> {
  const repo = getRepository();
  const ops = await db.outbox.orderBy("seq").toArray();
  for (const op of ops) {
    try {
      if (op.kind === "reviewItem.upsert") await repo.upsertReviewItems([op.payload]);
      else await repo.applyShoppingOps(op.householdId, [op.payload]);
    } catch (e) {
      // hors ligne : on réessaiera ; refusée par le serveur (recette supprimée…) : on l'abandonne
      if (typeof navigator !== "undefined" && !navigator.onLine) throw e;
      console.warn("Écriture abandonnée", op, e);
    }
    await db.outbox.delete(op.seq!);
  }
}

async function doSync() {
  const repo = getRepository();
  if (repo.mode === "local") return;
  if (!(await repo.getSession())) return;

  await flushOutbox();
  // avant les foyers, la liste de courses ne vivait que sur l'appareil
  const firstWithHouseholds = (await getMeta("householdId")) === undefined;
  const deviceShopping = await getMeta("shopping");
  repo.setHousehold(preferredHousehold());
  const snap = await repo.fetchSnapshot();
  rememberHousehold(snap.householdId);
  const pending = await db.outbox.toArray();
  const pendingIds = new Set(pending.flatMap((o) => (o.kind === "reviewItem.upsert" ? [o.payload.id] : [])));
  const pendingShopping = pending.flatMap((o): ShoppingOp[] => (o.kind === "shopping" && o.householdId === snap.householdId ? [o.payload] : []));
  // première synchro avec les foyers : la liste de l'appareil part dans le foyer (s'il n'en a pas encore)
  const serverEmpty = !!snap.shopping && !diffShopping(EMPTY_SHOPPING, snap.shopping).length;
  if (firstWithHouseholds && deviceShopping && snap.householdId && serverEmpty) {
    const moved = diffShopping(EMPTY_SHOPPING, deviceShopping);
    if (moved.length) {
      const now = new Date().toISOString();
      await db.outbox.bulkAdd(moved.map((payload) => ({ kind: "shopping" as const, householdId: snap.householdId!, payload, createdAt: now })));
      pendingShopping.push(...moved);
    }
  }

  await db.transaction("rw", [db.recipes, db.reviewItems, db.meta, db.mealPlans, db.templates, db.pantry, db.customIngredients], async () => {
    await db.recipes.clear();
    await db.recipes.bulkPut(snap.recipes);
    // on garde les notes locales pas encore envoyées
    const localPending = (await db.reviewItems.toArray()).filter((r) => pendingIds.has(r.id));
    await db.reviewItems.clear();
    await db.reviewItems.bulkPut([...snap.reviewItems, ...localPending]);
    await db.mealPlans.clear();
    await db.mealPlans.bulkPut(snap.mealPlans);
    await db.templates.clear();
    await db.templates.bulkPut(snap.templates);
    await db.pantry.clear();
    await db.pantry.bulkPut(snap.pantry);
    await db.customIngredients.clear();
    await db.customIngredients.bulkPut(snap.customIngredients);
    if (snap.profile) await setMeta("profile", snap.profile);
    if (snap.settings) await setMeta("settings", snap.settings);
    await setMeta("households", snap.households);
    await setMeta("householdId", snap.householdId);
    await setMeta("housemates", snap.housemates);
    await setMeta("people", snap.people);
    if (snap.shopping) await setMeta("shopping", applyShoppingOps(snap.shopping, pendingShopping));
    else await db.meta.delete("shopping");
    await setMeta("lastSyncAt", new Date().toISOString());
  });
  if (pendingShopping.length) await flushOutbox().catch(() => {});
}

let queued: Promise<void> | null = null;

/**
 * Une seule synchro à la fois. Si une synchro tourne déjà, on en refait une
 * juste après (elle a pu partir avant le changement : foyer, écriture…).
 * Ne lève jamais.
 */
export function syncNow(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return Promise.resolve();
  if (running) {
    queued ??= running.then(() => {
      queued = null;
      return syncNow();
    });
    return queued;
  }
  setStatus({ syncing: true, error: status.error });
  running = doSync()
    .then(() => setStatus({ syncing: false, error: null }))
    .catch((e) => setStatus({ syncing: false, error: e instanceof Error ? e.message : "Synchro impossible" }))
    .finally(() => (running = null));
  return running;
}
