import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Recipe, ReviewItem, UserSettings } from "@/lib/recipes/types";
import type { Repository, Session, Snapshot } from "./repository";
import {
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
    const [recipes, review, profile, settings] = await Promise.all([
      this.client.from("recipes").select("*, ingredients(*), steps(*)"),
      this.client.from("review_items").select("*"),
      session ? this.client.from("profiles").select("*").eq("id", session.userId).maybeSingle() : null,
      session ? this.client.from("settings").select("*").eq("user_id", session.userId).maybeSingle() : null,
    ]);
    fail(recipes.error, "Lecture des recettes");
    fail(review.error, "Lecture de la liste à revoir");
    return {
      recipes: (recipes.data ?? []).map(recipeFromRow),
      reviewItems: (review.data ?? []).map(reviewItemFromRow),
      profile: profile?.data ? profileFromRow(profile.data) : null,
      settings: settings?.data ? settingsFromRow(settings.data) : null,
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

  async saveSettings(settings: UserSettings) {
    const session = await this.getSession();
    if (!session) return;
    const { error } = await this.client.from("settings").upsert({ user_id: session.userId, ...settingsToRow(settings) });
    fail(error, "Réglages");
  }
}
