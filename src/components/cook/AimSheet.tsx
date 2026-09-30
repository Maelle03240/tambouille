"use client";
/**
 * « Viser environ X kcal » ou « environ X g de protéines » (spec V2) :
 * calcule la part à préparer pour UNE assiette et ajuste les quantités
 * (arrondies à ¼ de portion pour rester utilisables).
 */
import { useState } from "react";
import { Button, Chip, NumberInput, Sheet } from "@/components/ui/primitives";
import { formatDecimal } from "@/lib/recipes/quantities";
import type { Recipe } from "@/lib/recipes/types";

export function AimSheet({
  recipe,
  open,
  onClose,
  onApply,
}: {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
  /** Nouvelle quantité dans l'unité de rendement de la recette. */
  onApply: (servings: number) => void;
}) {
  const [kind, setKind] = useState<"kcal" | "protein">(recipe.kcal ? "kcal" : "protein");
  const [value, setValue] = useState<number | null>(null);
  const per = kind === "kcal" ? recipe.kcal : recipe.proteinG;
  const portions = value && per ? Math.max(0.25, Math.round((value / per) * 4) / 4) : null;
  const unitPerPortion = recipe.portionSize || 1;

  return (
    <Sheet open={open} onClose={onClose} title="Viser environ…">
      <div className="flex gap-2">
        {recipe.kcal != null && (
          <Chip selected={kind === "kcal"} onClick={() => setKind("kcal")}>
            Kcal
          </Chip>
        )}
        {recipe.proteinG != null && (
          <Chip selected={kind === "protein"} onClick={() => setKind("protein")}>
            Protéines (g)
          </Chip>
        )}
      </div>
      <NumberInput autoFocus value={value} onChange={setValue} placeholder={kind === "kcal" ? "ex. 600" : "ex. 40"} />
      {portions != null && (
        <p className="rounded-field bg-surface px-4 py-3 text-[17px]">
          <strong>{formatDecimal(portions)} portion{portions > 1 ? "s" : ""}</strong> · {Math.round((recipe.kcal ?? 0) * portions)} kcal ·{" "}
          {Math.round((recipe.proteinG ?? 0) * portions)} g prot.
        </p>
      )}
      <Button
        variant="primary"
        size="lg"
        disabled={portions == null}
        onClick={() => {
          if (portions == null) return;
          onApply(+(portions * unitPerPortion).toFixed(2));
          onClose();
        }}
        className="mb-2"
      >
        Ajuster les quantités
      </Button>
    </Sheet>
  );
}
