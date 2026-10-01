/**
 * État de la liste de courses d'un FOYER, et sa traduction en opérations
 * pour le serveur. L'appli modifie l'état en entier (comme avant) ; on en
 * déduit les opérations à envoyer (gardées en file d'attente hors ligne).
 * Fonctions pures, testées dans state.test.ts.
 */

export interface PersonalItem {
  id: string;
  text: string;
  aisle: string;
}

export interface ShoppingState {
  /** Recettes ajoutées à la main (fiche → « Ajouter aux courses »). */
  extras: { recipeId: string; servings: number }[];
  /** Quantités modifiées, par recette. */
  servings: Record<string, number>;
  /** Recettes du menu retirées de la liste. */
  excluded: string[];
  /** Articles cochés (clé d'article). */
  checked: string[];
  /** Articles ajoutés à la main (papier toilette, farine T55…). */
  mine: PersonalItem[];
}

export const EMPTY_SHOPPING: ShoppingState = { extras: [], servings: {}, excluded: [], checked: [], mine: [] };

/** Ligne « recette de la liste » côté serveur (null = plus rien à retenir). */
export interface ShoppingRecipeRow {
  recipeId: string;
  extra: boolean;
  extraServings: number | null;
  excluded: boolean;
  servings: number | null;
}

export type ShoppingOp =
  | { kind: "recipe"; recipeId: string; row: ShoppingRecipeRow | null }
  | { kind: "check"; key: string; on: boolean }
  | { kind: "item"; id: string; item: PersonalItem | null };

function recipeRow(s: ShoppingState, recipeId: string): ShoppingRecipeRow | null {
  const extra = s.extras.find((e) => e.recipeId === recipeId);
  const excluded = s.excluded.includes(recipeId);
  const servings = s.servings[recipeId] ?? null;
  if (!extra && !excluded && servings == null) return null;
  return { recipeId, extra: !!extra, extraServings: extra?.servings ?? null, excluded, servings };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Opérations qui font passer le serveur de `before` à `after`. */
export function diffShopping(before: ShoppingState, after: ShoppingState): ShoppingOp[] {
  const ops: ShoppingOp[] = [];
  const ids = new Set([
    ...before.extras.map((e) => e.recipeId),
    ...after.extras.map((e) => e.recipeId),
    ...before.excluded,
    ...after.excluded,
    ...Object.keys(before.servings),
    ...Object.keys(after.servings),
  ]);
  for (const id of ids) {
    const a = recipeRow(before, id);
    const b = recipeRow(after, id);
    if (!same(a, b)) ops.push({ kind: "recipe", recipeId: id, row: b });
  }
  const was = new Set(before.checked);
  const now = new Set(after.checked);
  for (const k of now) if (!was.has(k)) ops.push({ kind: "check", key: k, on: true });
  for (const k of was) if (!now.has(k)) ops.push({ kind: "check", key: k, on: false });
  for (const m of after.mine) {
    const old = before.mine.find((x) => x.id === m.id);
    if (!same(old, m)) ops.push({ kind: "item", id: m.id, item: m });
  }
  for (const m of before.mine) if (!after.mine.some((x) => x.id === m.id)) ops.push({ kind: "item", id: m.id, item: null });
  return ops;
}

/** Reconstruit l'état depuis les lignes du serveur. */
export function shoppingFromRows(rows: ShoppingRecipeRow[], checks: string[], items: PersonalItem[]): ShoppingState {
  return {
    extras: rows.filter((r) => r.extra).map((r) => ({ recipeId: r.recipeId, servings: r.extraServings ?? 1 })),
    servings: Object.fromEntries(rows.filter((r) => r.servings != null).map((r) => [r.recipeId, r.servings!])),
    excluded: rows.filter((r) => r.excluded).map((r) => r.recipeId),
    checked: [...checks],
    mine: [...items],
  };
}

/** Applique des opérations à un état (pour garder les envois en attente par-dessus une synchro). */
export function applyShoppingOps(state: ShoppingState, ops: ShoppingOp[]): ShoppingState {
  const s = { ...state, extras: [...state.extras], servings: { ...state.servings }, excluded: [...state.excluded], checked: [...state.checked], mine: [...state.mine] };
  for (const op of ops) {
    if (op.kind === "check") {
      s.checked = op.on ? [...new Set([...s.checked, op.key])] : s.checked.filter((k) => k !== op.key);
    } else if (op.kind === "item") {
      s.mine = s.mine.filter((m) => m.id !== op.id);
      if (op.item) s.mine.push(op.item);
    } else {
      const r = op.row;
      s.extras = s.extras.filter((e) => e.recipeId !== op.recipeId);
      s.excluded = s.excluded.filter((id) => id !== op.recipeId);
      delete s.servings[op.recipeId];
      if (r?.extra) s.extras.push({ recipeId: op.recipeId, servings: r.extraServings ?? 1 });
      if (r?.excluded) s.excluded.push(op.recipeId);
      if (r?.servings != null) s.servings[op.recipeId] = r.servings;
    }
  }
  return s;
}
