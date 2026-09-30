import { newId } from "@/lib/ids";
import type { Ingredient, Recipe, Step } from "./types";

export function emptyRecipe(): Recipe {
  const now = new Date().toISOString();
  return {
    id: newId(),
    ownerId: null,
    title: "",
    category: null,
    moments: [],
    tags: ["a-tester"],
    yieldQuantity: 4,
    yieldUnit: "personnes",
    portionSize: 1,
    prepMinutes: null,
    cookMinutes: null,
    kcal: null,
    proteinG: null,
    fatG: null,
    carbsG: null,
    fiberG: null,
    hasVegetables: null,
    proteinSource: null,
    nutritionConfidence: "estimated",
    totalWeightG: null,
    isOccasion: false,
    rating: null,
    personalNotes: "",
    sourceType: "manuel",
    imagePath: null,
    imageKind: "none",
    createdAt: now,
    updatedAt: now,
    ingredients: [],
    steps: [],
  };
}

export function emptyIngredient(position: number, section: string | null = null): Ingredient {
  return {
    id: newId(),
    position,
    section,
    name: "",
    quantity: null,
    unit: "",
    gramsEstimate: null,
    aisle: null,
    scalable: true,
    rawText: "",
    customIngredientId: null,
  };
}

export function emptyStep(position: number): Step {
  return { id: newId(), position, text: "", timerMinutes: null };
}
