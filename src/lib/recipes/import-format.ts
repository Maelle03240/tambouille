/**
 * FORMAT D'IMPORT — le même pour :
 *   - la réponse de l'IA (lecture photo / capture / texte / lien),
 *   - le secours « coller du JSON » (recette structurée ailleurs, ex. Claude).
 *
 * Validé par zod de façon tolérante (valeurs manquantes → null), puis converti
 * en `Recipe` par `importToRecipe`. Documenté pour l'utilisatrice dans
 * docs/FORMAT-IMPORT.md.
 */
import { z } from "zod";
import { CATEGORY_IDS } from "@/config/categories";
import { newId } from "@/lib/ids";
import { emptyRecipe } from "./factory";
import { stripArticlesBeforeTokens, tokensToMarkers, timersIn } from "./markers";
import { normalizeUnit, parseIngredientLine } from "./quantities";
import type { Ingredient, Recipe, SourceType, Step } from "./types";

const num = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return isFinite(n) ? n : null;
  });

const str = z.string().nullish().transform((v) => v ?? "");

export const importIngredientSchema = z.object({
  section: z.string().nullish(),
  text: str,
  quantity: num,
  unit: str,
  name: str,
  grams_estimate: num,
  aisle: z.string().nullish(),
  scalable: z.boolean().nullish(),
});

export const importSchema = z.object({
  title: z.string().min(1, "Titre manquant"),
  category: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  yield_quantity: num,
  yield_unit: str,
  portion_size: num,
  prep_minutes: num,
  cook_minutes: num,
  ingredients: z.array(importIngredientSchema).default([]),
  /** Étapes avec jetons {nom d'ingrédient} et {8 min}. */
  steps: z.array(z.union([z.string(), z.object({ text: z.string() })])).default([]),
  nutrition_per_portion: z
    .object({ kcal: num, protein_g: num, fat_g: num, carbs_g: num, fiber_g: num })
    .nullish(),
  has_vegetables: z.boolean().nullish(),
  protein_source: z.enum(["viande", "poisson", "oeuf", "laitier", "vegetal", "poudre"]).nullish().catch(null),
  total_weight_g: num,
  is_occasion: z.boolean().nullish(),
  personal_notes: z.string().nullish(),
  uncertain: z
    .array(
      z.object({
        field: z.string(),
        question: z.string().nullish(),
        options: z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});

export type ImportData = z.infer<typeof importSchema>;

/** Point à vérifier sur l'écran de vérification. `key` = clé de champ de l'éditeur. */
export interface Doubt {
  key: string;
  question: string;
  options: string[];
}

const SCALAR_FIELDS: Record<string, keyof Recipe> = {
  title: "title",
  category: "category",
  yield_quantity: "yieldQuantity",
  yield_unit: "yieldUnit",
  portion_size: "portionSize",
  prep_minutes: "prepMinutes",
  cook_minutes: "cookMinutes",
  kcal: "kcal",
  protein_g: "proteinG",
  fat_g: "fatG",
  carbs_g: "carbsG",
  fiber_g: "fiberG",
  has_vegetables: "hasVegetables",
  protein_source: "proteinSource",
};

/** Convertit un chemin de l'IA (« ingredients.2.quantity », « prep_minutes ») en clé d'éditeur. */
function doubtKey(field: string, ingredients: Ingredient[], steps: Step[]): string | null {
  const m = field.match(/^(ingredients|steps)\.(\d+)/);
  if (m) {
    const list = m[1] === "ingredients" ? ingredients : steps;
    const item = list[Number(m[2])];
    return item ? `${m[1] === "ingredients" ? "ingredient" : "step"}:${item.id}` : null;
  }
  const last = field.replace(/^nutrition_per_portion\./, "");
  return SCALAR_FIELDS[last] ?? null;
}

export function importToRecipe(data: ImportData, sourceType: SourceType): { recipe: Recipe; doubts: Doubt[] } {
  const base = emptyRecipe();

  const ingredients: Ingredient[] = data.ingredients.map((raw, i) => {
    const text = raw.text.trim();
    const parsed = text ? parseIngredientLine(text) : null;
    const name = raw.name.trim() || parsed?.name || text;
    return {
      id: newId(),
      position: i,
      section: raw.section?.trim() || null,
      name,
      quantity: raw.quantity ?? parsed?.quantity ?? null,
      unit: normalizeUnit(raw.unit || parsed?.unit || ""),
      gramsEstimate: raw.grams_estimate,
      aisle: raw.aisle ?? null,
      scalable: raw.scalable ?? true,
      rawText: text || name,
      customIngredientId: null,
    };
  });

  const steps: Step[] = data.steps.map((s, i) => {
    const source = typeof s === "string" ? s : s.text;
    const { text } = tokensToMarkers(stripArticlesBeforeTokens(source.trim()), ingredients);
    return { id: newId(), position: i, text, timerMinutes: timersIn(text)[0] ?? null };
  });

  const category = CATEGORY_IDS.find((c) => c === data.category) ?? null;
  const n = data.nutrition_per_portion;

  const recipe: Recipe = {
    ...base,
    title: data.title.trim(),
    category,
    tags: [...new Set([...(data.tags ?? []), "a-tester"])],
    yieldQuantity: data.yield_quantity,
    yieldUnit: data.yield_unit || "personnes",
    portionSize: data.portion_size,
    prepMinutes: data.prep_minutes,
    cookMinutes: data.cook_minutes,
    kcal: n?.kcal ?? null,
    proteinG: n?.protein_g ?? null,
    fatG: n?.fat_g ?? null,
    carbsG: n?.carbs_g ?? null,
    fiberG: n?.fiber_g ?? null,
    hasVegetables: data.has_vegetables ?? null,
    proteinSource: data.protein_source ?? null,
    totalWeightG: data.total_weight_g,
    isOccasion: data.is_occasion ?? false,
    personalNotes: data.personal_notes ?? "",
    sourceType,
    ingredients,
    steps,
  };

  const doubts: Doubt[] = [];
  for (const u of data.uncertain ?? []) {
    const key = doubtKey(u.field, ingredients, steps);
    if (!key || doubts.some((d) => d.key === key)) continue;
    doubts.push({ key, question: u.question?.trim() || "À vérifier", options: u.options ?? [] });
  }
  if (!category && !doubts.some((d) => d.key === "category")) {
    doubts.push({ key: "category", question: "Catégorie à choisir", options: [] });
  }
  return { recipe, doubts };
}

/** Lit le JSON collé par l'utilisatrice (accepte un bloc ```json … ```). */
export function parseImportJson(input: string): { ok: true; data: ImportData } | { ok: false; error: string } {
  const cleaned = input.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "Ce n'est pas du JSON valide. Vérifie qu'il est copié en entier." };
  }
  const res = importSchema.safeParse(raw);
  if (!res.success) {
    const first = res.error.issues[0];
    return { ok: false, error: `Format inattendu (${first.path.join(".") || "racine"} : ${first.message}).` };
  }
  return { ok: true, data: res.data };
}
