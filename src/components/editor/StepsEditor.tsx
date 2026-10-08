"use client";
/**
 * Édition des étapes, en texte lisible : {farine} pour citer un ingrédient
 * (sa quantité s'affichera et suivra les portions), {8 min} pour un minuteur.
 * Pastilles sous le champ pour insérer sans taper les accolades.
 * Poignée ⠿ pour déplacer ; « + Partie » pour grouper (« Biscuit », « Crème »).
 */
import { useRef, useState } from "react";
import { StepText } from "@/components/recipe/StepText";
import { IconTimer, IconTrash } from "@/components/ui/icons";
import { TextArea, cx } from "@/components/ui/primitives";
import { useSortable } from "@/components/ui/useSortable";
import { emptyStep } from "@/lib/recipes/factory";
import type { Doubt } from "@/lib/recipes/import-format";
import { tokensToMarkers } from "@/lib/recipes/markers";
import { addSection, cleanSection, moveRow, removeSection, renameSection, toRows } from "@/lib/recipes/sections";
import type { Ingredient, Step } from "@/lib/recipes/types";
import { DoubtBox } from "./DoubtBox";
import { AddButtons, DragHandle, SectionHeader, focusSoon } from "./SortableParts";

export interface EditableStep {
  id: string;
  /** Partie (« Biscuit ») ; "" = pas encore nommée. */
  section: string | null;
  /** Texte avec jetons lisibles {nom} / {8 min}. */
  tokens: string;
}

function tokenName(ingredients: Ingredient[], ing: Ingredient) {
  const same = ingredients.filter((i) => i.name.trim().toLowerCase() === ing.name.trim().toLowerCase());
  return same.length > 1 ? `${ing.name}#${same.indexOf(ing) + 1}` : ing.name;
}

function StepField({
  step,
  number,
  ingredients,
  doubt,
  handle,
  onText,
  onRemove,
  onSplitPaste,
  resolveDoubt,
}: {
  step: EditableStep;
  number: number;
  ingredients: Ingredient[];
  doubt?: Doubt;
  handle: ReturnType<typeof useSortable>["handle"];
  onText: (t: string) => void;
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
    <div className="flex gap-1.5">
      <DragHandle {...handle} />
      <span className="min-w-5 pt-3 font-heading text-lg text-accent-700">{number}</span>
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
              const lines = text
                .split(/\r?\n/)
                .map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
                .filter(Boolean);
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
      </div>
      <button
        type="button"
        aria-label="Supprimer l'étape"
        onClick={onRemove}
        className="flex size-9 flex-none items-center justify-center self-start rounded-full text-accent-800"
      >
        <IconTrash size={18} />
      </button>
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
  const newStep = (tokens = "", section: string | null = null): EditableStep => ({ id: emptyStep(0).id, section, tokens });
  const { container: sortBox, handle: dragHandle, dragging } = useSortable((from, to) => onChange(moveRow(steps, from, to)));
  const rows = toRows(steps);
  let number = 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-neutral-700">
        <strong>{"{beurre}"}</strong> = quantité · <strong>{"{8 min}"}</strong> = minuteur
      </p>
      <div ref={sortBox} className="relative flex flex-col gap-3">
        {rows.map((row, r) =>
          row.kind === "section" ? (
            <div key={row.key} data-sort>
              <SectionHeader
                id={row.key}
                name={row.name}
                onRename={(name) => onChange(renameSection(steps, row.firstId, name))}
                onRemove={() => onChange(removeSection(steps, row.firstId))}
              />
            </div>
          ) : (
            <div
              key={row.item.id}
              data-sort
              id={`field-step:${row.item.id}`}
              className={cx("scroll-mt-24 rounded-2xl", dragging === r && "relative z-10 bg-bg shadow-lg")}
            >
              <StepField
                step={row.item}
                number={++number}
                ingredients={ingredients}
                doubt={doubts.find((d) => d.key === `step:${row.item.id}`)}
                handle={dragHandle}
                onText={(t) => onChange(steps.map((x) => (x.id === row.item.id ? { ...x, tokens: t } : x)))}
                onRemove={() => onChange(steps.filter((x) => x.id !== row.item.id))}
                onSplitPaste={(lines) => {
                  const i = steps.findIndex((x) => x.id === row.item.id);
                  const next = [...steps];
                  next.splice(i, 1, ...lines.map((l) => newStep(l, row.item.section)));
                  onChange(next);
                }}
                resolveDoubt={() => resolveDoubt(`step:${row.item.id}`)}
              />
            </div>
          ),
        )}
      </div>
      <AddButtons
        label="Ajouter une étape"
        onAdd={() => onChange([...steps, newStep("", steps.at(-1)?.section ?? null)])}
        onAddSection={() => {
          const { items, focusId } = addSection(steps, (section) => newStep("", section));
          onChange(items);
          focusSoon(focusId);
        }}
      />
    </div>
  );
}

/** Étapes éditables → étapes stockées (marqueurs). */
export function toSteps(steps: EditableStep[], ingredients: Ingredient[]): Step[] {
  return steps
    .filter((s) => s.tokens.trim())
    .map((s, position) => ({
      id: s.id,
      position,
      section: cleanSection(s.section),
      text: tokensToMarkers(s.tokens.trim(), ingredients).text,
      timerMinutes: null,
    }));
}
