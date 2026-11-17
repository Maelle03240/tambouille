import { describe, expect, it } from "vitest";
import { emptyRecipe } from "@/lib/recipes/factory";
import type { Recipe } from "@/lib/recipes/types";
import { addDays, weekDays, weekStart } from "./dates";
import { candidatesFor, drawDay, drawWeek, isDrawable, isEligible, rerollSlot, scoreDay, type DrawContext } from "./draw";
import { distance, targetFor } from "./nutrition";
import { entryKey, type MealPlanEntry } from "./types";

function recipe(id: string, p: Partial<Recipe>): Recipe {
  return { ...emptyRecipe(), id, title: id, category: "plat", moments: ["dejeuner", "diner"], ...p };
}

// graine fixe : tests reproductibles
function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const RECIPES = [
  recipe("poulet", { proteinG: 45, kcal: 540, hasVegetables: false }),
  recipe("ratatouille", { proteinG: 4, kcal: 220, hasVegetables: true }),
  recipe("pates", { proteinG: 12, kcal: 600, hasVegetables: false }),
  recipe("saumon-brocoli", { proteinG: 38, kcal: 560, hasVegetables: true }),
  recipe("gateau-fete", { proteinG: 50, kcal: 400, hasVegetables: true, isOccasion: true }),
  recipe("porridge", { proteinG: 13, kcal: 350, moments: ["petit-dejeuner"] }),
  recipe("dessert-sans-moment", { category: "dessert", moments: [], proteinG: 3, kcal: 300 }),
];

const ctx: DrawContext = {
  recipes: RECIPES,
  targets: { kcal: 1200, proteinMinG: 60 },
  priority: "protein",
  proteinRichThresholdG: 20,
  rng: seeded(),
};

const slot = (day: string, meal: string, p: Partial<MealPlanEntry> = {}): MealPlanEntry => ({
  key: entryKey(day, meal),
  day,
  meal,
  recipeId: null,
  portions: 1,
  locked: false,
  ...p,
});

describe("éligibilité", () => {
  it("exclut les recettes de fête", () => expect(isEligible(RECIPES[4], "dejeuner")).toBe(false));
  it("respecte les moments", () => {
    expect(isEligible(RECIPES[5], "petit-dejeuner")).toBe(true);
    expect(isEligible(RECIPES[5], "diner")).toBe(false);
  });
  it("sans moment : jamais tirée", () => {
    expect(isEligible(RECIPES[6], "gouter")).toBe(false);
    expect(isEligible(RECIPES[6], "diner")).toBe(false);
  });
  it("candidats du dîner", () => expect(candidatesFor("diner", RECIPES).map((r) => r.id)).toEqual(["poulet", "ratatouille", "pates", "saumon-brocoli"]));
});

describe("objectifs", () => {
  it("protéines = minimum", () => {
    const t = targetFor("protein", ctx.targets);
    expect(distance(80, t)).toBe(0);
    expect(distance(30, t)).toBeCloseTo(0.5);
  });
});

describe("tirage", () => {
  it("respecte les règles fermes (protéines + légumes) chaque jour", () => {
    const days = weekDays("2026-10-05").map((d) => [slot(d, "dejeuner"), slot(d, "diner")]);
    const week = drawWeek(days, { ...ctx, rng: seeded(7) });
    const byId = new Map(RECIPES.map((r) => [r.id, r]));
    for (const day of week) {
      const rs = day.map((e) => byId.get(e.recipeId!)!);
      expect(rs.some((r) => (r.proteinG ?? 0) >= 20)).toBe(true);
      expect(rs.some((r) => r.hasVegetables)).toBe(true);
      expect(rs.some((r) => r.isOccasion)).toBe(false);
    }
  });

  it("ne touche pas aux repas verrouillés", () => {
    const d = "2026-10-05";
    const out = drawDay([slot(d, "dejeuner", { recipeId: "pates", locked: true }), slot(d, "diner")], ctx);
    expect(out[0].recipeId).toBe("pates");
    // avec des pâtes (ni légumes ni riche), le dîner doit tout rattraper
    expect(out[1].recipeId).toBe("saumon-brocoli");
  });

  it("une journée qui respecte les règles a un meilleur score", () => {
    const byId = new Map(RECIPES.map((r) => [r.id, r]));
    const good = scoreDay([{ recipe: byId.get("poulet"), portions: 1 }, { recipe: byId.get("ratatouille"), portions: 1 }], ctx);
    const bad = scoreDay([{ recipe: byId.get("pates"), portions: 1 }, { recipe: byId.get("pates"), portions: 1 }], ctx);
    expect(good).toBeLessThan(bad);
  });

  it("autre plat au hasard : jamais le même", () => {
    const d = "2026-10-05";
    const entries = [slot(d, "dejeuner", { recipeId: "poulet" }), slot(d, "diner", { recipeId: "ratatouille" })];
    for (let i = 0; i < 10; i++) expect(rerollSlot(entries, 0, { ...ctx, rng: seeded(i + 1) })).not.toBe("poulet");
  });
});

describe("dates", () => {
  it("semaine du lundi", () => {
    expect(weekStart("2026-10-08")).toBe("2026-10-05");
    expect(weekStart("2026-10-11")).toBe("2026-10-05");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});

describe("dessert et plats ajoutés", () => {
  const d = "2026-11-02";
  const plats = [
    recipe("gros1", { proteinG: 40, kcal: 700, hasVegetables: true }),
    recipe("gros2", { proteinG: 40, kcal: 720, hasVegetables: true }),
    recipe("leger1", { proteinG: 40, kcal: 300, hasVegetables: true }),
    recipe("leger2", { proteinG: 40, kcal: 320, hasVegetables: true }),
  ];
  const tarte = recipe("tarte", { category: "dessert", proteinG: 5, kcal: 500, moments: ["gouter", "diner"] });
  const c: DrawContext = { recipes: [...plats, tarte], targets: { kcal: 1200, proteinMinG: 60 }, priority: "protein", proteinRichThresholdG: 20, rng: seeded(3) };
  const repas = () => [slot(d, "dejeuner"), slot(d, "diner")];
  const kcalDe = (out: MealPlanEntry[]) => out.reduce((s, e) => s + (c.recipes.find((r) => r.id === e.recipeId)?.kcal ?? 0), 0);

  it("un dessert n'est pas tiré comme plat, mais reste au goûter et dans la liste à la main", () => {
    expect(isDrawable(tarte, "diner")).toBe(false);
    expect(isDrawable(tarte, "gouter")).toBe(true);
    expect(candidatesFor("diner", c.recipes)).toContain(tarte);
    expect(drawDay(repas(), c).some((e) => e.recipeId === "tarte")).toBe(false);
    expect(rerollSlot([slot(d, "diner", { recipeId: "gros1" })], 0, { ...c, recipes: [plats[0], tarte] })).toBe("gros1");
  });

  it("le dessert ajouté reste, et le tirage choisit des plats plus légers", () => {
    const ajout = { ...slot(d, "diner"), key: entryKey(d, "diner", 1), slot: 1, recipeId: "tarte", locked: true };
    const sans = drawDay(repas(), c);
    const avec = drawDay([...repas(), ajout], c);
    expect(avec[2].recipeId).toBe("tarte");
    expect(kcalDe(sans)).toBeGreaterThan(900);
    expect(avec.slice(0, 2).every((e) => e.recipeId?.startsWith("leger"))).toBe(true);
  });
});
