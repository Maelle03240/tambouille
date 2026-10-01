/**
 * VERSIONS PERSO ET PROPOSITIONS (docs/DECISIONS.md, famille étape 2).
 * - Un membre qui modifie une recette de la bibliothèque crée sa version
 *   perso (« fork ») : une copie avec ses propres identifiants, qui garde la
 *   recette d'origine telle qu'elle était (`forkBase`).
 * - L'admin accepte bloc par bloc (titre, ingrédients et étapes…) : on
 *   compare la version perso à son point de départ ; si l'admin a modifié
 *   le même bloc entre-temps, c'est un conflit et sa version reste par défaut.
 * Fonctions pures, testées dans proposals.test.ts.
 */
import { newId } from "@/lib/ids";
import type { Recipe } from "./types";

/** Blocs comparés et fusionnés ensemble. */
export const BLOCKS = [
  { key: "title", label: "Titre", fields: ["title"] },
  { key: "category", label: "Catégorie et moments", fields: ["category", "moments"] },
  { key: "tags", label: "Tags", fields: ["tags", "isOccasion"] },
  { key: "yield", label: "Portions", fields: ["yieldQuantity", "yieldUnit", "portionSize"] },
  { key: "times", label: "Temps", fields: ["prepMinutes", "cookMinutes"] },
  {
    key: "nutrition",
    label: "Valeurs nutritionnelles",
    fields: ["kcal", "proteinG", "fatG", "carbsG", "fiberG", "hasVegetables", "proteinSource", "nutritionConfidence", "totalWeightG"],
  },
  { key: "notes", label: "Notes", fields: ["personalNotes"] },
  { key: "image", label: "Image", fields: ["imagePath", "imageKind"] },
  { key: "content", label: "Ingrédients et étapes", fields: ["ingredients", "steps"] },
] as const satisfies readonly { key: string; label: string; fields: readonly (keyof Recipe)[] }[];

export type BlockKey = (typeof BLOCKS)[number]["key"];

/** Le tag « Nouveau » est propre à chacun : il ne compte pas comme une modification. */
const comparable = (r: Recipe, field: keyof Recipe): unknown => {
  if (field === "tags") return r.tags.filter((t) => t !== "a-tester").sort();
  if (field === "ingredients")
    return r.ingredients.map(({ id, section, name, quantity, unit, gramsEstimate, aisle, scalable, customIngredientId }) => ({
      id, section, name, quantity, unit, gramsEstimate, aisle, scalable, customIngredientId,
    }));
  if (field === "steps") return r.steps.map(({ id, text }) => ({ id, text }));
  return r[field] ?? null;
};

function blockValue(r: Recipe, key: BlockKey) {
  const block = BLOCKS.find((b) => b.key === key)!;
  return JSON.stringify(block.fields.map((f) => comparable(r, f)));
}

const replaceIds = (text: string, map: Record<string, string>) =>
  text.replace(/\{\{ing:([^}]+)\}\}/g, (all, id: string) => (map[id] ? `{{ing:${map[id]}}}` : all));

/** Crée la version perso d'une recette de la bibliothèque (nouveaux identifiants partout). */
export function forkRecipe(original: Recipe, ownerId: string, makeId: () => string = newId): Recipe {
  const forward: Record<string, string> = {};
  const idMap: Record<string, string> = {};
  for (const x of [...original.ingredients, ...original.steps]) {
    forward[x.id] = makeId();
    idMap[forward[x.id]] = x.id;
  }
  const now = new Date().toISOString();
  return {
    ...original,
    id: makeId(),
    ownerId,
    status: "personal",
    forkedFromId: original.id,
    forkBase: { recipe: original, idMap },
    proposalStatus: "pending",
    createdAt: now,
    updatedAt: now,
    ingredients: original.ingredients.map((i) => ({ ...i, id: forward[i.id] })),
    steps: original.steps.map((s) => ({ ...s, id: forward[s.id], text: replaceIds(s.text, forward) })),
  };
}

/**
 * La version perso exprimée avec les identifiants de l'originale (pour la
 * comparer et la fusionner) ; ce qu'elle a ajouté reçoit de nouveaux ids.
 */
export function toOriginalIds(fork: Recipe, makeId: () => string = newId): Recipe {
  const map: Record<string, string> = { ...(fork.forkBase?.idMap ?? {}) };
  for (const x of [...fork.ingredients, ...fork.steps]) map[x.id] ??= makeId();
  return {
    ...fork,
    id: fork.forkedFromId ?? fork.id,
    ingredients: fork.ingredients.map((i) => ({ ...i, id: map[i.id] })),
    steps: fork.steps.map((s) => ({ ...s, id: map[s.id], text: replaceIds(s.text, map) })),
  };
}

export interface ProposalReview {
  /** Version perso, identifiants de l'originale. */
  theirs: Recipe;
  /** Blocs changés par le membre. */
  changed: BlockKey[];
  /** Parmi eux, ceux que l'admin a aussi changés depuis (sa version reste par défaut). */
  conflicts: BlockKey[];
}

/** Ce qu'une version perso propose de changer à l'originale actuelle. */
export function reviewProposal(fork: Recipe, current: Recipe, makeId: () => string = newId): ProposalReview {
  const base = fork.forkBase?.recipe;
  const theirs = toOriginalIds(fork, makeId);
  if (!base) return { theirs, changed: [], conflicts: [] };
  const changed = BLOCKS.map((b) => b.key).filter((k) => blockValue(theirs, k) !== blockValue(base, k));
  const conflicts = changed.filter((k) => blockValue(current, k) !== blockValue(base, k) && blockValue(current, k) !== blockValue(theirs, k));
  return { theirs, changed, conflicts };
}

/** L'originale, avec les blocs choisis repris de la version perso. */
export function applyBlocks(current: Recipe, theirs: Recipe, take: readonly BlockKey[]): Recipe {
  const out: Recipe = { ...current };
  for (const block of BLOCKS) {
    if (!take.includes(block.key)) continue;
    for (const f of block.fields) {
      if (f === "tags") {
        // le tag « Nouveau » de l'originale ne bouge pas
        const keepNew = current.tags.includes("a-tester");
        out.tags = [...theirs.tags.filter((t) => t !== "a-tester"), ...(keepNew ? ["a-tester"] : [])];
      } else {
        (out as unknown as Record<string, unknown>)[f] = theirs[f];
      }
    }
  }
  return out;
}

/** Choix par défaut : tout ce qui a changé, sauf les conflits (l'admin d'abord). */
export const defaultTake = (r: ProposalReview): BlockKey[] => r.changed.filter((k) => !r.conflicts.includes(k));

/** Résumé lisible d'un bloc, pour l'affichage avant / après. */
export function blockLines(r: Recipe, key: BlockKey, labelOf: (id: string) => string = (x) => x): string[] {
  const show = (v: unknown) => (v == null || v === "" ? "—" : String(v));
  switch (key) {
    case "title":
      return [r.title];
    case "category":
      return [`${labelOf(r.category ?? "")} · ${r.moments.map(labelOf).join(", ") || "—"}`];
    case "tags":
      return [r.tags.filter((t) => t !== "a-tester").map(labelOf).join(", ") || "—", ...(r.isOccasion ? ["Fêtes"] : [])];
    case "yield":
      return [`${show(r.yieldQuantity)} ${r.yieldUnit}`];
    case "times":
      return [`Prép. ${show(r.prepMinutes)} min · cuisson ${show(r.cookMinutes)} min`];
    case "nutrition":
      return [`${show(r.kcal)} kcal · ${show(r.proteinG)} g prot. · ${show(r.fatG)} g lip. · ${show(r.carbsG)} g gluc. · ${show(r.fiberG)} g fibres`];
    case "notes":
      return [r.personalNotes || "—"];
    case "image":
      return [r.imagePath ? (r.imageKind === "generated" ? "Illustration" : "Photo") : "Pas d'image"];
    case "content": {
      const names = Object.fromEntries(r.ingredients.map((i) => [i.id, i.name]));
      return [
        ...r.ingredients.map((i) => `• ${[i.quantity, i.unit].filter((x) => x != null && x !== "").join(" ")} ${i.name}`.replace("•  ", "• ")),
        ...r.steps.map((s, n) => `${n + 1}. ${s.text.replace(/\{\{ing:([^}]+)\}\}/g, (_, id: string) => names[id] ?? "").replace(/\{\{timer:([\d.]+)\}\}/g, "$1 min")}`),
      ];
    }
  }
}
