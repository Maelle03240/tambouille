"use client";
import { formatIngredient } from "@/lib/recipes/quantities";
import type { Ingredient } from "@/lib/recipes/types";
import { IconCheck } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

/** Regroupe les ingrédients consécutifs par section (« Vinaigrette »…). */
export function groupBySection(ingredients: Ingredient[]) {
  const groups: { section: string | null; items: Ingredient[] }[] = [];
  for (const ing of ingredients) {
    const last = groups[groups.length - 1];
    if (last && last.section === ing.section) last.items.push(ing);
    else groups.push({ section: ing.section, items: [ing] });
  }
  return groups;
}

function SectionHead({ children, className = "px-3" }: { children: string; className?: string }) {
  return <div className={cx("pt-3.5 pb-0.5 text-[13px] font-bold tracking-[.06em] text-neutral-700 uppercase", className)}>{children}</div>;
}

/** Liste simple (fiche recette). */
export function IngredientList({ ingredients, factor = 1 }: { ingredients: Ingredient[]; factor?: number }) {
  return (
    <div className="flex flex-col">
      {groupBySection(ingredients).map((g, gi) => (
        <div key={gi}>
          {g.section && <SectionHead className="px-0">{g.section}</SectionHead>}
          {g.items.map((ing) => {
            const { amount, rest } = formatIngredient(ing, factor);
            return (
              <div key={ing.id} className="flex min-h-10 items-center border-b border-divider py-1.5 text-[17px]">
                <span>
                  {amount && <strong className="font-bold">{amount}</strong>} {rest}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Liste cochable (mode cuisine). */
export function CheckableIngredients({
  ingredients,
  factor,
  checked,
  onToggle,
}: {
  ingredients: Ingredient[];
  factor: number;
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {groupBySection(ingredients).map((g, gi) => (
        <div key={gi}>
          {g.section && <SectionHead>{g.section}</SectionHead>}
          {g.items.map((ing) => {
            const on = checked.has(ing.id);
            const { amount, rest } = formatIngredient(ing, factor);
            return (
              <button
                key={ing.id}
                type="button"
                onClick={() => onToggle(ing.id)}
                aria-pressed={on}
                className="flex min-h-[54px] w-full items-center gap-3.5 rounded-[18px] px-3 py-1.5 text-left active:bg-neutral-300/50"
              >
                <span
                  className={cx(
                    "flex size-[30px] flex-none items-center justify-center rounded-full border-2 text-neutral-100",
                    on ? "border-leaf-600 bg-leaf-600" : "border-neutral-500",
                  )}
                >
                  {on && <IconCheck size={16} stroke={3.5} />}
                </span>
                <span className={cx("text-lg leading-snug", on && "text-neutral-600 line-through")}>
                  {amount && <strong className="font-bold">{amount}</strong>} {rest}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
