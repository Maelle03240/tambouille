"use client";
/**
 * Bibliothèque d'ingrédients perso (V2, facultative) : seulement pour les
 * produits où l'estimation se trompe (poudre protéinée, skyr…). Valeurs de
 * l'étiquette pour 100 g, lues sur une photo ou saisies à la main.
 */
import { useRef, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { BackLink, Button, Field, NumberInput, Sheet, Spinner, TextInput } from "@/components/ui/primitives";
import { IconCamera, IconPlus, IconTrash } from "@/components/ui/icons";
import { deleteCustomIngredient, saveCustomIngredient } from "@/lib/data/actions";
import { useCustomIngredients } from "@/lib/data/hooks";
import { newId } from "@/lib/ids";
import { requestLabel } from "@/lib/import/client";
import { imageToBase64 } from "@/lib/import/image";
import type { CustomIngredient } from "@/lib/recipes/types";

const FIELDS = [
  ["kcal100", "Kcal"],
  ["protein100", "Protéines (g)"],
  ["fat100", "Lipides (g)"],
  ["carbs100", "Glucides (g)"],
  ["fiber100", "Fibres (g)"],
] as const;

const empty = (): CustomIngredient => ({ id: newId(), name: "", kcal100: null, protein100: null, fat100: null, carbs100: null, fiber100: null });

export function IngredientsScreen() {
  const items = useCustomIngredients();
  const { online, features, toast } = useApp();
  const [editing, setEditing] = useState<CustomIngredient | null>(null);
  const [reading, setReading] = useState(false);
  const photo = useRef<HTMLInputElement>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReading(true);
    try {
      const v = await requestLabel(await imageToBase64(file, 1400));
      setEditing({
        ...empty(),
        name: v.name,
        kcal100: v.kcal_100g,
        protein100: v.protein_100g,
        fat100: v.fat_100g,
        carbs100: v.carbs_100g,
        fiber100: v.fiber_100g,
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Lecture impossible");
    } finally {
      setReading(false);
    }
  }

  async function save() {
    if (!editing?.name.trim()) return toast("Il manque le nom.");
    try {
      await saveCustomIngredient({ ...editing, name: editing.name.trim() });
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible");
    }
  }

  return (
    <div className="pb-16">
      <header className="pt-safe mx-auto flex max-w-2xl items-center gap-3 px-4 pb-2">
        <BackLink href="/reglages" />
        <h1 className="font-heading text-[30px] leading-tight">Mes ingrédients</h1>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4">
        <p className="text-[15px] text-neutral-700">Pour les produits dont tu connais l&apos;étiquette (whey, skyr…).</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" disabled={!online || !features.ai || reading} onClick={() => photo.current?.click()}>
            {reading ? <Spinner /> : <IconCamera size={20} />} Étiquette
          </Button>
          <Button disabled={!online} onClick={() => setEditing(empty())}>
            <IconPlus size={20} /> À la main
          </Button>
        </div>
        <input ref={photo} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

        {items?.map((c) => (
          <button key={c.id} type="button" onClick={() => setEditing(c)} className="flex flex-col gap-1 rounded-3xl bg-surface px-4 py-3 text-left">
            <span className="font-bold">{c.name}</span>
            <span className="text-sm text-neutral-800">
              Pour 100 g : {c.kcal100 ?? "–"} kcal · {c.protein100 ?? "–"} g prot. · {c.fat100 ?? "–"} g lip. · {c.carbs100 ?? "–"} g gluc.
            </span>
          </button>
        ))}
      </main>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Ingrédient perso">
        {editing && (
          <>
            <Field label="Nom">
              <TextInput value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="ex. Whey vanille" />
            </Field>
            <span className="text-[13px] font-bold text-neutral-700">Pour 100 g</span>
            <div className="grid grid-cols-2 gap-2.5">
              {FIELDS.map(([k, label]) => (
                <Field key={k} label={label}>
                  <NumberInput value={editing[k]} onChange={(v) => setEditing({ ...editing, [k]: v })} />
                </Field>
              ))}
            </div>
            <div className="mb-2 flex gap-2">
              {items?.some((c) => c.id === editing.id) && (
                <button
                  type="button"
                  aria-label="Supprimer"
                  disabled={!online}
                  onClick={() =>
                    deleteCustomIngredient(editing.id)
                      .then(() => setEditing(null))
                      .catch((e) => toast(e.message))
                  }
                  className="flex size-14 flex-none items-center justify-center rounded-full bg-accent-100 text-accent-800"
                >
                  <IconTrash size={20} />
                </button>
              )}
              <Button variant="primary" size="lg" className="flex-1" disabled={!online} onClick={save}>
                Enregistrer
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
