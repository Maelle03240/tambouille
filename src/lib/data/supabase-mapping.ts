/**
 * Correspondance colonnes SQL (snake_case) ⇄ modèle appli (camelCase).
 * SEUL endroit à modifier quand on ajoute/renomme une colonne.
 */
import type { Ingredient, Profile, Recipe, ReviewItem, Step, UserSettings } from "@/lib/recipes/types";
import { ingredientIdsIn } from "@/lib/recipes/markers";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export function recipeFromRow(r: Row): Recipe {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    category: r.category,
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
  return { id: s.id, position: s.position, text: s.text, timerMinutes: s.timer_minutes };
}

/** Charge utile de la fonction SQL `save_recipe` (enregistrement atomique). */
export function recipeToPayload(r: Recipe): Row {
  return {
    recipe: {
      id: r.id,
      title: r.title,
      category: r.category,
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
  };
}

export function settingsToRow(s: UserSettings): Row {
  return {
    auto_illustrations: s.autoIllustrations,
    protein_rich_threshold_g: s.proteinRichThresholdG,
    daily_targets: s.dailyTargets,
  };
}
