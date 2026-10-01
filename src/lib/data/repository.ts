/**
 * Contrat d'accès aux données distantes. Deux implémentations :
 *  - supabase-repository.ts : la vraie base (Supabase), utilisée si les
 *    variables NEXT_PUBLIC_SUPABASE_* sont définies ;
 *  - local-repository.ts : mode local/démo, tout reste dans le navigateur.
 * L'interface n'appelle jamais ces fonctions directement : elle passe par
 * actions.ts (écritures) et hooks.ts (lectures depuis le cache).
 */
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { CustomIngredient, Household, Profile, Recipe, ReviewItem, Role, UserSettings } from "@/lib/recipes/types";
import type { ShoppingOp, ShoppingState } from "@/lib/shopping/state";

export interface Session {
  userId: string;
  email: string | null;
  accessToken: string | null;
}

export interface Snapshot {
  recipes: Recipe[];
  reviewItems: ReviewItem[];
  profile: Profile | null;
  /** Réglages perso + objectifs et planning du foyer affiché. */
  settings: UserSettings | null;
  /** Mes foyers, et celui affiché (null : aucun foyer). */
  households: Household[];
  householdId: string | null;
  shopping: ShoppingState | null;
  mealPlans: MealPlanEntry[];
  templates: MealTemplate[];
  pantry: PantryBasic[];
  customIngredients: CustomIngredient[];
}

export interface Repository {
  readonly mode: "supabase" | "local";

  getSession(): Promise<Session | null>;
  onAuthChange(cb: (session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Mot de passe choisi après une invitation ou un « mot de passe oublié ». */
  updatePassword(password: string): Promise<void>;
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;

  /** Foyer affiché : les lectures et écritures du foyer s'y rapportent. */
  setHousehold(id: string | null): void;
  renameHousehold(id: string, name: string): Promise<void>;
  /** Liste de courses du foyer (opérations de la file d'attente). */
  applyShoppingOps(householdId: string, ops: ShoppingOp[]): Promise<void>;
  /** Gestion des foyers et des comptes (admin, Supabase seulement). */
  readonly admin: AdminApi | null;

  /** Tout ce qu'il faut pour remplir le cache local. */
  fetchSnapshot(): Promise<Snapshot>;

  saveRecipe(recipe: Recipe): Promise<void>;
  deleteRecipe(id: string): Promise<void>;

  upsertReviewItems(items: ReviewItem[]): Promise<void>;
  deleteReviewItems(ids: string[]): Promise<void>;

  saveSettings(settings: UserSettings): Promise<void>;

  /* Planning, modèles, basiques : ceux du foyer affiché */
  upsertMealPlans(entries: MealPlanEntry[]): Promise<void>;
  deleteMealPlans(entries: Pick<MealPlanEntry, "day" | "meal">[]): Promise<void>;
  saveTemplate(t: MealTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  savePantryBasic(b: PantryBasic): Promise<void>;
  deletePantryBasic(id: string): Promise<void>;
  saveCustomIngredient(c: CustomIngredient): Promise<void>;

  /** Image de recette : renvoie la référence à stocker dans recipe.imagePath. */
  uploadImage(path: string, blob: Blob): Promise<string>;
  deleteImage(imagePath: string): Promise<void>;
  deleteCustomIngredient(id: string): Promise<void>;
}

export interface AdminOverview {
  households: (Household & { memberIds: string[] })[];
  people: Profile[];
}

export interface AdminApi {
  overview(): Promise<AdminOverview>;
  createHousehold(name: string): Promise<void>;
  deleteHousehold(id: string): Promise<void>;
  addMember(householdId: string, userId: string): Promise<void>;
  removeMember(householdId: string, userId: string): Promise<void>;
  setRole(userId: string, role: Role): Promise<void>;
}
