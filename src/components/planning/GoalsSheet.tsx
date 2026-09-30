"use client";
/** Objectifs du jour (fixés par l'utilisatrice), objectif prioritaire, repas planifiés. */
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Button, Chip, Field, NumberInput, Sheet } from "@/components/ui/primitives";
import { MOMENTS } from "@/config/moments";
import { NUTRIENTS, type NutrientKey } from "@/config/planning";
import { saveSettings } from "@/lib/data/actions";
import type { UserSettings } from "@/lib/recipes/types";

type Range = [number | null, number | null];

function toRange(r: [number, number] | null | undefined): Range {
  return r ? [r[0], r[1]] : [null, null];
}
function fromRange(r: Range): [number, number] | null {
  return r[0] != null && r[1] != null ? [r[0], r[1]] : null;
}

export function GoalsSheet({ settings, open, onClose }: { settings: UserSettings; open: boolean; onClose: () => void }) {
  const { toast, online } = useApp();
  const t = settings.dailyTargets;
  const [kcal, setKcal] = useState<number | null>(t.kcal);
  const [prot, setProt] = useState<number | null>(t.proteinMinG);
  const [fat, setFat] = useState<Range>(toRange(t.fatG));
  const [carbs, setCarbs] = useState<Range>(toRange(t.carbsG));
  const [fiber, setFiber] = useState<Range>(toRange(t.fiberG));
  const [priority, setPriority] = useState<NutrientKey>(settings.planning.priority);
  const [meals, setMeals] = useState<string[]>(settings.planning.meals);

  async function save() {
    try {
      await saveSettings({
        ...settings,
        dailyTargets: { kcal, proteinMinG: prot, fatG: fromRange(fat), carbsG: fromRange(carbs), fiberG: fromRange(fiber) },
        planning: { meals, priority },
      });
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible");
    }
  }

  const rangeRow = (label: string, v: Range, set: (r: Range) => void) => (
    <Field label={`${label} (g, fourchette)`}>
      <div className="flex items-center gap-2">
        <NumberInput value={v[0]} onChange={(x) => set([x, v[1]])} placeholder="min" />
        <span className="text-neutral-700">à</span>
        <NumberInput value={v[1]} onChange={(x) => set([v[0], x])} placeholder="max" />
      </div>
    </Field>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Objectifs du jour">
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Kcal">
          <NumberInput value={kcal} onChange={setKcal} placeholder="1800" />
        </Field>
        <Field label="Protéines min (g)">
          <NumberInput value={prot} onChange={setProt} placeholder="100" />
        </Field>
      </div>
      {rangeRow("Lipides", fat, setFat)}
      {rangeRow("Glucides", carbs, setCarbs)}
      {rangeRow("Fibres", fiber, setFiber)}

      <span className="mt-1 text-[13px] font-bold text-neutral-700">Objectif prioritaire</span>
      <div className="flex flex-wrap gap-2">
        {NUTRIENTS.map((n) => (
          <Chip key={n.key} selected={priority === n.key} onClick={() => setPriority(n.key)}>
            {n.label}
          </Chip>
        ))}
      </div>

      <span className="mt-1 text-[13px] font-bold text-neutral-700">Repas planifiés</span>
      <div className="flex flex-wrap gap-2">
        {MOMENTS.map((m) => {
          const on = meals.includes(m.id);
          return (
            <Chip key={m.id} selected={on} onClick={() => setMeals(on ? meals.filter((x) => x !== m.id) : [...meals, m.id])}>
              {m.label}
            </Chip>
          );
        })}
      </div>

      <Button variant="primary" size="lg" onClick={save} disabled={!online || !meals.length} className="mt-2 mb-2">
        Enregistrer
      </Button>
    </Sheet>
  );
}
