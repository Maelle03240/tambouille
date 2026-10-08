/**
 * TIRAGE DU MENU (spec V2).
 * Règles fermes, chaque jour : au moins un repas riche en protéines et des
 * légumes à au moins un repas. Ensuite, l'objectif prioritaire (réglable)
 * est visé en premier ; kcal et fourchettes comptent un peu ; on évite de
 * répéter un plat. Les repas verrouillés ne bougent pas. Recettes « fêtes »
 * exclues.
 * Méthode : on essaie beaucoup de combinaisons au hasard et on garde la
 * meilleure (simple, rapide pour quelques centaines de recettes).
 * Poids et nombre d'essais : src/config/planning.ts.
 */
import { DRAW_WEIGHTS, NUTRIENTS, type NutrientKey } from "@/config/planning";
import { isProteinRich } from "@/lib/recipes/tags";
import type { Recipe, UserSettings } from "@/lib/recipes/types";
import { addNutrition, distance, recipeNutrition, targetFor, ZERO } from "./nutrition";
import type { MealPlanEntry, Nutrition } from "./types";

export type Rng = () => number;

export interface DrawContext {
  recipes: Recipe[];
  targets: UserSettings["dailyTargets"];
  priority: NutrientKey;
  proteinRichThresholdG: number;
  rng?: Rng;
}

/** La recette peut-elle être servie à ce repas ? */
export function isEligible(r: Recipe, meal: string): boolean {
  if (r.isOccasion) return false;
  // sans moment : jamais tirée (pâtisserie de fête, base, sauce, boisson…)
  return (r.moments ?? []).includes(meal);
}

export function candidatesFor(meal: string, recipes: Recipe[]) {
  return recipes.filter((r) => isEligible(r, meal));
}

export function dayNutrition(entries: Pick<MealPlanEntry, "recipeId" | "portions">[], byId: Map<string, Recipe>): Nutrition {
  return entries.reduce(
    (sum, e) => (e.recipeId ? addNutrition(sum, recipeNutrition(byId.get(e.recipeId), e.portions)) : sum),
    { ...ZERO },
  );
}

/** Score d'une journée : plus c'est bas, mieux c'est. */
export function scoreDay(
  picks: { recipe: Recipe | undefined; portions: number }[],
  ctx: DrawContext,
  weekUses: Map<string, number> = new Map(),
): number {
  const W = DRAW_WEIGHTS;
  const recipes = picks.map((p) => p.recipe).filter(Boolean) as Recipe[];
  let score = 0;
  if (!recipes.some((r) => isProteinRich(r, { proteinRichThresholdG: ctx.proteinRichThresholdG }))) score += W.proteinRichRule;
  if (!recipes.some((r) => r.hasVegetables)) score += W.vegetablesRule;

  const sum = picks.reduce((s, p) => addNutrition(s, recipeNutrition(p.recipe, p.portions)), { ...ZERO });
  for (const n of NUTRIENTS) {
    const d = distance(sum[n.key], targetFor(n.key, ctx.targets));
    if (n.key === ctx.priority) score += W.priority * d;
    else if (n.key === "kcal") score += W.kcal * d;
    else score += W.others * d;
  }

  const seen = new Set<string>();
  for (const r of recipes) {
    if (seen.has(r.id)) score += W.sameDayDuplicate;
    seen.add(r.id);
    score += W.weekRepeat * (weekUses.get(r.id) ?? 0);
  }
  return score;
}

/**
 * Tire les repas non verrouillés d'une journée.
 * `slots` = repas actifs du jour (existants ou vides), dans l'ordre.
 */
export function drawDay(
  slots: MealPlanEntry[],
  ctx: DrawContext,
  weekUses: Map<string, number> = new Map(),
): MealPlanEntry[] {
  const rng = ctx.rng ?? Math.random;
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const pools = slots.map((s) => (s.locked ? null : candidatesFor(s.meal, ctx.recipes)));
  if (pools.every((p) => !p || !p.length)) return slots;

  let best: { picks: (string | null)[]; score: number } | null = null;
  for (let t = 0; t < DRAW_WEIGHTS.tries; t++) {
    const picks = slots.map((s, i) => {
      const pool = pools[i];
      if (!pool) return s.recipeId;
      if (!pool.length) return null;
      return pool[Math.floor(rng() * pool.length)].id;
    });
    const score = scoreDay(
      picks.map((id, i) => ({ recipe: id ? byId.get(id) : undefined, portions: slots[i].portions })),
      ctx,
      weekUses,
    );
    if (!best || score < best.score) best = { picks, score };
  }
  return slots.map((s, i) => (s.locked ? s : { ...s, recipeId: best!.picks[i] }));
}

/** Tire toute une semaine, jour après jour, en évitant les répétitions. */
export function drawWeek(days: MealPlanEntry[][], ctx: DrawContext): MealPlanEntry[][] {
  const uses = new Map<string, number>();
  const count = (entries: MealPlanEntry[]) =>
    entries.forEach((e) => e.recipeId && uses.set(e.recipeId, (uses.get(e.recipeId) ?? 0) + 1));
  // les plats verrouillés comptent dès le départ
  days.forEach((d) => count(d.filter((e) => e.locked)));
  return days.map((slots) => {
    const drawn = drawDay(slots, ctx, uses);
    count(drawn.filter((e) => !e.locked));
    return drawn;
  });
}

/**
 * « Autre plat au hasard » pour un repas : parmi les meilleurs choix pour la
 * journée (règles + objectif), en évitant le plat actuel.
 */
export function rerollSlot(dayEntries: MealPlanEntry[], index: number, ctx: DrawContext): string | null {
  const rng = ctx.rng ?? Math.random;
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const slot = dayEntries[index];
  const pool = candidatesFor(slot.meal, ctx.recipes).filter((r) => r.id !== slot.recipeId);
  if (!pool.length) return slot.recipeId;
  const ranked = pool
    .map((r) => ({
      id: r.id,
      score: scoreDay(
        dayEntries.map((e, i) => ({ recipe: i === index ? r : e.recipeId ? byId.get(e.recipeId) : undefined, portions: e.portions })),
        ctx,
      ),
    }))
    .sort((a, b) => a.score - b.score);
  const top = ranked.slice(0, Math.min(4, ranked.length));
  return top[Math.floor(rng() * top.length)].id;
}

/** Tri des recettes pour « choisir moi-même » : les meilleures pour la journée d'abord. */
export function rankForSlot(dayEntries: MealPlanEntry[], index: number, candidates: Recipe[], ctx: DrawContext) {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  return candidates
    .map((r) => ({
      recipe: r,
      score: scoreDay(
        dayEntries.map((e, i) => ({ recipe: i === index ? r : e.recipeId ? byId.get(e.recipeId) : undefined, portions: e.portions })),
        ctx,
      ),
    }))
    .sort((a, b) => a.score - b.score);
}
