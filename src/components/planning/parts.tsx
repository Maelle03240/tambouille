"use client";
/** Briques du planning : carré de recette, barres d'objectifs, ligne de repas. */
import { IconClose, IconLock, IconShuffle, IconUnlock } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { categoryColors } from "@/config/categories";
import { momentLabel } from "@/config/moments";
import { NUTRIENTS, type NutrientKey } from "@/config/planning";
import { isOnTarget, isOver, targetFor, targetValue } from "@/lib/planning/nutrition";
import type { MealPlanEntry, Nutrition } from "@/lib/planning/types";
import { formatDecimal } from "@/lib/recipes/quantities";
import { isProteinRich } from "@/lib/recipes/tags";
import type { Recipe, UserSettings } from "@/lib/recipes/types";

export function RecipeSquare({ recipe, size = 48 }: { recipe?: Recipe; size?: number }) {
  const col = categoryColors(recipe?.category);
  return (
    <span
      className="flex flex-none items-center justify-center rounded-[14px] font-heading"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: recipe ? col.bg : "var(--color-neutral-200)",
        color: recipe ? col.ink : "var(--color-neutral-500)",
      }}
    >
      {recipe ? recipe.title.charAt(0).toUpperCase() : "?"}
    </span>
  );
}

/** « 1 portion », « 2 cookies » (dans l'unité de la recette). */
export function portionLabel(recipe: Recipe | undefined, portions: number) {
  if (!recipe) return "";
  const unit = recipe.yieldUnit || "portions";
  if (/^(pers|part|portion)/.test(unit)) return `${formatDecimal(portions)} portion${portions > 1 ? "s" : ""}`;
  return `${formatDecimal(portions * (recipe.portionSize || 1))} ${unit}`;
}

const NUT_COLORS: Record<NutrientKey, string> = {
  protein: "var(--color-accent-600)",
  kcal: "var(--color-neutral-800)",
  fat: "var(--color-accent-2-600)",
  carbs: "oklch(0.7 0.11 70)",
  fiber: "oklch(0.6 0.1 150)",
};

const fmt = (key: NutrientKey, v: number) => (key === "kcal" ? Math.round(v).toLocaleString("fr-FR") : String(Math.round(v)));

/** Barres « prévu / objectif » : la priorité en grand, les autres en fin. */
export function NutritionBars({ sum, targets, priority }: { sum: Nutrition; targets: UserSettings["dailyTargets"]; priority: NutrientKey }) {
  const ordered = [...NUTRIENTS].sort((a, b) => (a.key === priority ? -1 : b.key === priority ? 1 : 0));
  const [main, ...others] = ordered;
  const mt = targetFor(main.key, targets);
  const mv = targetValue(mt);
  const diff = mv != null ? mv - sum[main.key] : 0;
  const mainOver = isOver(main.key, sum[main.key], mt);
  return (
    <div className="flex flex-col gap-2.5 rounded-[28px] bg-neutral-100 p-4 shadow-md">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-bold tracking-[.06em] text-accent-700 uppercase">{main.label} · priorité</span>
        {mv != null && (
          <span className={cx("font-semibold", mainOver ? "font-bold text-danger" : "text-neutral-700")}>
            {isOnTarget(sum[main.key], mt)
              ? "Objectif atteint ✓"
              : diff > 0
                ? `Il manque ${fmt(main.key, diff)} ${main.unit}`
                : `+ ${fmt(main.key, -diff)} ${main.unit}`}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cx("font-heading text-[46px] leading-none tabular-nums", mainOver && "text-danger")}>{fmt(main.key, sum[main.key])}</span>
        <span className="text-[17px] font-bold text-neutral-700">
          {mv != null ? `/ ${fmt(main.key, mv)} ` : ""}
          {main.unit}
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-neutral-300">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${mv ? Math.min(100, (sum[main.key] / mv) * 100) : 0}%`,
            background: mainOver ? "var(--color-danger)" : NUT_COLORS[main.key],
          }}
        />
      </div>
      <div className="mt-1.5 flex flex-col gap-2">
        {others.map((n) => {
          const t = targetFor(n.key, targets);
          const tv = targetValue(t);
          const over = isOver(n.key, sum[n.key], t);
          return (
            <div key={n.key} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2.5">
              <span className="text-sm font-bold">{n.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-300">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${tv ? Math.min(100, (sum[n.key] / tv) * 100) : 0}%`,
                    background: over ? "var(--color-danger)" : NUT_COLORS[n.key],
                  }}
                />
              </div>
              <span className="text-[13px] font-semibold whitespace-nowrap text-neutral-800 tabular-nums">
                <span className={cx(over && "font-bold text-danger")}>{fmt(n.key, sum[n.key])}</span>
                {tv != null ? ` / ${fmt(n.key, tv)}` : ""} {n.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Les deux règles fermes du jour. */
export function RulesIndicators({ recipes, threshold }: { recipes: Recipe[]; threshold: number }) {
  const rich = recipes.some((r) => isProteinRich(r, { proteinRichThresholdG: threshold }));
  const veg = recipes.some((r) => r.hasVegetables);
  const pill = (ok: boolean, yes: string, no: string) => (
    <span
      className={cx(
        "flex h-10 items-center rounded-full px-3.5 text-sm font-bold",
        ok ? "border-[1.5px] border-leaf-300 bg-leaf-200 text-leaf-900" : "border-[1.5px] border-dashed border-neutral-400 text-neutral-700",
      )}
    >
      {ok ? yes : no}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {pill(rich, "Riche en protéines ✓", "Pas de repas riche en protéines")}
      {pill(veg, "Légumes ✓", "Pas de légumes")}
    </div>
  );
}

/** Un plat ajouté à côté (entrée, dessert, pain…), sous son repas (vue jour). */
export function ExtraRow({ entry, recipe, onOpen, onRemove }: { entry: MealPlanEntry; recipe?: Recipe; onOpen: () => void; onRemove: () => void }) {
  return (
    <div onClick={onOpen} className="ml-6 flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[20px] bg-surface py-1.5 pr-1.5 pl-2.5">
      <RecipeSquare recipe={recipe} size={36} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="leading-tight font-bold">{recipe?.title ?? "?"}</span>
        {recipe && (
          <span className="text-[13px] text-neutral-800">
            {Math.round((recipe.proteinG ?? 0) * entry.portions)} g prot. · {Math.round((recipe.kcal ?? 0) * entry.portions)} kcal
            {entry.portions !== 1 && ` · ${portionLabel(recipe, entry.portions)}`}
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label="Retirer ce plat"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex size-10 flex-none items-center justify-center rounded-full text-neutral-700"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}

/** Une ligne de repas (vue jour) : ouvrir, verrouiller, retirer au sort. */
export function SlotRow({
  slot,
  recipe,
  onOpen,
  onLock,
  onSwap,
}: {
  slot: MealPlanEntry;
  recipe?: Recipe;
  onOpen: () => void;
  onLock: () => void;
  onSwap: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={cx(
        "flex min-h-[76px] cursor-pointer items-center gap-2 rounded-3xl border-2 bg-surface py-2.5 pr-2 pl-3",
        slot.locked ? "border-leaf-500" : "border-transparent",
      )}
    >
      <RecipeSquare recipe={recipe} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-xs font-bold tracking-[.04em] text-neutral-700 uppercase">{momentLabel(slot.meal)}</span>
        <span className="text-[17px] leading-tight font-bold">{recipe?.title ?? "À choisir"}</span>
        {recipe && (
          <span className="text-[13px] text-neutral-800">
            <strong>{Math.round((recipe.proteinG ?? 0) * slot.portions)} g prot.</strong> · {Math.round((recipe.kcal ?? 0) * slot.portions)} kcal
            {slot.portions !== 1 && ` · ${portionLabel(recipe, slot.portions)}`}
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label={slot.locked ? "Déverrouiller" : "Garder ce plat"}
        onClick={(e) => {
          e.stopPropagation();
          onLock();
        }}
        className={cx(
          "flex size-11 flex-none items-center justify-center rounded-full",
          slot.locked ? "bg-leaf-600 text-neutral-100" : "text-neutral-700",
        )}
      >
        {slot.locked ? <IconLock size={20} /> : <IconUnlock size={20} />}
      </button>
      <button
        type="button"
        aria-label="Autre plat au hasard"
        disabled={slot.locked}
        onClick={(e) => {
          e.stopPropagation();
          onSwap();
        }}
        className="flex size-11 flex-none items-center justify-center rounded-full bg-neutral-100 shadow-sm disabled:opacity-35"
      >
        <IconShuffle size={20} />
      </button>
    </div>
  );
}
