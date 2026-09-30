"use client";
/**
 * Éditeur de recette — un seul composant pour :
 *  - la saisie à la main (mode "create"),
 *  - l'écran de vérification après import IA (mode "review", maquette 05),
 *  - la modification d'une recette existante (mode "edit").
 * Chaque champ a un id `field-<clé>` : la liste « à revoir » y amène directement.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconTrash } from "@/components/ui/icons";
import { Button, Chip, Field, NumberInput, SectionTitle, Sheet, Spinner, TextArea, TextInput, cx } from "@/components/ui/primitives";
import { CATEGORIES, categoryColors } from "@/config/categories";
import { TAGS } from "@/config/tags";
import { PROTEIN_SOURCES, RATINGS, YIELD_UNITS } from "@/config/ui";
import { deleteRecipe, saveRecipe } from "@/lib/data/actions";
import type { Doubt } from "@/lib/recipes/import-format";
import { markersToTokens, tokensToMarkers } from "@/lib/recipes/markers";
import { parseNumber } from "@/lib/recipes/quantities";
import type { Recipe } from "@/lib/recipes/types";
import { DoubtBox } from "./DoubtBox";
import { IngredientsEditor } from "./IngredientsEditor";
import { StepsEditor, toSteps, type EditableStep } from "./StepsEditor";

export type EditorMode = "create" | "review" | "edit";

const MANUAL_TAGS = TAGS.filter((t) => t.kind === "manual");

export function RecipeEditor({
  initial,
  mode,
  doubts: initialDoubts = [],
  sourceLabel,
  focusField,
  onSaved,
  onDeleted,
  headerLeft,
}: {
  initial: Recipe;
  mode: EditorMode;
  doubts?: Doubt[];
  sourceLabel?: string;
  focusField?: string | null;
  onSaved: (r: Recipe) => void;
  onDeleted?: () => void;
  headerLeft: ReactNode;
}) {
  const { toast, online, isAdmin } = useApp();
  const [draft, setDraft] = useState<Recipe>(initial);
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    initial.steps.map((s) => ({ id: s.id, tokens: markersToTokens(s.text, initial.ingredients) })),
  );
  const [doubts, setDoubts] = useState<Doubt[]>(initialDoubts);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    resolve(String(k));
  };
  const resolve = (key: string) => setDoubts((ds) => ds.filter((d) => d.key !== key));
  const doubtFor = (key: string) => doubts.find((d) => d.key === key);

  // Aller au champ demandé (depuis « à revoir »)
  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(`field-${focusField}`);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("ring-2", "ring-accent", "rounded-field");
    el.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
  }, [focusField]);

  const unresolvedTokens = useMemo(
    () => steps.flatMap((s) => tokensToMarkers(s.tokens, draft.ingredients).unresolved),
    [steps, draft.ingredients],
  );

  function onRename(oldName: string, newName: string) {
    if (!oldName || !newName) return;
    const esc = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\{${esc}(#\\d+)?\\}`, "gi");
    setSteps((ss) => ss.map((s) => ({ ...s, tokens: s.tokens.replace(re, (_m, n = "") => `{${newName}${n}}`) })));
  }

  async function save(keepForReview: boolean) {
    if (!draft.title.trim()) {
      toast("Il manque le titre.");
      document.getElementById("field-title")?.scrollIntoView({ block: "center" });
      return;
    }
    if (mode === "review" && doubts.length && !keepForReview) {
      toast(`Vérifie les ${doubts.length} point(s) signalé(s), ou « Enregistrer et garder à revoir ».`);
      document.getElementById(`field-${doubts[0].key}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setSaving(true);
    try {
      const recipe: Recipe = {
        ...draft,
        ingredients: draft.ingredients.filter((i) => i.name.trim()),
        steps: toSteps(steps, draft.ingredients),
      };
      const saved = await saveRecipe(recipe, {
        keepForReview: keepForReview ? doubts.map((d) => ({ field: d.key, note: d.question })) : [],
      });
      toast(mode === "edit" ? "Modifications enregistrées" : "Recette enregistrée");
      onSaved(saved);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await deleteRecipe(draft.id);
      toast("Recette supprimée");
      onDeleted?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Suppression impossible");
    }
  }

  const title = mode === "review" ? "Vérifier l'import" : mode === "edit" ? "Modifier" : "Nouvelle recette";

  return (
    <div className="pb-48">
      <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 pb-1.5">
          {headerLeft}
          <div className="text-base font-bold">{title}</div>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-[18px] px-5 pt-1">
        {mode === "review" && (
          <div className="flex items-center gap-3.5 rounded-[28px] bg-surface p-4">
            <div className="flex flex-col gap-1">
              {sourceLabel && <div className="text-sm text-neutral-700">{sourceLabel}</div>}
              <div className="text-[17px] font-bold">
                {doubts.length === 0
                  ? "Tout est vérifié"
                  : `${doubts.length} point${doubts.length > 1 ? "s" : ""} à vérifier`}
              </div>
              <div className="text-sm text-neutral-700">
                {doubts.length ? "Le reste semble correct." : "Relis rapidement puis enregistre."}
              </div>
            </div>
          </div>
        )}

        <div id="field-title" className="scroll-mt-24">
          <DoubtBox doubt={doubtFor("title")} onPick={(o) => set("title", o)} onResolve={() => resolve("title")}>
            <Field label="Titre">
              <TextInput
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="ex. Tarte tatin de Mamie"
                className="min-h-[52px] font-heading text-[22px]"
              />
            </Field>
          </DoubtBox>
        </div>

        <div id="field-category" className="scroll-mt-24">
          <DoubtBox doubt={doubtFor("category")} onResolve={() => resolve("category")}>
            <span className="text-[13px] font-bold text-neutral-700">Catégorie</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const col = categoryColors(c.id);
                const sel = draft.category === c.id;
                return (
                  <Chip
                    key={c.id}
                    selected={sel}
                    onClick={() => set("category", c.id)}
                    style={sel ? undefined : { background: col.bg, color: col.ink, borderColor: "transparent" }}
                  >
                    {c.singular}
                  </Chip>
                );
              })}
            </div>
          </DoubtBox>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div id="field-yieldQuantity" className="scroll-mt-24">
            <DoubtBox doubt={doubtFor("yieldQuantity")} onPick={(o) => set("yieldQuantity", parseNumber(o))} onResolve={() => resolve("yieldQuantity")}>
              <Field label="Rendement">
                <NumberInput value={draft.yieldQuantity} onChange={(v) => set("yieldQuantity", v)} placeholder="4" />
              </Field>
            </DoubtBox>
          </div>
          <Field label="Unité">
            <TextInput list="yield-units" value={draft.yieldUnit} onChange={(e) => set("yieldUnit", e.target.value)} placeholder="personnes" />
            <datalist id="yield-units">
              {YIELD_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
          {draft.yieldUnit && !/^pers|^part/.test(draft.yieldUnit) && (
            <Field label={`1 portion = combien de ${draft.yieldUnit} ?`} className="col-span-2">
              <NumberInput value={draft.portionSize} onChange={(v) => set("portionSize", v)} placeholder="1" />
            </Field>
          )}
          <div id="field-prepMinutes" className="scroll-mt-24">
            <DoubtBox doubt={doubtFor("prepMinutes")} onPick={(o) => set("prepMinutes", parseNumber(o))} onResolve={() => resolve("prepMinutes")}>
              <Field label="Préparation (min)">
                <NumberInput value={draft.prepMinutes} onChange={(v) => set("prepMinutes", v)} placeholder="20" />
              </Field>
            </DoubtBox>
          </div>
          <div id="field-cookMinutes" className="scroll-mt-24">
            <DoubtBox doubt={doubtFor("cookMinutes")} onPick={(o) => set("cookMinutes", parseNumber(o))} onResolve={() => resolve("cookMinutes")}>
              <Field label="Cuisson (min)">
                <NumberInput value={draft.cookMinutes} onChange={(v) => set("cookMinutes", v)} placeholder="0 si aucune" />
              </Field>
            </DoubtBox>
          </div>
        </div>

        <section id="field-ingredients" className="flex scroll-mt-24 flex-col gap-2">
          <SectionTitle>Ingrédients</SectionTitle>
          <IngredientsEditor
            ingredients={draft.ingredients}
            onChange={(ings) => set("ingredients", ings)}
            onRename={onRename}
            doubts={doubts}
            resolveDoubt={resolve}
          />
        </section>

        <section id="field-steps" className="flex scroll-mt-24 flex-col gap-2">
          <SectionTitle>Étapes</SectionTitle>
          <StepsEditor steps={steps} onChange={setSteps} ingredients={draft.ingredients} doubts={doubts} resolveDoubt={resolve} />
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionTitle>Par portion</SectionTitle>
          <p className="-mt-1 text-[13px] text-neutral-700">Valeurs estimées, à corriger si tu as mieux.</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(
              [
                ["kcal", "Kcal"],
                ["proteinG", "Protéines (g)"],
                ["fatG", "Lipides (g)"],
                ["carbsG", "Glucides (g)"],
                ["fiberG", "Fibres (g)"],
                ["totalWeightG", "Poids total (g)"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} id={`field-${k}`} className="scroll-mt-24">
                <DoubtBox doubt={doubtFor(k)} onPick={(o) => set(k, parseNumber(o))} onResolve={() => resolve(k)}>
                  <Field label={label}>
                    <NumberInput value={draft[k]} onChange={(v) => set(k, v)} />
                  </Field>
                </DoubtBox>
              </div>
            ))}
          </div>
          <span className="mt-1 text-[13px] font-bold text-neutral-700">Légumes</span>
          <div className="flex gap-2">
            {(
              [
                [true, "Oui"],
                [false, "Non"],
              ] as const
            ).map(([v, l]) => (
              <Chip key={l} selected={draft.hasVegetables === v} onClick={() => set("hasVegetables", draft.hasVegetables === v ? null : v)}>
                {l}
              </Chip>
            ))}
          </div>
          <span className="mt-1 text-[13px] font-bold text-neutral-700">Source de protéines</span>
          <div className="flex flex-wrap gap-2">
            {PROTEIN_SOURCES.map((p) => (
              <Chip
                key={p.id}
                selected={draft.proteinSource === p.id}
                onClick={() => set("proteinSource", draft.proteinSource === p.id ? null : p.id)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionTitle>Tags</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {MANUAL_TAGS.map((t) => {
              const on = t.id === "fetes" ? draft.isOccasion : draft.tags.includes(t.id);
              return (
                <Chip
                  key={t.id}
                  selected={on}
                  onClick={() =>
                    t.id === "fetes"
                      ? set("isOccasion", !on)
                      : set("tags", on ? draft.tags.filter((x) => x !== t.id) : [...draft.tags, t.id])
                  }
                >
                  {t.label}
                </Chip>
              );
            })}
          </div>
          <p className="text-[13px] text-neutral-700">« Riche en protéines » et « Rapide » se mettent tout seuls.</p>
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionTitle>Mes notes</SectionTitle>
          <TextArea
            value={draft.personalNotes}
            onChange={(e) => set("personalNotes", e.target.value)}
            placeholder="ex. doubler les câpres, elles partent en premier"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Chip key={r.id} selected={draft.rating === r.id} onClick={() => set("rating", draft.rating === r.id ? null : r.id)}>
                {r.label}
              </Chip>
            ))}
          </div>
        </section>

        {mode === "edit" && isAdmin && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full font-bold text-accent-800"
          >
            <IconTrash size={18} /> Supprimer la recette
          </button>
        )}
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-bg px-5 pt-3.5">
        <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
          {unresolvedTokens.length > 0 && (
            <p className="text-center text-[13px] font-bold text-accent-800">
              Des étapes citent des ingrédients introuvables (ils resteront en texte simple).
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={() => save(false)}
            disabled={saving || !online}
            className={cx("h-[58px] text-[19px]", mode === "review" && doubts.length > 0 && "bg-neutral-300 text-neutral-700 shadow-none")}
          >
            {saving ? (
              <Spinner />
            ) : !online ? (
              "Hors ligne — enregistrement impossible"
            ) : mode === "review" && doubts.length ? (
              `Enregistrer · ${doubts.length} restant${doubts.length > 1 ? "s" : ""}`
            ) : (
              "Enregistrer"
            )}
          </Button>
          {mode === "review" && (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving || !online}
              className="h-11 rounded-full text-[15px] font-bold text-accent-700 disabled:opacity-45"
            >
              Enregistrer et garder « à revoir »
            </button>
          )}
        </div>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer ?">
        <p className="text-[17px]">
          « {draft.title} » sera supprimée pour tout le monde. Ce n&apos;est pas réversible.
        </p>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Button onClick={() => setConfirmDelete(false)}>Annuler</Button>
          <Button variant="dark" onClick={remove} className="bg-accent-800">
            Supprimer
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
