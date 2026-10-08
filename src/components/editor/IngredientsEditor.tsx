"use client";
/**
 * Édition des ingrédients : une ligne de texte par ingrédient
 * (« 200 g de farine »), lue automatiquement en quantité / unité / nom.
 * Coller plusieurs lignes crée plusieurs ingrédients ; une ligne finissant
 * par « : » devient un titre de groupe (« Vinaigrette : »).
 * Le bouton « ⋯ » ouvre les détails (rayon, grammes, ajustable).
 * Poignée ⠿ pour déplacer ; « + Partie » pour grouper (« Pâte », « Garniture »).
 */
import { useState } from "react";
import { IconMore, IconTrash } from "@/components/ui/icons";
import { Field, NumberInput, TextInput, cx } from "@/components/ui/primitives";
import { AISLES } from "@/config/ui";
import { emptyIngredient } from "@/lib/recipes/factory";
import type { Doubt } from "@/lib/recipes/import-format";
import { formatDecimal, parseIngredientLine, withDe } from "@/lib/recipes/quantities";
import type { Ingredient } from "@/lib/recipes/types";
import { useCustomIngredients } from "@/lib/data/hooks";
import { useSortable } from "@/components/ui/useSortable";
import { addSection, moveRow, removeSection, renameSection, toRows } from "@/lib/recipes/sections";
import { AddButtons, DragHandle, SectionHeader, focusSoon } from "./SortableParts";
import { DoubtBox } from "./DoubtBox";

/** Ligne affichée dans le champ pour un ingrédient. */
export function ingredientLine(i: Ingredient): string {
  if (i.rawText) {
    const p = parseIngredientLine(i.rawText);
    if (p.quantity === i.quantity && p.unit === i.unit && p.name === i.name) return i.rawText;
  }
  const q = i.quantity != null ? formatDecimal(i.quantity) : "";
  if (!q) return i.name;
  return i.unit ? `${q} ${i.unit} ${withDe(i.name)}` : `${q} ${i.name}`;
}

export function applyLine(i: Ingredient, line: string): Ingredient {
  const p = parseIngredientLine(line);
  return {
    ...i,
    rawText: line,
    quantity: p.quantity,
    unit: p.unit,
    name: p.name || line.trim(),
  };
}

export function IngredientsEditor({
  ingredients,
  onChange,
  onRename,
  doubts,
  resolveDoubt,
}: {
  ingredients: Ingredient[];
  onChange: (next: Ingredient[]) => void;
  /** Nom changé : l'éditeur d'étapes met ses jetons {nom} à jour. */
  onRename: (oldName: string, newName: string) => void;
  doubts: Doubt[];
  resolveDoubt: (key: string) => void;
}) {
  const [lines, setLines] = useState<Record<string, string>>(() => Object.fromEntries(ingredients.map((i) => [i.id, ingredientLine(i)])));
  const [openDetails, setOpenDetails] = useState<string | null>(null);
  const customs = useCustomIngredients();

  const lineOf = (i: Ingredient) => lines[i.id] ?? ingredientLine(i);

  function setLine(i: Ingredient, line: string) {
    setLines((l) => ({ ...l, [i.id]: line }));
    const next = applyLine(i, line);
    if (next.name !== i.name && i.name) onRename(i.name, next.name);
    onChange(ingredients.map((x) => (x.id === i.id ? next : x)));
    resolveDoubt(`ingredient:${i.id}`);
  }

  function update(id: string, patch: Partial<Ingredient>) {
    onChange(ingredients.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function add(afterIndex = ingredients.length - 1) {
    const section = ingredients[afterIndex]?.section ?? null;
    const ing = emptyIngredient(afterIndex + 1, section);
    const next = [...ingredients];
    next.splice(afterIndex + 1, 0, ing);
    onChange(next);
    setTimeout(() => document.getElementById(`ing-input-${ing.id}`)?.focus(), 30);
  }

  function remove(id: string) {
    onChange(ingredients.filter((x) => x.id !== id));
  }

  const { container: sortBox, handle: dragHandle, dragging } = useSortable((from, to) => onChange(moveRow(ingredients, from, to)));

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>, index: number) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const current = ingredients[index];
    let section = current.section;
    const created: Ingredient[] = [];
    const newLines: Record<string, string> = {};
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/^[-•*·\s]+/, "").trim();
      if (!line) continue;
      if (/:$/.test(line)) {
        section = line.replace(/\s*:$/, "");
        continue;
      }
      const ing = applyLine(emptyIngredient(0, section), line);
      newLines[ing.id] = line;
      created.push(ing);
    }
    if (!created.length) return;
    const next = [...ingredients];
    // la ligne vide où l'on colle est remplacée
    const replace = !lineOf(current).trim();
    next.splice(replace ? index : index + 1, replace ? 1 : 0, ...created);
    setLines((l) => ({ ...l, ...newLines }));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={sortBox} className="relative flex flex-col gap-1.5">
        {toRows(ingredients).map((row, r) => {
          if (row.kind === "section")
            return (
              <div key={row.key} data-sort>
                <SectionHeader
                  id={row.key}
                  name={row.name}
                  onRename={(name) => onChange(renameSection(ingredients, row.firstId, name))}
                  onRemove={() => onChange(removeSection(ingredients, row.firstId))}
                />
              </div>
            );
          const ing = row.item;
          const index = ingredients.indexOf(ing);
          const key = `ingredient:${ing.id}`;
          const doubt = doubts.find((d) => d.key === key);
          const detailsOpen = openDetails === ing.id;
          return (
            <div
              key={ing.id}
              data-sort
              id={`field-${key}`}
              className={cx("scroll-mt-24 rounded-2xl", dragging === r && "relative z-10 bg-bg shadow-lg")}
            >
              <DoubtBox doubt={doubt} onPick={(o) => setLine(ing, o)} onResolve={() => resolveDoubt(key)}>
                <div className="flex items-center gap-1.5">
                  <DragHandle {...dragHandle} />
                  <TextInput
                    id={`ing-input-${ing.id}`}
                    value={lineOf(ing)}
                    onChange={(e) => setLine(ing, e.target.value)}
                    onPaste={(e) => onPaste(e, index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        add(index);
                      }
                    }}
                    placeholder="ex. 200 g de farine"
                    enterKeyHint="next"
                    className="min-h-11 flex-1 text-base"
                  />
                  <button
                    type="button"
                    aria-label="Détails"
                    onClick={() => setOpenDetails(detailsOpen ? null : ing.id)}
                    className={cx("flex size-11 flex-none items-center justify-center rounded-full", detailsOpen ? "bg-ink text-bg" : "bg-surface")}
                  >
                    <IconMore />
                  </button>
                </div>
              </DoubtBox>
              {detailsOpen && (
                <div className="mt-1.5 mb-2 grid grid-cols-2 gap-2.5 rounded-field bg-surface p-3">
                  <p className="col-span-2 text-sm text-neutral-700">
                    Lu : <strong>{ing.quantity != null ? formatDecimal(ing.quantity) : "—"}</strong>
                    {ing.unit && (
                      <>
                        {" "}
                        · unité <strong>{ing.unit}</strong>
                      </>
                    )}{" "}
                    · nom <strong>{ing.name || "—"}</strong>
                  </p>
                  <Field label="Rayon">
                    <select
                      value={ing.aisle ?? ""}
                      onChange={(e) => update(ing.id, { aisle: e.target.value || null })}
                      className="min-h-12 rounded-field border-[1.5px] border-divider bg-neutral-100 px-3 text-base"
                    >
                      <option value="">—</option>
                      {AISLES.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Grammes (estimés)">
                    <NumberInput value={ing.gramsEstimate} onChange={(v) => update(ing.id, { gramsEstimate: v })} />
                  </Field>
                  {!!customs?.length && (
                    <Field label="Mon ingrédient (valeurs de l'étiquette)" className="col-span-2">
                      <select
                        value={ing.customIngredientId ?? ""}
                        onChange={(e) =>
                          update(ing.id, {
                            customIngredientId: e.target.value || null,
                          })
                        }
                        className="min-h-12 rounded-field border-[1.5px] border-divider bg-neutral-100 px-3 text-base"
                      >
                        <option value="">— aucun —</option>
                        {customs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <label className="col-span-2 flex items-center gap-2.5 text-[15px]">
                    <input
                      type="checkbox"
                      checked={ing.scalable}
                      onChange={(e) => update(ing.id, { scalable: e.target.checked })}
                      className="size-5 accent-[var(--color-accent-600)]"
                    />
                    Change avec les portions (décocher pour « sel au goût »)
                  </label>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => remove(ing.id)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent-100 px-4 font-bold text-accent-800"
                    >
                      <IconTrash size={18} /> Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <AddButtons
        label="Ajouter un ingrédient"
        onAdd={() => add()}
        onAddSection={() => {
          const { items, focusId } = addSection(ingredients, (section) => emptyIngredient(ingredients.length, section));
          onChange(items);
          focusSoon(focusId);
        }}
      />
    </div>
  );
}
