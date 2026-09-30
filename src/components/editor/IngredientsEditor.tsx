"use client";
/**
 * Édition des ingrédients : une ligne de texte par ingrédient
 * (« 200 g de farine »), lue automatiquement en quantité / unité / nom.
 * Coller plusieurs lignes crée plusieurs ingrédients ; une ligne finissant
 * par « : » devient un titre de groupe (« Vinaigrette : »).
 * Le bouton « ⋯ » ouvre les détails (groupe, rayon, grammes, ajustable).
 */
import { useState } from "react";
import { IconArrowDown, IconArrowUp, IconMore, IconPlus, IconTrash } from "@/components/ui/icons";
import { Field, NumberInput, TextInput, cx } from "@/components/ui/primitives";
import { AISLES } from "@/config/ui";
import { emptyIngredient } from "@/lib/recipes/factory";
import type { Doubt } from "@/lib/recipes/import-format";
import { formatDecimal, parseIngredientLine, withDe } from "@/lib/recipes/quantities";
import type { Ingredient } from "@/lib/recipes/types";
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
  return { ...i, rawText: line, quantity: p.quantity, unit: p.unit, name: p.name || line.trim() };
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
  const [lines, setLines] = useState<Record<string, string>>(() =>
    Object.fromEntries(ingredients.map((i) => [i.id, ingredientLine(i)])),
  );
  const [openDetails, setOpenDetails] = useState<string | null>(null);

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

  function move(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= ingredients.length) return;
    const next = [...ingredients];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  }

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
      {ingredients.map((ing, index) => {
        const showSection = ing.section && ing.section !== ingredients[index - 1]?.section;
        const key = `ingredient:${ing.id}`;
        const doubt = doubts.find((d) => d.key === key);
        const detailsOpen = openDetails === ing.id;
        return (
          <div key={ing.id} id={`field-${key}`} className="scroll-mt-24">
            {showSection && (
              <div className="pt-3 pb-1 text-[13px] font-bold tracking-[.06em] text-neutral-700 uppercase">{ing.section}</div>
            )}
            <DoubtBox doubt={doubt} onPick={(o) => setLine(ing, o)} onResolve={() => resolveDoubt(key)}>
              <div className="flex items-center gap-1.5">
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
                  className={cx(
                    "flex size-11 flex-none items-center justify-center rounded-full",
                    detailsOpen ? "bg-ink text-bg" : "bg-surface",
                  )}
                >
                  <IconMore />
                </button>
              </div>
            </DoubtBox>
            {detailsOpen && (
              <div className="mt-1.5 mb-2 grid grid-cols-2 gap-2.5 rounded-field bg-surface p-3">
                <p className="col-span-2 text-sm text-neutral-700">
                  Lu : <strong>{ing.quantity != null ? formatDecimal(ing.quantity) : "—"}</strong>
                  {ing.unit && <> · unité <strong>{ing.unit}</strong></>} · nom <strong>{ing.name || "—"}</strong>
                </p>
                <Field label="Groupe" className="col-span-2">
                  <TextInput
                    value={ing.section ?? ""}
                    onChange={(e) => update(ing.id, { section: e.target.value || null })}
                    placeholder="ex. Vinaigrette (facultatif)"
                  />
                </Field>
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
                <label className="col-span-2 flex items-center gap-2.5 text-[15px]">
                  <input
                    type="checkbox"
                    checked={ing.scalable}
                    onChange={(e) => update(ing.id, { scalable: e.target.checked })}
                    className="size-5 accent-[var(--color-accent-600)]"
                  />
                  Change avec les portions (décocher pour « sel au goût »)
                </label>
                <div className="col-span-2 flex gap-2">
                  <button type="button" onClick={() => move(index, -1)} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-neutral-100 font-bold">
                    <IconArrowUp size={18} /> Monter
                  </button>
                  <button type="button" onClick={() => move(index, 1)} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-neutral-100 font-bold">
                    <IconArrowDown size={18} /> Descendre
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(ing.id)}
                    aria-label="Supprimer"
                    className="flex size-11 flex-none items-center justify-center rounded-full bg-accent-100 text-accent-800"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => add()}
        className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-neutral-500 font-bold text-neutral-800"
      >
        <IconPlus size={18} /> Ajouter un ingrédient
      </button>
    </div>
  );
}
