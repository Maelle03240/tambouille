/**
 * Modèle de recette côté appli (camelCase). La correspondance avec les
 * colonnes SQL (snake_case) est faite uniquement dans
 * src/lib/data/supabase-mapping.ts.
 */
import type { CategoryId } from "@/config/categories";

export type ProteinSource = "viande" | "poisson" | "oeuf" | "laitier" | "vegetal" | "poudre";
export type Rating = "reussie" | "a-refaire" | "ratee";
export type SourceType = "photo" | "capture" | "texte" | "manuel" | "json" | "lien";
export type ImageKind = "none" | "generated" | "personal";
export type NutritionConfidence = "estimated" | "from_labels";
export type Role = "admin" | "editor" | "reader";

export interface Ingredient {
  id: string;
  position: number;
  /** Groupe d'affichage facultatif (« Vinaigrette », « Croûtons »). */
  section: string | null;
  name: string;
  quantity: number | null;
  unit: string;
  gramsEstimate: number | null;
  aisle: string | null;
  /** Faux pour « sel au goût » : ne change pas avec les portions. */
  scalable: boolean;
  rawText: string;
  customIngredientId: string | null;
}

export interface Step {
  id: string;
  position: number;
  /** Texte avec marqueurs {{ing:<id>}} et {{timer:<minutes>}}. */
  text: string;
  /** Premier minuteur de l'étape (déduit des marqueurs). */
  timerMinutes: number | null;
}

export interface Recipe {
  id: string;
  ownerId: string | null;
  title: string;
  category: CategoryId | null;
  tags: string[];
  yieldQuantity: number | null;
  yieldUnit: string;
  /** Unités de rendement par portion (1 portion = 2 cookies). */
  portionSize: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  /** Valeurs par portion, estimées et modifiables. */
  kcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  fiberG: number | null;
  hasVegetables: boolean | null;
  proteinSource: ProteinSource | null;
  nutritionConfidence: NutritionConfidence;
  totalWeightG: number | null;
  isOccasion: boolean;
  rating: Rating | null;
  personalNotes: string;
  sourceType: SourceType;
  imagePath: string | null;
  imageKind: ImageKind;
  createdAt: string;
  updatedAt: string;
  ingredients: Ingredient[];
  steps: Step[];
}

export interface ReviewItem {
  id: string;
  recipeId: string;
  kind: "auto" | "manual";
  /** Champ concerné (ex. `prepMinutes`) ; null pour une note libre. */
  field: string | null;
  note: string;
  done: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface UserSettings {
  autoIllustrations: boolean;
  proteinRichThresholdG: number;
  dailyTargets: {
    kcal: number | null;
    proteinMinG: number | null;
    fatG?: [number, number] | null;
    carbsG?: [number, number] | null;
    fiberG?: [number, number] | null;
  };
}

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
}
