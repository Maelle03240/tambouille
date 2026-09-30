/**
 * Synchro : envoie la file d'attente (notes « à revoir » ajoutées hors ligne),
 * puis recopie toutes les recettes du serveur dans le cache local.
 * Appelée au lancement, au retour du réseau et après connexion.
 * L'état (en cours / erreur) est observable par l'interface via
 * `subscribeSync` + `getSyncStatus` (useSyncExternalStore).
 */
import { getRepository } from ".";
import { db, setMeta } from "./db";

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
    if (op.kind === "reviewItem.upsert") await repo.upsertReviewItems([op.payload]);
    await db.outbox.delete(op.seq!);
  }
}

async function doSync() {
  const repo = getRepository();
  if (repo.mode === "local") return;
  if (!(await repo.getSession())) return;

  await flushOutbox();
  const snap = await repo.fetchSnapshot();
  const pending = await db.outbox.toArray();
  const pendingIds = new Set(pending.map((o) => o.payload.id));

  await db.transaction("rw", [db.recipes, db.reviewItems, db.meta, db.mealPlans, db.templates, db.pantry], async () => {
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
    if (snap.profile) await setMeta("profile", snap.profile);
    if (snap.settings) await setMeta("settings", snap.settings);
    await setMeta("lastSyncAt", new Date().toISOString());
  });
}

/** Une seule synchro à la fois ; les appels simultanés attendent la même. Ne lève jamais. */
export function syncNow(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return Promise.resolve();
  if (!running) {
    setStatus({ syncing: true, error: status.error });
    running = doSync()
      .then(() => setStatus({ syncing: false, error: null }))
      .catch((e) => setStatus({ syncing: false, error: e instanceof Error ? e.message : "Synchro impossible" }))
      .finally(() => (running = null));
  }
  return running;
}
