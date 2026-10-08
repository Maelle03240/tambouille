/**
 * Correspondance colonnes SQL (snake_case) ⇄ modèle appli (camelCase).
 * SEUL endroit à modifier quand on ajoute/renomme une colonne.
 */
import { PLANNING_DEFAULTS } from "@/config/planning";
import { entryKey, type MealPlanEntry, type MealTemplate, type PantryBasic } from "@/lib/planning/types";
import type { CustomIngredient, Ingredient, Profile, Recipe, ReviewItem, Step, UserSettings } from "@/lib/recipes/types";
import { ingredientIdsIn } from "@/lib/recipes/markers";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function recipeFromRow(r: Row): Recipe {
  return {
    id: r.id,
    ownerId: r.owner_id,
    status: r.status ?? "library",
    forkedFromId: r.forked_from_id ?? null,
    forkBase: r.fork_base ?? null,
    proposalStatus: r.proposal_status ?? null,
    title: r.title,
    category: r.category,
    moments: r.moments ?? [],
    tags: r.tags ?? [],
    yieldQuantity: r.yield_quantity,
    yieldUnit: r.yield_unit ?? "",
    portionSize: r.portion_size,
    prepMinutes: r.prep_minutes,
    cookMinutes: r.cook_minutes,
    kcal: r.kcal,
    proteinG: r.protein_g,
    fatG: r.fat_g,
    carbsG: r.carbs_g,
    fiberG: r.fiber_g,
    hasVegetables: r.has_vegetables,
    proteinSource: r.protein_source,
    nutritionConfidence: r.nutrition_confidence ?? "estimated",
    totalWeightG: r.total_weight_g,
    isOccasion: r.is_occasion ?? false,
    rating: r.rating,
    personalNotes: r.personal_notes ?? "",
    sourceType: r.source_type ?? "manuel",
    imagePath: r.image_path,
    imageKind: r.image_kind ?? "none",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ingredients: ((r.ingredients ?? []) as Row[]).map(ingredientFromRow).sort((a, b) => a.position - b.position),
    steps: ((r.steps ?? []) as Row[]).map(stepFromRow).sort((a, b) => a.position - b.position),
  };
}

function ingredientFromRow(i: Row): Ingredient {
  return {
    id: i.id,
    position: i.position,
    section: i.section,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit ?? "",
    gramsEstimate: i.grams_estimate,
    aisle: i.aisle,
    scalable: i.scalable ?? true,
    rawText: i.raw_text ?? "",
    customIngredientId: i.custom_ingredient_id,
  };
}

function stepFromRow(s: Row): Step {
  return { id: s.id, position: s.position, section: s.section ?? null, text: s.text, timerMinutes: s.timer_minutes };
}

/** Charge utile de la fonction SQL `save_recipe` (enregistrement atomique). */
export function recipeToPayload(r: Recipe): Row {
  return {
    recipe: {
      id: r.id,
      status: r.status,
      forked_from_id: r.forkedFromId,
      fork_base: r.forkBase,
      proposal_status: r.proposalStatus,
      title: r.title,
      category: r.category,
      moments: r.moments,
      tags: r.tags,
      yield_quantity: r.yieldQuantity,
      yield_unit: r.yieldUnit,
      portion_size: r.portionSize,
      prep_minutes: r.prepMinutes,
      cook_minutes: r.cookMinutes,
      kcal: r.kcal,
      protein_g: r.proteinG,
      fat_g: r.fatG,
      carbs_g: r.carbsG,
      fiber_g: r.fiberG,
      has_vegetables: r.hasVegetables,
      protein_source: r.proteinSource,
      nutrition_confidence: r.nutritionConfidence,
      total_weight_g: r.totalWeightG,
      is_occasion: r.isOccasion,
      rating: r.rating,
      personal_notes: r.personalNotes,
      source_type: r.sourceType,
      image_path: r.imagePath,
      image_kind: r.imageKind,
    },
    ingredients: r.ingredients.map((i, position) => ({
      id: i.id,
      position,
      section: i.section,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      grams_estimate: i.gramsEstimate,
      aisle: i.aisle,
      scalable: i.scalable,
      raw_text: i.rawText,
      custom_ingredient_id: i.customIngredientId,
    })),
    steps: r.steps.map((s, position) => ({
      id: s.id,
      position,
      section: s.section,
      text: s.text,
      timer_minutes: s.timerMinutes,
    })),
    step_ingredients: r.steps.flatMap((s) => ingredientIdsIn(s.text).map((ingredient_id) => ({ step_id: s.id, ingredient_id }))),
  };
}

export function reviewItemFromRow(r: Row): ReviewItem {
  return {
    id: r.id,
    recipeId: r.recipe_id,
    kind: r.kind,
    field: r.field,
    note: r.note ?? "",
    done: r.done ?? false,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export function reviewItemToRow(r: ReviewItem): Row {
  return {
    id: r.id,
    recipe_id: r.recipeId,
    kind: r.kind,
    field: r.field,
    note: r.note,
    done: r.done,
    created_at: r.createdAt,
  };
}

export function profileFromRow(p: Row): Profile {
  return { id: p.id, displayName: p.display_name ?? "", role: p.role ?? "reader" };
}

export function settingsFromRow(s: Row): UserSettings {
  return {
    autoIllustrations: s.auto_illustrations ?? false,
    proteinRichThresholdG: s.protein_rich_threshold_g ?? 20,
    dailyTargets: s.daily_targets ?? { kcal: null, proteinMinG: null },
    planning: { ...PLANNING_DEFAULTS, ...(s.planning ?? {}) },
  };
}

export function settingsToRow(s: UserSettings): Row {
  return {
    auto_illustrations: s.autoIllustrations,
    protein_rich_threshold_g: s.proteinRichThresholdG,
    daily_targets: s.dailyTargets,
    planning: s.planning,
  };
}

export function mealPlanFromRow(m: Row): MealPlanEntry {
  return {
    key: entryKey(m.day, m.meal, m.slot ?? 0),
    slot: m.slot ?? 0,
    day: m.day,
    meal: m.meal,
    recipeId: m.recipe_id,
    portions: Number(m.portions ?? 1),
    locked: m.locked ?? false,
    skipped: m.skipped ?? false,
  };
}

export function mealPlanToRow(e: MealPlanEntry, householdId: string): Row {
  return { household_id: householdId, day: e.day, meal: e.meal, slot: e.slot ?? 0, recipe_id: e.recipeId, portions: e.portions, locked: e.locked, skipped: e.skipped ?? false };
}

export function templateFromRow(t: Row): MealTemplate {
  return { id: t.id, name: t.name, kind: t.kind, meals: t.meals ?? [] };
}

export function customIngredientFromRow(c: Row): CustomIngredient {
  return {
    id: c.id,
    name: c.name,
    kcal100: c.kcal_100g,
    protein100: c.protein_100g,
    fat100: c.fat_100g,
    carbs100: c.carbs_100g,
    fiber100: c.fiber_100g,
  };
}

export function customIngredientToRow(c: CustomIngredient): Row {
  return {
    id: c.id,
    name: c.name,
    kcal_100g: c.kcal100,
    protein_100g: c.protein100,
    fat_100g: c.fat100,
    carbs_100g: c.carbs100,
    fiber_100g: c.fiber100,
  };
}

export function pantryFromRow(p: Row): PantryBasic {
  return { id: p.id, name: p.name };
}
