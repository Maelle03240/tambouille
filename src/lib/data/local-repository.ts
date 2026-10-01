/**
 * Mode local (sans Supabase) : pratique pour essayer l'appli ou développer.
 * Les données vivent uniquement dans ce navigateur (IndexedDB). Les écritures
 * sont déjà faites dans le cache par actions.ts, donc ici il n'y a rien à
 * envoyer : ce dépôt « distant » se contente de relire le cache.
 */
import type { Repository, Snapshot } from "./repository";
import { db, getMeta } from "./db";

const LOCAL_USER = { userId: "local", email: null, accessToken: null };

export class LocalRepository implements Repository {
  readonly mode = "local" as const;

  async getSession() {
    return LOCAL_USER;
  }
  onAuthChange() {
    return () => {};
  }
  async signIn() {}
  async signOut() {}

  async fetchSnapshot(): Promise<Snapshot> {
    return {
      recipes: await db.recipes.toArray(),
      reviewItems: await db.reviewItems.toArray(),
      profile: { id: "local", displayName: "Moi", role: "admin" },
      settings: (await getMeta("settings")) ?? null,
      mealPlans: await db.mealPlans.toArray(),
      templates: await db.templates.toArray(),
      pantry: await db.pantry.toArray(),
      customIngredients: await db.customIngredients.toArray(),
    };
  }

  async saveRecipe() {}
  async deleteRecipe() {}
  async upsertReviewItems() {}
  async deleteReviewItems() {}
  async saveSettings() {}
  async upsertMealPlans() {}
  async deleteMealPlans() {}
  async saveTemplate() {}
  async deleteTemplate() {}
  async savePantryBasic() {}
  async deletePantryBasic() {}
  async saveCustomIngredient() {}
  async deleteCustomIngredient() {}
}
