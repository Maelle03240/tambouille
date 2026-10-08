"use client";
/**
 * « Choisir moi-même » (maquette) : recherche + filtres, et pour chaque plat
 * l'effet sur l'objectif prioritaire du jour avant de valider.
 */
import { useMemo, useState } from "react";
import { IconBack, IconSearch } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { momentLabel } from "@/config/moments";
import { NUTRIENTS } from "@/config/planning";
import { longLabel } from "@/lib/planning/dates";
import { candidatesFor, dayNutrition, rankForSlot, type DrawContext } from "@/lib/planning/draw";
import { recipeNutrition, targetFor, targetValue } from "@/lib/planning/nutrition";
import type { MealPlanEntry } from "@/lib/planning/types";
import { isProteinRich } from "@/lib/recipes/tags";
import type { Recipe } from "@/lib/recipes/types";
import { RecipeSquare } from "./parts";

type Filter = "repas" | "prot" | "veg" | "tout";

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function RecipePicker({
  dayEntries,
  index,
  ctx,
  byId,
  onClose,
  onPick,
  adding,
}: {
  dayEntries: MealPlanEntry[];
  index: number;
  /** Ajouter un plat à côté (entrée, dessert, pain…) plutôt que remplacer. */
  adding?: boolean;
  ctx: DrawContext;
  byId: Map<string, Recipe>;
  onClose: () => void;
  onPick: (recipeId: string) => void;
}) {
  const slot = dayEntries[index];
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(adding ? "tout" : "repas");
  const [selected, setSelected] = useState<string | null>(null);
  const prio = NUTRIENTS.find((n) => n.key === ctx.priority)!;
  const current = slot.recipeId ? byId.get(slot.recipeId) : undefined;
  const daySum = dayNutrition(dayEntries, byId);
  const without = (key: typeof prio.key) => daySum[key] - recipeNutrition(current, slot.portions)[key];
  const target = targetValue(targetFor(prio.key, ctx.targets));

  const results = useMemo(() => {
    const pool =
      filter === "repas"
        ? candidatesFor(slot.meal, ctx.recipes)
        : ctx.recipes.filter(
            (r) =>
              filter === "tout" ||
              (!r.isOccasion &&
                ((filter === "prot" && isProteinRich(r, { proteinRichThresholdG: ctx.proteinRichThresholdG })) ||
                  (filter === "veg" && r.hasVegetables))),
          );
    const words = fold(q).split(/\s+/).filter(Boolean);
    const matching = pool.filter((r) => words.every((w) => fold(r.title).includes(w)));
    return rankForSlot(dayEntries, index, matching, ctx);
  }, [filter, q, slot.meal, ctx, dayEntries, index]);

  const chosen = selected ? byId.get(selected) : current;
  const after = without(prio.key) + recipeNutrition(chosen, slot.portions)[prio.key];
  const round = (v: number) => Math.round(v).toLocaleString("fr-FR");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="pt-safe flex flex-none items-center gap-3 px-4 pb-2.5">
        <button
          type="button"
          aria-label="Retour"
          onClick={onClose}
          className="flex size-12 flex-none items-center justify-center rounded-full bg-surface"
        >
          <IconBack />
        </button>
        <div className="flex min-w-0 flex-col">
          <span className="font-heading text-2xl leading-tight">
            {adding ? "Ajouter au" : "Choisir :"} {momentLabel(slot.meal).toLowerCase()}
          </span>
          <span className="text-[13px] text-neutral-700">{longLabel(slot.day)}</span>
        </div>
      </div>
      <label className="mx-4 flex h-[50px] flex-none items-center gap-2.5 rounded-full bg-surface px-[18px]">
        <IconSearch size={18} className="text-neutral-700" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher un plat…"
          className="min-w-0 flex-1 bg-transparent text-base focus:outline-none"
        />
      </label>
      <div className="no-scrollbar flex flex-none gap-1.5 overflow-x-auto px-4 py-2.5">
        {(
          [
            ["repas", `Pour le ${momentLabel(slot.meal).toLowerCase()}`],
            ["prot", "Riche en protéines"],
            ["veg", "Légumes"],
            ["tout", "Tout"],
          ] as [Filter, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cx(
              "h-10 flex-none rounded-full border-[1.5px] px-3.5 text-sm font-bold whitespace-nowrap",
              filter === k ? "border-ink bg-ink text-bg" : "border-neutral-400 text-neutral-800",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="mx-4 mb-2 flex flex-none flex-col gap-2 rounded-[22px] bg-neutral-100 px-3.5 py-3 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-bold tracking-[.05em] text-accent-700 uppercase">{prio.label} du jour</span>
          <span className="text-[15px] font-bold tabular-nums">
            {round(daySum[prio.key])} → <span className="text-xl">{round(after)}</span>
            {target != null && ` / ${round(target)}`} {prio.unit}
          </span>
        </div>
        {target != null && (
          <div className="relative h-3 overflow-hidden rounded-full bg-neutral-300">
            <div className="absolute inset-y-0 left-0 rounded-full bg-accent-300" style={{ width: `${Math.min(100, (after / target) * 100)}%` }} />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent-600"
              style={{ width: `${Math.min(100, (Math.min(after, daySum[prio.key]) / target) * 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {results.length === 0 && <p className="px-4 py-8 text-center text-neutral-700">Aucun plat. Essaie « Tout ».</p>}
        {results.map(({ recipe: r }, i) => {
          const isCurrent = r.id === slot.recipeId;
          const delta = recipeNutrition(r, slot.portions)[prio.key] - recipeNutrition(current, slot.portions)[prio.key];
          const sel = selected === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.id)}
              className={cx(
                "flex min-h-[72px] items-center gap-3 rounded-[22px] border-2 px-3 py-2 text-left",
                sel ? "border-accent bg-neutral-100" : "border-transparent",
              )}
            >
              <RecipeSquare recipe={r} size={46} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {i === 0 && !isCurrent && (
                  <span className="text-[11px] font-extrabold tracking-[.05em] text-leaf-700 uppercase">Meilleur pour ton objectif</span>
                )}
                <span className="leading-tight font-bold">{r.title}</span>
                <span className="text-[13px] text-neutral-700">
                  {Math.round(r.proteinG ?? 0)} g prot. · {Math.round(r.kcal ?? 0)} kcal
                </span>
              </span>
              <span
                className={cx(
                  "flex-none rounded-full px-2.5 py-1 text-[13px] font-extrabold whitespace-nowrap",
                  isCurrent
                    ? "bg-surface text-neutral-700"
                    : delta > 0
                      ? "bg-leaf-200 text-leaf-900"
                      : delta < 0
                        ? "bg-accent-100 text-accent-800"
                        : "bg-surface",
                )}
              >
                {isCurrent ? "Actuel" : `${delta >= 0 ? "+" : "−"}${round(Math.abs(delta))} ${prio.unit}`}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pb-safe flex-none border-t border-divider px-4 pt-3">
        <button
          type="button"
          disabled={!selected || selected === slot.recipeId}
          onClick={() => selected && onPick(selected)}
          className="h-[60px] w-full truncate rounded-full bg-accent-600 px-4 font-heading text-lg text-neutral-100 disabled:bg-neutral-300 disabled:text-neutral-700"
        >
          {selected && selected !== slot.recipeId ? `${adding ? "Ajouter" : "Choisir"} « ${byId.get(selected)?.title} »` : "Choisis un plat"}
        </button>
      </div>
    </div>
  );
}
