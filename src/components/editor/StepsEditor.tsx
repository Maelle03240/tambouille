"use client";
/**
 * Édition des étapes, en texte lisible : {farine} pour citer un ingrédient
 * (sa quantité s'affichera et suivra les portions), {8 min} pour un minuteur.
 * Pastilles sous le champ pour insérer sans taper les accolades.
 */
import { useRef, useState } from "react";
import { StepText } from "@/components/recipe/StepText";
import { IconArrowDown, IconArrowUp, IconPlus, IconTimer, IconTrash } from "@/components/ui/icons";
import { TextArea, cx } from "@/components/ui/primitives";
import { emptyStep } from "@/lib/recipes/factory";
import type { Doubt } from "@/lib/recipes/import-format";
import { tokensToMarkers } from "@/lib/recipes/markers";
import type { Ingredient, Step } from "@/lib/recipes/types";
import { DoubtBox } from "./DoubtBox";

export interface EditableStep {
  id: string;
  /** Texte avec jetons lisibles {nom} / {8 min}. */
  tokens: string;
}

function tokenName(ingredients: Ingredient[], ing: Ingredient) {
  const same = ingredients.filter((i) => i.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
  return same.length > 1 ? `${ing.name}#${same.indexOf(ing) + 1}` : ing.name;
}

function StepField({
  step,
  index,
  count,
  ingredients,
  doubt,
  onText,
  onMove,
  onRemove,
  onSplitPaste,
  resolveDoubt,
}: {
  step: EditableStep;
  index: number;
  count: number;
  ingredients: Ingredient[];
  doubt?: Doubt;
  onText: (t: string) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onSplitPaste: (lines: string[]) => void;
  resolveDoubt: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const preview = tokensToMarkers(step.tokens, ingredients);

  function insert(token: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? step.tokens.length;
    const end = el?.selectionEnd ?? start;
    const before = step.tokens.slice(0, start);
    const spacer = before && !/\s$/.test(before) ? " " : "";
    const next = before + spacer + token + step.tokens.slice(end);
    onText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = (before + spacer + token).length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div id={`field-step:${step.id}`} className="flex scroll-mt-24 gap-3">
      <span className="min-w-5 pt-3 font-heading text-lg text-accent-700">{index + 1}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <DoubtBox doubt={doubt} onResolve={resolveDoubt}>
          <TextArea
            ref={ref}
            value={step.tokens}
            rows={3}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onChange={(e) => {
              onText(e.target.value);
              resolveDoubt();
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim()).filter(Boolean);
              if (lines.length > 1 && !step.tokens.trim()) {
                e.preventDefault();
                onSplitPaste(lines);
              }
            }}
            placeholder="ex. Faites fondre {beurre} puis dorez {5 min}."
            className="min-h-24 text-base"
          />
        </DoubtBox>
        {focused && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" onMouseDown={(e) => e.preventDefault()}>
            <button
              type="button"
              onClick={() => insert("{10 min}")}
              className="flex h-9 flex-none items-center gap-1 rounded-full border-2 border-accent-400 bg-accent-200 px-3 text-sm font-bold text-accent-800"
            >
              <IconTimer size={15} /> Minuteur
            </button>
            {ingredients
              .filter((i) => i.name.trim())
              .map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => insert(`{${tokenName(ingredients, i)}}`)}
                  className="h-9 flex-none rounded-full bg-surface px-3 text-sm font-bold whitespace-nowrap"
                >
                  {i.name}
                </button>
              ))}
          </div>
        )}
        {step.tokens.includes("{") && (
          <p className="rounded-field bg-neutral-200 px-3 py-2 text-[15px] leading-relaxed">
            <StepText text={preview.text} ingredients={ingredients} />
          </p>
        )}
        {preview.unresolved.length > 0 && (
          <p className="text-[13px] font-bold text-accent-800">
            Pas trouvé dans les ingrédients : {preview.unresolved.map((u) => `« ${u} »`).join(", ")}
          </p>
        )}
        <div className="flex justify-end gap-1">
          <button type="button" aria-label="Monter" disabled={index === 0} onClick={() => onMove(-1)} className="flex size-9 items-center justify-center rounded-full disabled:opacity-30">
            <IconArrowUp size={18} />
          </button>
          <button type="button" aria-label="Descendre" disabled={index === count - 1} onClick={() => onMove(1)} className="flex size-9 items-center justify-center rounded-full disabled:opacity-30">
            <IconArrowDown size={18} />
          </button>
          <button type="button" aria-label="Supprimer l'étape" onClick={onRemove} className="flex size-9 items-center justify-center rounded-full text-accent-800">
            <IconTrash size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StepsEditor({
  steps,
  onChange,
  ingredients,
  doubts,
  resolveDoubt,
}: {
  steps: EditableStep[];
  onChange: (next: EditableStep[]) => void;
  ingredients: Ingredient[];
  doubts: Doubt[];
  resolveDoubt: (key: string) => void;
}) {
  const newStep = (tokens = ""): EditableStep => ({ id: emptyStep(0).id, tokens });

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-neutral-700">
        <strong>{"{beurre}"}</strong> = quantité · <strong>{"{8 min}"}</strong> = minuteur
      </p>
      {steps.map((s, i) => (
        <StepField
          key={s.id}
          step={s}
          index={i}
          count={steps.length}
          ingredients={ingredients}
          doubt={doubts.find((d) => d.key === `step:${s.id}`)}
          onText={(t) => onChange(steps.map((x) => (x.id === s.id ? { ...x, tokens: t } : x)))}
          onMove={(d) => move(i, d)}
          onRemove={() => onChange(steps.filter((x) => x.id !== s.id))}
          onSplitPaste={(lines) => {
            const created = lines.map((l) => newStep(l));
            const next = [...steps];
            next.splice(i, 1, ...created);
            onChange(next);
          }}
          resolveDoubt={() => resolveDoubt(`step:${s.id}`)}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...steps, newStep()])}
        className={cx(
          "flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-neutral-500 font-bold text-neutral-800",
        )}
      >
        <IconPlus size={18} /> Ajouter une étape
      </button>
    </div>
  );
}

/** Étapes éditables → étapes stockées (marqueurs). */
export function toSteps(steps: EditableStep[], ingredients: Ingredient[]): Step[] {
  return steps
    .filter((s) => s.tokens.trim())
    .map((s, position) => ({ id: s.id, position, text: tokensToMarkers(s.tokens.trim(), ingredients).text, timerMinutes: null }));
}
