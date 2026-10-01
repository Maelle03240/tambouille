"use client";
/** Image d'une recette : ma photo, illustration IA (si configurée), retirer. */
import { useRef, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconCamera, IconImage, IconTrash } from "@/components/ui/icons";
import { Sheet, Spinner } from "@/components/ui/primitives";
import { illustrateRecipe, removeRecipeImage, setRecipeImage } from "@/lib/data/actions";
import type { Recipe } from "@/lib/recipes/types";

export function ImageSheet({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const { features, online, toast } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible");
    } finally {
      setBusy(null);
    }
  }

  const row = "flex min-h-16 items-center gap-3.5 rounded-[24px] bg-surface px-4 text-left font-bold disabled:opacity-45";

  return (
    <Sheet open={open} onClose={onClose} title="Image">
      <button type="button" className={row} disabled={!online || !!busy} onClick={() => input.current?.click()}>
        {busy === "photo" ? <Spinner /> : <IconCamera />} Ma photo
      </button>
      {features.illustrations && (
        <button
          type="button"
          className={row}
          disabled={!online || !!busy || recipe.imageKind === "personal"}
          onClick={() => run("illu", () => illustrateRecipe(recipe.id))}
        >
          {busy === "illu" ? <Spinner /> : <IconImage />}
          {recipe.imageKind === "generated" ? "Nouvelle illustration" : "Illustration (IA)"}
        </button>
      )}
      {recipe.imagePath && (
        <button type="button" className={`${row} mb-2 text-accent-800`} disabled={!online || !!busy} onClick={() => run("rm", () => removeRecipeImage(recipe.id))}>
          <IconTrash /> Retirer l&apos;image
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) run("photo", () => setRecipeImage(recipe.id, file, "personal"));
        }}
      />
    </Sheet>
  );
}
