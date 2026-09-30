"use client";
/**
 * La semaine affichée dans le planning : repas actifs de chaque jour (plat
 * choisi ou vide), valeurs prévues, et actions (tirage, changer, verrouiller…).
 */
import { useMemo } from "react";
import { useApp } from "@/components/app/AppProvider";
import { MOMENTS } from "@/config/moments";
import { removePlanEntries, savePlanEntries } from "@/lib/data/actions";
import { useMealPlans, useRecipes, useSettings } from "@/lib/data/hooks";
import { addDays, weekDays } from "@/lib/planning/dates";
import { dayNutrition, drawDay, drawWeek, rerollSlot, type DrawContext } from "@/lib/planning/draw";
import { entryKey, type MealPlanEntry } from "@/lib/planning/types";

export function usePlanningWeek(monday: string) {
  const { toast } = useApp();
  const settings = useSettings();
  const recipes = useRecipes();
  const plans = useMealPlans(monday, addDays(monday, 6));

  const meals = useMemo(
    () => MOMENTS.map((m) => m.id).filter((id) => settings.planning.meals.includes(id)),
    [settings.planning.meals],
  );
  const byId = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes]);

  const ctx: DrawContext = useMemo(
    () => ({
      recipes: recipes ?? [],
      targets: settings.dailyTargets,
      priority: settings.planning.priority,
      proteinRichThresholdG: settings.proteinRichThresholdG,
    }),
    [recipes, settings],
  );

  /** Repas actifs de chaque jour (existants en base ou vides). */
  const days = useMemo(
    () =>
      weekDays(monday).map((day) => ({
        day,
        slots: meals.map(
          (meal): MealPlanEntry =>
            plans?.find((p) => p.day === day && p.meal === meal) ?? {
              key: entryKey(day, meal),
              day,
              meal,
              recipeId: null,
              portions: 1,
              locked: false,
            },
        ),
      })),
    [monday, meals, plans],
  );

  const nutritionOf = (slots: MealPlanEntry[]) => dayNutrition(slots, byId);

  async function run(label: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : `${label} impossible`);
    }
  }

  const save = (entries: MealPlanEntry[]) => run("Enregistrement", () => savePlanEntries(entries));

  return {
    loading: recipes === undefined || plans === undefined,
    meals,
    days,
    byId,
    ctx,
    nutritionOf,
    hasRecipes: (recipes ?? []).length > 0,

    drawWeek: () => save(drawWeek(days.map((d) => d.slots), ctx).flat()),
    drawDay: (day: string) => {
      const d = days.find((x) => x.day === day);
      if (d) return save(drawDay(d.slots, ctx));
    },
    reroll: (day: string, index: number) => {
      const d = days.find((x) => x.day === day);
      if (!d || d.slots[index].locked) return;
      return save([{ ...d.slots[index], recipeId: rerollSlot(d.slots, index, ctx) }]);
    },
    setRecipe: (slot: MealPlanEntry, recipeId: string | null) => save([{ ...slot, recipeId }]),
    toggleLock: (slot: MealPlanEntry) => save([{ ...slot, locked: !slot.locked }]),
    setPortions: (slot: MealPlanEntry, portions: number) => save([{ ...slot, portions: Math.max(0.5, portions) }]),
    clear: (slot: MealPlanEntry) => run("Suppression", () => removePlanEntries([slot])),
    /** Remplit des repas (modèle), en respectant les verrous, puis tire les repas vides. */
    applyMeals: (fills: { day: string; meal: string; recipeId: string | null }[]) => {
      const targeted = new Set(fills.map((f) => f.day));
      const updated = days
        .filter((d) => targeted.has(d.day))
        .map((d) =>
          d.slots.map((s) => {
            if (s.locked) return s;
            const f = fills.find((x) => x.day === s.day && x.meal === s.meal);
            return { ...s, recipeId: f?.recipeId ?? null };
          }),
        );
      // les repas laissés vides par le modèle sont complétés par le tirage
      const drawn = drawWeek(
        updated.map((slots) => slots.map((s) => (s.recipeId ? { ...s, locked: true } : s))),
        ctx,
      ).map((slots, i) => slots.map((s, j) => ({ ...s, locked: updated[i][j].locked })));
      return save(drawn.flat());
    },
  };
}

export type PlanningWeek = ReturnType<typeof usePlanningWeek>;
