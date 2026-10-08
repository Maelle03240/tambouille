"use client";
/**
 * La semaine affichée dans le planning : repas actifs de chaque jour (plat
 * choisi ou vide), plats ajoutés à côté (entrée, dessert, pain…), valeurs
 * prévues, et actions (tirage, changer, verrouiller…). Le tirage ne touche
 * qu'au plat principal ; les ajouts comptent dans les valeurs du jour.
 */
import { useMemo } from "react";
import { useApp } from "@/components/app/AppProvider";
import { MOMENTS } from "@/config/moments";
import { removePlanEntries, savePlanEntries } from "@/lib/data/actions";
import { useAllRecipes, useMealPlans, useRecipes, useSettings } from "@/lib/data/hooks";
import { addDays, weekDays } from "@/lib/planning/dates";
import { dayNutrition, drawDay, drawWeek, rerollSlot, type DrawContext } from "@/lib/planning/draw";
import { entryKey, type MealPlanEntry } from "@/lib/planning/types";

export function usePlanningWeek(monday: string) {
  const { toast } = useApp();
  const settings = useSettings();
  // tirage et choix : mes recettes visibles ; affichage d'un repas : n'importe laquelle du cache
  const recipes = useRecipes();
  const allRecipes = useAllRecipes();
  const plans = useMealPlans(monday, addDays(monday, 6));

  const meals = useMemo(() => MOMENTS.map((m) => m.id).filter((id) => settings.planning.meals.includes(id)), [settings.planning.meals]);
  const byId = useMemo(() => new Map((allRecipes ?? []).map((r) => [r.id, r])), [allRecipes]);

  const ctx: DrawContext = useMemo(
    () => ({
      recipes: recipes ?? [],
      targets: settings.dailyTargets,
      priority: settings.planning.priority,
      proteinRichThresholdG: settings.proteinRichThresholdG,
    }),
    [recipes, settings],
  );

  /**
   * Repas de chaque jour : ceux planifiés par défaut (réglages) sauf s'ils
   * ont été retirés ce jour-là, plus ceux ajoutés ce jour-là seulement.
   */
  const days = useMemo(
    () =>
      weekDays(monday).map((day) => {
        const all = (plans ?? []).filter((p) => p.day === day);
        const rows = all.filter((p) => !p.slot);
        const extras = all.filter((p) => p.slot && p.recipeId).sort((a, b) => a.slot! - b.slot!);
        const slots = MOMENTS.map((m) => m.id)
          .filter((meal) => {
            const row = rows.find((r) => r.meal === meal);
            return row ? !row.skipped : (meals as string[]).includes(meal);
          })
          .map((meal): MealPlanEntry => rows.find((r) => r.meal === meal) ?? emptySlot(day, meal));
        return { day, slots, extras: extras.filter((e) => slots.some((s) => s.meal === e.meal)) };
      }),
    [monday, meals, plans],
  );

  type Day = (typeof days)[number];
  const nutritionOf = (d: Day) => dayNutrition([...d.slots, ...d.extras], byId);
  /** Plats du jour pour le tirage : les ajouts comptent, mais restent en place. */
  const withExtras = (d: Day, slots = d.slots) => [...slots, ...d.extras.map((e) => ({ ...e, locked: true }))];

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

    drawWeek: () =>
      save(
        drawWeek(
          days.map((d) => withExtras(d)),
          ctx,
        ).flatMap((entries, i) => entries.slice(0, days[i].slots.length)),
      ),
    drawDay: (day: string) => {
      const d = days.find((x) => x.day === day);
      if (d) return save(drawDay(withExtras(d), ctx).slice(0, d.slots.length));
    },
    reroll: (day: string, index: number) => {
      const d = days.find((x) => x.day === day);
      if (!d || d.slots[index].locked) return;
      return save([{ ...d.slots[index], recipeId: rerollSlot(withExtras(d), index, ctx) }]);
    },
    /** Ajoute un plat à côté (entrée, dessert, pain…) dans ce repas. */
    addExtra: (day: string, meal: string, recipeId: string) => {
      const d = days.find((x) => x.day === day);
      const slot = Math.max(0, ...(d?.extras ?? []).filter((e) => e.meal === meal).map((e) => e.slot!)) + 1;
      return save([{ key: entryKey(day, meal, slot), slot, day, meal, recipeId, portions: 1, locked: false }]);
    },
    setRecipe: (slot: MealPlanEntry, recipeId: string | null) => save([{ ...slot, recipeId }]),
    toggleLock: (slot: MealPlanEntry) => save([{ ...slot, locked: !slot.locked }]),
    setPortions: (slot: MealPlanEntry, portions: number) => save([{ ...slot, portions: Math.max(0.5, portions) }]),
    clear: (slot: MealPlanEntry) => run("Suppression", () => removePlanEntries([slot])),
    /** Ajoute un repas à une journée et lui tire un plat. */
    addMeal: (day: string, meal: string) => {
      const d = days.find((x) => x.day === day);
      if (!d) return;
      const slot = { ...emptySlot(day, meal), skipped: false };
      const drawn = drawDay([...d.slots.map((s) => ({ ...s, locked: true })), slot], ctx);
      return save([drawn[drawn.length - 1]]);
    },
    /** Retire un repas de cette journée seulement. */
    removeMeal: (slot: MealPlanEntry) => {
      // un plat ajouté à côté : on l'enlève ; le repas : retiré avec ses ajouts
      if (slot.slot) return run("Suppression", () => removePlanEntries([slot]));
      const extras = days.find((d) => d.day === slot.day)?.extras.filter((e) => e.meal === slot.meal) ?? [];
      return (meals as string[]).includes(slot.meal)
        ? save([{ ...slot, recipeId: null, locked: false, skipped: true }]).then(() => {
            if (extras.length) return run("Suppression", () => removePlanEntries(extras));
          })
        : run("Suppression", () => removePlanEntries([slot, ...extras]));
    },
    /** Remplit des repas (modèle), en respectant les verrous, puis tire les repas vides. */
    applyMeals: async (all: { day: string; meal: string; recipeId: string | null; slot?: number }[]) => {
      const fills = all.filter((f) => !f.slot);
      const targeted = new Set(fills.map((f) => f.day));
      // plats à côté : ceux du modèle remplacent ceux des jours visés
      const oldExtras = days.filter((d) => targeted.has(d.day)).flatMap((d) => d.extras);
      const newExtras = all
        .filter((f) => f.slot && f.recipeId)
        .map((f): MealPlanEntry => ({
          key: entryKey(f.day, f.meal, f.slot),
          slot: f.slot,
          day: f.day,
          meal: f.meal,
          recipeId: f.recipeId,
          portions: 1,
          locked: false,
        }));
      if (oldExtras.length) await run("Suppression", () => removePlanEntries(oldExtras));
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
      return save([...drawn.flat(), ...newExtras]);
    },
  };
}

export type PlanningWeek = ReturnType<typeof usePlanningWeek>;

function emptySlot(day: string, meal: string): MealPlanEntry {
  return { key: entryKey(day, meal), day, meal, recipeId: null, portions: 1, locked: false };
}
