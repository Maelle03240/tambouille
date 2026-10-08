import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLANNING_DEFAULTS } from "@/config/planning";
import { addDays, today } from "@/lib/planning/dates";
import type { MealPlanEntry, MealTemplate, PantryBasic } from "@/lib/planning/types";
import type { CustomIngredient, Household, Recipe, RecipeIdea, ReviewItem, Role, UserSettings } from "@/lib/recipes/types";
import { shoppingFromRows, type ShoppingOp } from "@/lib/shopping/state";
import type { AdminApi, Repository, Session, Snapshot } from "./repository";
import {
  customIngredientFromRow,
  customIngredientToRow,
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
  /** Foyer affiché (choisi par sync.ts, retenu sur l'appareil). */
  private household: string | null = null;

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

  async updatePassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password });
    fail(error, "Mot de passe");
  }

  async sendPasswordReset(email: string, redirectTo: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    fail(error, "E-mail");
  }

  setHousehold(id: string | null) {
    this.household = id;
  }

  private requireHousehold() {
    if (!this.household) throw new Error("Aucun foyer : demande à l'admin de t'en ajouter un.");
    return this.household;
  }

  async renameHousehold(id: string, name: string) {
    const { error } = await this.client.from("households").update({ name }).eq("id", id);
    fail(error, "Foyer");
  }

  async fetchSnapshot(): Promise<Snapshot> {
    const session = await this.getSession();
    const uid = session?.userId;

    // Mes foyers ; celui affiché = le dernier choisi s'il existe encore, sinon le premier
    const memberships = uid
      ? await this.client.from("household_members").select("households(id, name, daily_targets, planning)").eq("user_id", uid)
      : null;
    fail(memberships?.error ?? null, "Lecture des foyers");
    type HouseholdRow = { id: string; name: string; daily_targets: UserSettings["dailyTargets"]; planning: UserSettings["planning"] };
    const rows = ((memberships?.data ?? []) as unknown as { households: HouseholdRow | null }[])
      .map((m) => m.households)
      .filter((h): h is HouseholdRow => !!h)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const current = rows.find((h) => h.id === this.household) ?? rows[0] ?? null;
    this.household = current?.id ?? null;
    const hid = current?.id ?? "00000000-0000-0000-0000-000000000000";

    const myHouseholds = rows.map((h) => h.id);
    const [recipes, review, profile, settings, plans, templates, pantry, customs, shopRecipes, shopChecks, shopItems, mates, people, ideas] = await Promise.all([
      this.client.from("recipes").select("*, ingredients(*), steps(*)"),
      this.client.from("review_items").select("*"),
      uid ? this.client.from("profiles").select("*").eq("id", uid).maybeSingle() : null,
      uid ? this.client.from("settings").select("*").eq("user_id", uid).maybeSingle() : null,
      // planning du foyer : 5 semaines en arrière, 8 en avant
      this.client.from("meal_plans").select("*").eq("household_id", hid).gte("day", addDays(today(), -35)).lte("day", addDays(today(), 56)),
      this.client.from("meal_templates").select("*").eq("household_id", hid),
      this.client.from("pantry_basics").select("*").eq("household_id", hid),
      this.client.from("custom_ingredients").select("*"),
      this.client.from("shopping_recipes").select("*").eq("household_id", hid),
      this.client.from("shopping_checks").select("item_key").eq("household_id", hid).eq("checked", true),
      this.client.from("shopping_items").select("*").eq("household_id", hid).order("created_at"),
      myHouseholds.length
        ? this.client.from("household_members").select("user_id").in("household_id", myHouseholds)
        : Promise.resolve({ data: [] as { user_id: string }[], error: null }),
      this.client.from("profiles").select("id, display_name, role"),
      uid ? this.client.from("recipe_ideas").select("id, text").eq("owner_id", uid).order("created_at") : null,
    ]);
    fail(recipes.error, "Lecture des recettes");
    fail(review.error, "Lecture de la liste à revoir");
    fail(plans.error, "Lecture du menu");

    const personal = settings?.data ? settingsFromRow(settings.data) : null;
    return {
      recipes: (recipes.data ?? []).map(recipeFromRow),
      reviewItems: (review.data ?? []).map(reviewItemFromRow),
      profile: profile?.data ? profileFromRow(profile.data) : null,
      // réglages perso + objectifs et planning du foyer
      settings: personal && {
        ...personal,
        dailyTargets: current?.daily_targets ?? personal.dailyTargets,
        planning: { ...PLANNING_DEFAULTS, ...(current?.planning ?? personal.planning) },
      },
      households: rows.map((h): Household => ({ id: h.id, name: h.name })),
      housemates: [...new Set((mates.data ?? []).map((m) => m.user_id as string))].filter((id) => id !== uid),
      people: (people.data ?? []).map(profileFromRow),
      householdId: current?.id ?? null,
      mealPlans: (plans.data ?? []).map(mealPlanFromRow),
      templates: (templates.data ?? []).map(templateFromRow),
      pantry: (pantry.data ?? []).map(pantryFromRow),
      customIngredients: (customs.data ?? []).map(customIngredientFromRow),
      ideas: (ideas?.data ?? []) as RecipeIdea[],
      shopping: current
        ? shoppingFromRows(
            (shopRecipes.data ?? []).map((r) => ({
              recipeId: r.recipe_id,
              extra: r.extra,
              extraServings: r.extra_servings == null ? null : Number(r.extra_servings),
              excluded: r.excluded,
              servings: r.servings == null ? null : Number(r.servings),
            })),
            (shopChecks.data ?? []).map((c) => c.item_key),
            (shopItems.data ?? []).map((i) => ({ id: i.id, text: i.text, aisle: i.aisle })),
          )
        : null,
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

  async retireFork(id: string) {
    const { error } = await this.client.rpc("retire_fork", { fork: id });
    fail(error, "Version perso");
  }

  async setRecipeStatus(id: string, patch: { status?: Recipe["status"]; proposalStatus?: Recipe["proposalStatus"] }) {
    const row: Record<string, unknown> = {};
    if (patch.status) row.status = patch.status;
    if (patch.proposalStatus !== undefined) row.proposal_status = patch.proposalStatus;
    const { error } = await this.client.from("recipes").update(row).eq("id", id);
    fail(error, "Proposition");
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

  async upsertMealPlans(entries: MealPlanEntry[]) {
    if (!entries.length) return;
    const hid = this.requireHousehold();
    const { error } = await this.client
      .from("meal_plans")
      .upsert(entries.map((e) => mealPlanToRow(e, hid)), { onConflict: "household_id,day,meal" });
    fail(error, "Menu");
  }

  async deleteMealPlans(entries: Pick<MealPlanEntry, "day" | "meal">[]) {
    const hid = this.requireHousehold();
    for (const e of entries) {
      const { error } = await this.client.from("meal_plans").delete().match({ household_id: hid, day: e.day, meal: e.meal });
      fail(error, "Menu");
    }
  }

  async saveTemplate(t: MealTemplate) {
    const hid = this.requireHousehold();
    const { error } = await this.client
      .from("meal_templates")
      .upsert({ id: t.id, household_id: hid, name: t.name, kind: t.kind, meals: t.meals });
    fail(error, "Modèle");
  }

  async deleteTemplate(id: string) {
    const { error } = await this.client.from("meal_templates").delete().eq("id", id);
    fail(error, "Modèle");
  }

  async savePantryBasic(b: PantryBasic) {
    const hid = this.requireHousehold();
    const { error } = await this.client.from("pantry_basics").upsert({ id: b.id, household_id: hid, name: b.name });
    fail(error, "Basiques");
  }

  async deletePantryBasic(id: string) {
    const { error } = await this.client.from("pantry_basics").delete().eq("id", id);
    fail(error, "Basiques");
  }

  async applyShoppingOps(householdId: string, ops: ShoppingOp[]) {
    for (const op of ops) {
      let res;
      if (op.kind === "check") {
        // décocher = checked à faux (pas de suppression : le temps réel ne filtre pas les suppressions par foyer)
        res = await this.client
          .from("shopping_checks")
          .upsert({ household_id: householdId, item_key: op.key, checked: op.on, updated_at: new Date().toISOString() });
      } else if (op.kind === "item") {
        res = op.item
          ? await this.client
              .from("shopping_items")
              .upsert({ id: op.id, household_id: householdId, text: op.item.text, aisle: op.item.aisle })
          : await this.client.from("shopping_items").delete().eq("id", op.id);
      } else {
        const r = op.row;
        res = r
          ? await this.client.from("shopping_recipes").upsert({
              household_id: householdId,
              recipe_id: op.recipeId,
              extra: r.extra,
              extra_servings: r.extraServings,
              excluded: r.excluded,
              servings: r.servings,
              updated_at: new Date().toISOString(),
            })
          : await this.client.from("shopping_recipes").delete().match({ household_id: householdId, recipe_id: op.recipeId });
      }
      fail(res.error, "Courses");
    }
  }

  async uploadImage(path: string, blob: Blob) {
    const { error } = await this.client.storage.from("recipe-images").upload(path, blob, { contentType: blob.type, upsert: true });
    fail(error, "Image");
    return path;
  }

  async deleteImage(imagePath: string) {
    if (imagePath.startsWith("data:")) return;
    await this.client.storage.from("recipe-images").remove([imagePath]);
  }

  async saveCustomIngredient(c: CustomIngredient) {
    const { error } = await this.client.from("custom_ingredients").upsert(customIngredientToRow(c));
    fail(error, "Ingrédient perso");
  }

  async deleteCustomIngredient(id: string) {
    const { error } = await this.client.from("custom_ingredients").delete().eq("id", id);
    fail(error, "Ingrédient perso");
  }

  async saveIdea(idea: RecipeIdea) {
    const { error } = await this.client.from("recipe_ideas").upsert({ id: idea.id, text: idea.text });
    fail(error, "Idée de recette");
  }

  async deleteIdea(id: string) {
    const { error } = await this.client.from("recipe_ideas").delete().eq("id", id);
    fail(error, "Idée de recette");
  }

  /** Réglages perso dans `settings`, objectifs et planning dans le foyer affiché. */
  async saveSettings(settings: UserSettings) {
    const session = await this.getSession();
    if (!session) return;
    const { daily_targets, planning, ...personal } = settingsToRow(settings);
    const { error } = await this.client.from("settings").upsert({ user_id: session.userId, ...personal });
    fail(error, "Réglages");
    if (this.household) {
      const res = await this.client.from("households").update({ daily_targets, planning }).eq("id", this.household);
      fail(res.error, "Objectifs du foyer");
    }
  }

  /** Prévient quand un autre membre change la liste de courses ou le menu du foyer. */
  watchHousehold(householdId: string, onChange: () => void) {
    const channel = this.client.channel(`foyer:${householdId}`);
    for (const table of ["shopping_checks", "shopping_items", "shopping_recipes", "meal_plans"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` }, onChange);
    }
    channel.subscribe();
    return () => {
      void this.client.removeChannel(channel);
    };
  }

  readonly admin: AdminApi = {
    overview: async () => {
      const [households, members, people] = await Promise.all([
        this.client.from("households").select("id, name").order("name"),
        this.client.from("household_members").select("household_id, user_id"),
        this.client.from("profiles").select("*").order("display_name"),
      ]);
      fail(households.error ?? members.error ?? people.error, "Admin");
      return {
        households: (households.data ?? []).map((h) => ({
          id: h.id,
          name: h.name,
          memberIds: (members.data ?? []).filter((m) => m.household_id === h.id).map((m) => m.user_id),
        })),
        people: (people.data ?? []).map(profileFromRow),
      };
    },
    createHousehold: async (name: string) => {
      const { error } = await this.client.from("households").insert({ name });
      fail(error, "Foyer");
    },
    deleteHousehold: async (id: string) => {
      const { error } = await this.client.from("households").delete().eq("id", id);
      fail(error, "Foyer");
    },
    addMember: async (householdId: string, userId: string) => {
      const { error } = await this.client.from("household_members").insert({ household_id: householdId, user_id: userId });
      fail(error, "Membre");
    },
    removeMember: async (householdId: string, userId: string) => {
      const { error } = await this.client.from("household_members").delete().match({ household_id: householdId, user_id: userId });
      fail(error, "Membre");
    },
    setRole: async (userId: string, role: Role) => {
      const { error } = await this.client.from("profiles").update({ role }).eq("id", userId);
      fail(error, "Rôle");
    },
  };
}
