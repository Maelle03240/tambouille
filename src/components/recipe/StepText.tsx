"use client";
/**
 * Affiche le texte d'une étape : les marqueurs d'ingrédients deviennent
 * « **200 g** de farine » (recalculé selon les portions) et les minuteurs
 * sont rendus par `renderTimer` (pastille statique ou interactive).
 */
import type { ReactNode } from "react";
import { formatDuration, parseStepText } from "@/lib/recipes/markers";
import { formatIngredient } from "@/lib/recipes/quantities";
import type { Ingredient } from "@/lib/recipes/types";

export function StepText({
  text,
  ingredients,
  factor = 1,
  renderTimer,
}: {
  text: string;
  ingredients: Ingredient[];
  factor?: number;
  renderTimer?: (minutes: number, index: number) => ReactNode;
}) {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  let timerIndex = 0;
  return (
    <>
      {parseStepText(text).map((part, k) => {
        if (part.type === "text") return <span key={k}>{part.value}</span>;
        if (part.type === "timer") {
          const idx = timerIndex++;
          return <span key={k}>{renderTimer ? renderTimer(part.minutes, idx) : <StaticTimer minutes={part.minutes} />}</span>;
        }
        const ing = byId.get(part.id);
        if (!ing) return null;
        const { amount, rest } = formatIngredient(ing, factor);
        return (
          <span key={k}>
            {amount && <strong className="font-extrabold">{amount}</strong>}
            {amount ? " " : ""}
            {rest}
          </span>
        );
      })}
    </>
  );
}

export function StaticTimer({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-200 px-[0.6em] py-[0.05em] align-baseline text-[0.9em] font-bold whitespace-nowrap text-accent-800">
      {formatDuration(minutes)}
    </span>
  );
}

/** Version texte brut (pour le minuteur plein écran, le partage…). */
export function stepPlainText(text: string, ingredients: Ingredient[], factor = 1): string {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  return parseStepText(text)
    .map((p) => {
      if (p.type === "text") return p.value;
      if (p.type === "timer") return formatDuration(p.minutes);
      const ing = byId.get(p.id);
      if (!ing) return "";
      const { amount, rest } = formatIngredient(ing, factor);
      return amount ? `${amount} ${rest}` : rest;
    })
    .join("");
}
