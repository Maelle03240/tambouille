"use client";
/** Journées et semaines types : enregistrer le planning sous un nom, puis l'appliquer. */
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconTrash } from "@/components/ui/icons";
import { Button, Chip, Sheet, TextInput } from "@/components/ui/primitives";
import { momentLabel } from "@/config/moments";
import { deleteTemplate, saveTemplate } from "@/lib/data/actions";
import { useTemplates } from "@/lib/data/hooks";
import { newId } from "@/lib/ids";
import type { MealPlanEntry, MealTemplate } from "@/lib/planning/types";
import type { Recipe } from "@/lib/recipes/types";

export function SaveTemplateSheet({
  open,
  onClose,
  day,
  week,
}: {
  open: boolean;
  onClose: () => void;
  /** Repas du jour affiché. */
  day: MealPlanEntry[];
  /** Repas de toute la semaine (lundi → dimanche). */
  week: MealPlanEntry[][];
}) {
  const { toast } = useApp();
  const [kind, setKind] = useState<"jour" | "semaine">("jour");
  const [name, setName] = useState("");

  async function save() {
    const meals =
      kind === "jour"
        ? day.map((e) => ({ dayOffset: 0, meal: e.meal, recipeId: e.recipeId }))
        : week.flatMap((d, i) => d.map((e) => ({ dayOffset: i, meal: e.meal, recipeId: e.recipeId })));
    const t: MealTemplate = { id: newId(), name: name.trim() || (kind === "jour" ? "Journée type" : "Semaine type"), kind, meals };
    try {
      await saveTemplate(t);
      toast(`« ${t.name} » enregistré`);
      setName("");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Enregistrer comme modèle">
      <div className="grid grid-cols-2 gap-2">
        <Chip selected={kind === "jour"} onClick={() => setKind("jour")}>
          Journée type
        </Chip>
        <Chip selected={kind === "semaine"} onClick={() => setKind("semaine")}>
          Semaine type
        </Chip>
      </div>
      <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom · ex. Jour sport, Semaine chargée" />
      <Button variant="primary" size="lg" onClick={save} className="mb-2">
        Enregistrer
      </Button>
    </Sheet>
  );
}

export function ApplyTemplateSheet({
  open,
  onClose,
  byId,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  byId: Map<string, Recipe>;
  onApply: (t: MealTemplate) => void;
}) {
  const templates = useTemplates();
  const { toast } = useApp();
  return (
    <Sheet open={open} onClose={onClose} title="Appliquer un modèle">
      <p className="-mt-1 text-sm text-neutral-700">Repas vides → tirés au sort. Plats gardés → inchangés.</p>
      {!templates?.length && <p className="py-4 text-center text-neutral-700">Aucun modèle pour l&apos;instant.</p>}
      <div className="mb-2 flex flex-col gap-2">
        {templates?.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-3xl bg-surface p-1.5">
            <button type="button" onClick={() => onApply(t)} className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2 text-left">
              <span className="font-heading text-xl">{t.name}</span>
              <span className="text-xs font-bold text-accent-700 uppercase">{t.kind === "jour" ? "Journée" : "Semaine"}</span>
              <span className="truncate text-sm text-neutral-800">
                {t.meals
                  .filter((m) => m.dayOffset === 0)
                  .map((m) => `${momentLabel(m.meal)} : ${m.recipeId ? (byId.get(m.recipeId)?.title ?? "?") : "au hasard"}`)
                  .join(" · ")}
              </span>
            </button>
            <button
              type="button"
              aria-label="Supprimer le modèle"
              onClick={() => deleteTemplate(t.id).catch((e) => toast(e.message))}
              className="flex size-11 flex-none items-center justify-center rounded-full text-accent-800"
            >
              <IconTrash size={18} />
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
