/**
 * Mode local (sans Supabase) : pratique pour essayer l'appli ou développer.
 * Les données vivent uniquement dans ce navigateur (IndexedDB). Les écritures
 * sont déjà faites dans le cache par actions.ts, donc ici il n'y a rien à
 * envoyer : ce dépôt « distant » se contente de relire le cache.
 */
import { EMPTY_SHOPPING } from "@/lib/shopping/state";
import type { Repository, Snapshot } from "./repository";
import { db, getMeta, setMeta } from "./db";

const LOCAL_USER = { userId: "local", email: null, accessToken: null };
const LOCAL_HOUSEHOLD = { id: "local", name: "Maison" };

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
  async updatePassword() {}
  async sendPasswordReset() {}
  readonly admin = null;
  setHousehold() {}
  async renameHousehold(_id: string, name: string) {
    await setMeta("households", [{ id: LOCAL_HOUSEHOLD.id, name }]);
  }
  async applyShoppingOps() {}
  watchHousehold() {
    return () => {};
  }

  async fetchSnapshot(): Promise<Snapshot> {
    return {
      recipes: await db.recipes.toArray(),
      reviewItems: await db.reviewItems.toArray(),
      profile: { id: "local", displayName: "Moi", role: "admin" },
      settings: (await getMeta("settings")) ?? null,
      households: (await getMeta("households")) ?? [LOCAL_HOUSEHOLD],
      householdId: LOCAL_HOUSEHOLD.id,
      housemates: [],
      people: [],
      shopping: (await getMeta("shopping")) ?? EMPTY_SHOPPING,
      mealPlans: await db.mealPlans.toArray(),
      templates: await db.templates.toArray(),
      pantry: await db.pantry.toArray(),
      customIngredients: await db.customIngredients.toArray(),
    };
  }

  async saveRecipe() {}
  async deleteRecipe() {}
  async retireFork() {}
  async setRecipeStatus() {}
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
  async uploadImage(_path: string, blob: Blob) {
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  async deleteImage() {}
  async deleteCustomIngredient() {}
}
