/**
 * Contrat d'accès aux données distantes. Deux implémentations :
 *  - supabase-repository.ts : la vraie base (Supabase), utilisée si les
 *    variables NEXT_PUBLIC_SUPABASE_* sont définies ;
 *  - local-repository.ts : mode local/démo, tout reste dans le navigateur.
 * L'interface n'appelle jamais ces fonctions directement : elle passe par
 * actions.ts (écritures) et hooks.ts (lectures depuis le cache).
 */
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { Profile, Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";

export interface Session {
  userId: string;
  email: string | null;
  accessToken: string | null;
}

export interface Snapshot {
  recipes: Recipe[];
  reviewItems: ReviewItem[];
  profile: Profile | null;
  settings: UserSettings | null;
  mealPlans: MealPlanEntry[];
  templates: MealTemplate[];
  pantry: PantryBasic[];
}

export interface Repository {
  readonly mode: "supabase" | "local";

  getSession(): Promise<Session | null>;
  onAuthChange(cb: (session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  /** Tout ce qu'il faut pour remplir le cache local. */
  fetchSnapshot(): Promise<Snapshot>;

  saveRecipe(recipe: Recipe): Promise<void>;
  deleteRecipe(id: string): Promise<void>;

  upsertReviewItems(items: ReviewItem[]): Promise<void>;
  deleteReviewItems(ids: string[]): Promise<void>;

  saveSettings(settings: UserSettings): Promise<void>;

  /* V2 — planning, modèles, basiques (propres à chaque personne) */
  upsertMealPlans(entries: MealPlanEntry[]): Promise<void>;
  deleteMealPlans(entries: Pick<MealPlanEntry, "day" | "meal">[]): Promise<void>;
  saveTemplate(t: MealTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  savePantryBasic(b: PantryBasic): Promise<void>;
  deletePantryBasic(id: string): Promise<void>;
}
