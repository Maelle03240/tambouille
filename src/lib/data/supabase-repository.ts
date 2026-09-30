import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addDays, today } from "@/lib/planning/dates";
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";
import type { Repository, Session, Snapshot } from "./repository";
import {
  mealPlanFromRow,
  mealPlanToRow,
  pantryFromRow,
  templateFromRow,
  profileFromRow,
  recipeFromRow,
  recipeToPayload,
  reviewItemFromRow,
  reviewItemToRow,
  settingsFromRow,
  settingsToRow,
} from "./supabase-mapping";

function toSession(s: { user: { id: string; email?: string }; access_token: string } | null): Session | null {
  return s ? { userId: s.user.id, email: s.user.email ?? null, accessToken: s.access_token } : null;
}

function fail(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what} : ${error.message}`);
}

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "tambouille-auth" },
    });
  }

  async getSession() {
    const { data } = await this.client.auth.getSession();
    return toSession(data.session);
  }

  onAuthChange(cb: (s: Session | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => cb(toSession(session)));
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message.includes("Invalid login") ? "E-mail ou mot de passe incorrect." : `Connexion impossible : ${error.message}`,
      );
    }
  }

  async signOut() {
    await this.client.auth.signOut();
  }

  async fetchSnapshot(): Promise<Snapshot> {
    const session = await this.getSession();
    const [recipes, review, profile, settings, plans, templates, pantry] = await Promise.all([
      this.client.from("recipes").select("*, ingredients(*), steps(*)"),
      this.client.from("review_items").select("*"),
      session ? this.client.from("profiles").select("*").eq("id", session.userId).maybeSingle() : null,
      session ? this.client.from("settings").select("*").eq("user_id", session.userId).maybeSingle() : null,
      // planning : 5 semaines en arrière, 8 en avant
      this.client.from("meal_plans").select("*").gte("day", addDays(today(), -35)).lte("day", addDays(today(), 56)),
      this.client.from("meal_templates").select("*"),
      this.client.from("pantry_basics").select("*"),
    ]);
    fail(recipes.error, "Lecture des recettes");
    fail(review.error, "Lecture de la liste à revoir");
    return {
      recipes: (recipes.data ?? []).map(recipeFromRow),
      reviewItems: (review.data ?? []).map(reviewItemFromRow),
      profile: profile?.data ? profileFromRow(profile.data) : null,
      settings: settings?.data ? settingsFromRow(settings.data) : null,
      mealPlans: (plans.data ?? []).map(mealPlanFromRow),
      templates: (templates.data ?? []).map(templateFromRow),
      pantry: (pantry.data ?? []).map(pantryFromRow),
    };
  }

  async saveRecipe(recipe: Recipe) {
    const { error } = await this.client.rpc("save_recipe", { p: recipeToPayload(recipe) });
    fail(error, "Enregistrement");
  }

  async deleteRecipe(id: string) {
    const { error } = await this.client.from("recipes").delete().eq("id", id);
    fail(error, "Suppression");
  }

  async upsertReviewItems(items: ReviewItem[]) {
    if (!items.length) return;
    const { error } = await this.client.from("review_items").upsert(items.map(reviewItemToRow));
    fail(error, "Liste à revoir");
  }

  async deleteReviewItems(ids: string[]) {
    if (!ids.length) return;
    const { error } = await this.client.from("review_items").delete().in("id", ids);
    fail(error, "Liste à revoir");
  }

  private async userId() {
    const s = await this.getSession();
    if (!s) throw new Error("Non connectée");
    return s.userId;
  }

  async upsertMealPlans(entries: MealPlanEntry[]) {
    if (!entries.length) return;
    const uid = await this.userId();
    const { error } = await this.client
      .from("meal_plans")
      .upsert(entries.map((e) => mealPlanToRow(e, uid)), { onConflict: "owner_id,day,meal" });
    fail(error, "Planning");
  }

  async deleteMealPlans(entries: Pick<MealPlanEntry, "day" | "meal">[]) {
    const uid = await this.userId();
    for (const e of entries) {
      const { error } = await this.client.from("meal_plans").delete().match({ owner_id: uid, day: e.day, meal: e.meal });
      fail(error, "Planning");
    }
  }

  async saveTemplate(t: MealTemplate) {
    const { error } = await this.client.from("meal_templates").upsert({ id: t.id, name: t.name, kind: t.kind, meals: t.meals });
    fail(error, "Modèle");
  }

  async deleteTemplate(id: string) {
    const { error } = await this.client.from("meal_templates").delete().eq("id", id);
    fail(error, "Modèle");
  }

  async savePantryBasic(b: PantryBasic) {
    const { error } = await this.client.from("pantry_basics").upsert({ id: b.id, name: b.name });
    fail(error, "Basiques");
  }

  async deletePantryBasic(id: string) {
    const { error } = await this.client.from("pantry_basics").delete().eq("id", id);
    fail(error, "Basiques");
  }

  async saveSettings(settings: UserSettings) {
    const session = await this.getSession();
    if (!session) return;
    const { error } = await this.client.from("settings").upsert({ user_id: session.userId, ...settingsToRow(settings) });
    fail(error, "Réglages");
  }
}
